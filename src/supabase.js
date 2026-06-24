// supabase.js — all Supabase-logik för Levande Fotoalbum
// Importeras av admin.jsx och (senare) viewer.jsx
//
// Kräver: npm install @supabase/supabase-js
// Env-variabler i .env.local:
//   VITE_SUPABASE_URL=https://xxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------
// Klient
// ---------------------------------------------------------------
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);


// ---------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------

/** Registrera ny familj. family_name sätts som metadata och
 *  plockas upp av databasens trigger för att sätta familjenamnet. */
export async function signUp(email, password, familyName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { family_name: familyName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Returnerar inloggad session eller null. */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Lyssnar på auth-ändringar (logga in/ut). Returnerar unsubscribe-funktion. */
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}


// ---------------------------------------------------------------
// FAMILJ
// ---------------------------------------------------------------

/** Hämtar inloggad användares familj. */
export async function getMyFamily() {
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Uppdaterar familjenamnet. */
export async function updateFamilyName(name) {
  const { data, error } = await supabase
    .from("families")
    .update({ name })
    .eq("owner_id", (await supabase.auth.getUser()).data.user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}


// ---------------------------------------------------------------
// FOTON — hämta
// ---------------------------------------------------------------

/** Hämtar alla foton för inloggad familj, nyaste först. */
export async function getPhotos() {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Hämtar en signerad URL för att visa ett foto (giltig 1 timme). */
export async function getPhotoUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/** Hämtar signerade URLs för en lista foton på en gång. */
export async function getPhotoUrls(storagePaths) {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrls(storagePaths, 3600);
  if (error) throw error;
  // Returnerar { path → signedUrl }
  return Object.fromEntries(data.map(d => [d.path, d.signedUrl]));
}


// ---------------------------------------------------------------
// FOTON — ladda upp
// ---------------------------------------------------------------

/**
 * Laddar upp ett foto och skapar en databasrad.
 * Returnerar det nyskapade photo-objektet (utan signerad URL).
 *
 * @param {File} file          - Filen från input/drop
 * @param {string} familyId    - Hämtas från getMyFamily()
 */
export async function uploadPhoto(file, familyId, context = {}) {
  // 1. Generera unikt filnamn
  const ext = file.name.split(".").pop().toLowerCase();
  const photoId = crypto.randomUUID();
  const storagePath = `${familyId}/${photoId}.${ext}`;

  // 2. Ladda upp till Storage
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  // 3. Skapa databasrad
  const { data, error: dbError } = await supabase
    .from("photos")
    .insert({
       family_id: familyId,
  filename: file.name,
  storage_path: storagePath,
  location: context.location || "",
  year: context.year || "",
  notes: context.notes || "",
    })
    .select()
    .single();
  if (dbError) {
    // Rensa upp filen om DB-insert misslyckades
    await supabase.storage.from("photos").remove([storagePath]);
    throw dbError;
  }

  return data;
}


// ---------------------------------------------------------------
// FOTON — spara taggar + AI-analys
// ---------------------------------------------------------------

/**
 * Sparar adminens redigerade fält för ett foto.
 */
export async function savePhotoTags(photoId, fields) {
  const { description, persons, place, year_label } = fields;
  const { data, error } = await supabase
    .from("photos")
    .update({ description, persons, place, year_label })
    .eq("id", photoId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Sparar AI-analysresultatet på ett foto.
 */
export async function saveAiResult(photoId, aiResult) {
  const { data, error } = await supabase
    .from("photos")
    .update({
    ai_description: aiResult.description || aiResult.beskrivning,
ai_place: aiResult.location || aiResult.plats,
ai_year: aiResult.era || aiResult.tidsepok,
ai_keywords: aiResult.keywords || aiResult.nyckelord,
      ai_analyzed_at: new Date().toISOString(),
    })
    .eq("id", photoId)
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function uploadPersonPhoto(file, familyId, personId) {
  const ext = file.name.split(".").pop().toLowerCase();
  const storagePath = `${familyId}/persons/${personId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(storagePath, file, { cacheControl: "3600", upsert: true });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("persons")
    .update({ photo_path: storagePath })
    .eq("id", personId)
    .select()
    .single();
  if (error) throw error;
  return data;
}


// ---------------------------------------------------------------
// PERSONREGISTER
// ---------------------------------------------------------------

export async function getPersons() {
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addPerson(familyId, name, description) {
  const { data, error } = await supabase
    .from("persons")
    .insert({ family_id: familyId, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePerson(id, name, description) {
  const { data, error } = await supabase
    .from("persons")
    .update({ name, description })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePerson(id) {
  const { error } = await supabase.from("persons").delete().eq("id", id);
  if (error) throw error;
}


// ---------------------------------------------------------------
// FOTON — ta bort
// ---------------------------------------------------------------

/**
 * Tar bort ett foto från både Storage och databasen.
 */
export async function deletePhoto(photoId, storagePath) {
  // 1. Ta bort från Storage
  const { error: storageError } = await supabase.storage
    .from("photos")
    .remove([storagePath]);
  if (storageError) throw storageError;

  // 2. Ta bort från databasen
  const { error: dbError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);
  if (dbError) throw dbError;
}