// admin.jsx — Levande Fotoalbum, admin-gränssnitt
import { useState, useEffect, useRef } from "react";
import * as exifr from "exifr";
import {
  supabase, onAuthChange, signIn, signUp, signOut, getMyFamily,
  getPhotos, getPhotoUrls, uploadPhoto, savePhotoTags, saveAiResult,
  deletePhoto, getPersons, addPerson, deletePerson, uploadPersonPhoto,
} from "./supabase.js";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #f5f0e8; font-family: 'Inter', sans-serif; color: #2c2416; min-height: 100vh; }
.app { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.auth-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.auth-box { background: #fffdf8; border: 1px solid #e0d5c0; border-radius: 12px; padding: 48px; width: 100%; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.auth-title { font-family: 'Playfair Display', serif; font-size: 28px; color: #2c2416; margin-bottom: 8px; text-align: center; }
.auth-subtitle { font-size: 14px; color: #8a7560; text-align: center; margin-bottom: 32px; }
.auth-field { margin-bottom: 16px; }
.auth-field label { display: block; font-size: 13px; font-weight: 500; color: #5a4a35; margin-bottom: 6px; }
.auth-field input { width: 100%; padding: 12px 14px; border: 1px solid #d0c4aa; border-radius: 8px; font-size: 15px; background: #faf7f0; color: #2c2416; outline: none; }
.auth-field input:focus { border-color: #b8973a; }
.btn-primary { width: 100%; padding: 13px; background: #b8973a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.btn-primary:hover { background: #9d7e2e; }
.auth-toggle { text-align: center; margin-top: 20px; font-size: 14px; color: #8a7560; }
.auth-toggle button { background: none; border: none; color: #b8973a; cursor: pointer; font-weight: 600; font-size: 14px; }
.auth-error { background: #fdecea; border: 1px solid #f5c6c2; color: #c0392b; border-radius: 8px; padding: 10px 14px; font-size: 14px; margin-bottom: 16px; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #e0d5c0; margin-bottom: 32px; }
.header-title { font-family: 'Playfair Display', serif; font-size: 24px; color: #2c2416; }
.header-family { font-size: 13px; color: #8a7560; margin-top: 2px; }
.btn-signout { background: none; border: 1px solid #d0c4aa; border-radius: 8px; padding: 8px 16px; font-size: 13px; color: #8a7560; cursor: pointer; }
.tabs { display: flex; gap: 4px; margin-bottom: 28px; border-bottom: 2px solid #e0d5c0; }
.tab { padding: 10px 20px; font-size: 14px; font-weight: 500; color: #8a7560; background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #b8973a; border-bottom-color: #b8973a; }
.photos-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.upload-zone { border: 2px dashed #c8b896; border-radius: 12px; padding: 32px; text-align: center; cursor: pointer; background: #faf7f0; margin-bottom: 28px; }
.upload-zone:hover, .upload-zone.drag-over { border-color: #b8973a; background: #f5edd8; }
.upload-zone-icon { font-size: 36px; margin-bottom: 10px; }
.upload-zone-text { font-size: 15px; color: #8a7560; }
.upload-zone-hint { font-size: 13px; color: #b0a080; margin-top: 4px; }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.photo-card { border-radius: 10px; overflow: hidden; background: #fffdf8; border: 2px solid transparent; cursor: pointer; transition: transform 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.06); position: relative; }
.photo-card:hover { transform: translateY(-2px); }
.photo-card.selected { border-color: #b8973a; }
.photo-card.checked { border-color: #c0392b; }
.photo-card img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.photo-card-label { padding: 8px 10px; font-size: 12px; color: #8a7560; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.photo-card-badge { display: inline-block; font-size: 10px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; padding: 2px 6px; margin-top: 2px; }
.photo-checkbox { position: absolute; top: 8px; left: 8px; width: 22px; height: 22px; accent-color: #c0392b; cursor: pointer; z-index: 2; }
.layout { display: flex; gap: 24px; align-items: flex-start; }
.photo-grid-wrap { flex: 1; min-width: 0; }
.side-panel { width: 340px; flex-shrink: 0; background: #fffdf8; border: 1px solid #e0d5c0; border-radius: 12px; overflow: hidden; position: sticky; top: 20px; }
.panel-photo { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; }
.panel-body { padding: 20px; }
.panel-title { font-family: 'Playfair Display', serif; font-size: 17px; color: #2c2416; margin-bottom: 16px; word-break: break-word; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: #8a7560; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; margin-top: 14px; }
.field-input { width: 100%; padding: 9px 12px; border: 1px solid #d0c4aa; border-radius: 8px; font-size: 14px; background: #faf7f0; color: #2c2416; outline: none; font-family: 'Inter', sans-serif; }
.field-input:focus { border-color: #b8973a; }
textarea.field-input { resize: vertical; min-height: 90px; }
.ai-box { background: #fdf8ec; border: 1px solid #e8d99a; border-radius: 8px; padding: 12px; margin: 14px 0; }
.ai-box-title { font-size: 11px; font-weight: 600; color: #b8973a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.ai-box-text { font-size: 13px; color: #5a4a35; line-height: 1.5; }
.btn-use-ai { font-size: 12px; color: #b8973a; background: none; border: 1px solid #b8973a; border-radius: 6px; padding: 4px 10px; cursor: pointer; margin-top: 8px; }
.panel-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.btn-save { flex: 1; padding: 10px; background: #b8973a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-save:hover { background: #9d7e2e; }
.btn-analyze { padding: 10px 14px; background: #fdf8ec; color: #b8973a; border: 1px solid #e8d99a; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-delete { padding: 10px 14px; background: none; color: #c0392b; border: 1px solid #f5c6c2; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-delete-selected { padding: 8px 14px; background: #c0392b; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-delete-selected:hover { background: #a93226; }
.btn-batch { padding: 10px 20px; background: #2c2416; color: #f5f0e8; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-batch:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-select-toggle { padding: 8px 14px; background: none; color: #8a7560; border: 1px solid #d0c4aa; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-select-toggle:hover { background: #f0e8d8; }
.spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #e0d5c0; border-top-color: #b8973a; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px 20px; color: #8a7560; }
.empty-state-icon { font-size: 48px; margin-bottom: 12px; }
.toast { position: fixed; bottom: 24px; right: 24px; background: #2c2416; color: #f5f0e8; padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 1000; }
.batch-progress { background: #fdf8ec; border: 1px solid #e8d99a; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #5a4a35; margin-bottom: 16px; }
.persons-wrap { max-width: 700px; }
.persons-title { font-family: 'Playfair Display', serif; font-size: 22px; color: #2c2416; margin-bottom: 6px; }
.persons-hint { font-size: 14px; color: #8a7560; margin-bottom: 28px; line-height: 1.5; }
.add-person-box { background: #fffdf8; border: 1px solid #e0d5c0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
.add-person-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
.add-person-field { flex: 1; min-width: 140px; }
.add-person-field label { display: block; font-size: 12px; font-weight: 600; color: #8a7560; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.add-person-field input { width: 100%; padding: 9px 12px; border: 1px solid #d0c4aa; border-radius: 8px; font-size: 14px; background: #faf7f0; color: #2c2416; outline: none; font-family: 'Inter', sans-serif; }
.add-person-field input:focus { border-color: #b8973a; }
.btn-add { padding: 10px 20px; background: #b8973a; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.person-list { display: flex; flex-direction: column; gap: 12px; }
.person-card { background: #fffdf8; border: 1px solid #e0d5c0; border-radius: 10px; padding: 16px; display: flex; align-items: center; gap: 14px; }
.person-photo { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #e0d5c0; flex-shrink: 0; cursor: pointer; }
.person-avatar { width: 56px; height: 56px; border-radius: 50%; background: #f0e8d8; border: 2px dashed #d0c4aa; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; cursor: pointer; }
.person-avatar:hover { background: #e8dcc8; }
.person-info { flex: 1; min-width: 0; }
.person-name { font-weight: 600; font-size: 15px; color: #2c2416; margin-bottom: 3px; }
.person-desc { font-size: 13px; color: #8a7560; line-height: 1.4; }
.person-photo-hint { font-size: 11px; color: #b0a080; margin-top: 3px; }
.btn-del-person { background: none; border: none; color: #c0392b; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; flex-shrink: 0; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-box { background: #fffdf8; border: 1px solid #e0d5c0; border-radius: 16px; padding: 32px; width: 100%; max-width: 520px; box-shadow: 0 8px 40px rgba(0,0,0,0.2); }
.modal-title { font-family: 'Playfair Display', serif; font-size: 22px; color: #2c2416; margin-bottom: 6px; }
.modal-subtitle { font-size: 14px; color: #8a7560; margin-bottom: 24px; line-height: 1.5; }
.modal-files { background: #f5f0e8; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #5a4a35; max-height: 80px; overflow-y: auto; }
.modal-actions { display: flex; gap: 10px; margin-top: 24px; }
.btn-skip { flex: 1; padding: 12px; background: none; color: #8a7560; border: 1px solid #d0c4aa; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-skip:hover { background: #f0e8d8; }
.review-title { font-family: 'Playfair Display', serif; font-size: 22px; color: #2c2416; margin-bottom: 6px; }
.review-subtitle { font-size: 14px; color: #8a7560; margin-bottom: 16px; }
.review-list { display: flex; flex-direction: column; gap: 16px; }
.review-item { background: #fffdf8; border: 1px solid #e0d5c0; border-radius: 12px; padding: 16px; display: flex; gap: 16px; align-items: flex-start; }
.review-item.approved { border-color: #a8d5a2; background: #f5fbf4; }
.review-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.review-content { flex: 1; min-width: 0; }
.review-filename { font-size: 12px; color: #b0a080; margin-bottom: 4px; }
.review-edit { width: 100%; padding: 8px 10px; border: 1px solid #d0c4aa; border-radius: 6px; font-size: 13px; background: #faf7f0; color: #2c2416; font-family: 'Inter', sans-serif; resize: vertical; min-height: 60px; outline: none; }
.review-edit:focus { border-color: #b8973a; }
.review-actions { display: flex; gap: 8px; margin-top: 8px; }
.btn-approve { padding: 8px 16px; background: #e8f5e9; color: #2e7d32; border: 1px solid #a8d5a2; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600; }
.btn-approve:hover { background: #d4edda; }
.btn-approve-all { padding: 10px 20px; background: #2e7d32; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
`;

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`;

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [family, setFamily] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState("photos");
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [persons, setPersons] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [personRegistry, setPersonRegistry] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [personPhotoUrls, setPersonPhotoUrls] = useState({});
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [toast, setToast] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showContextModal, setShowContextModal] = useState(false);
  const [batchEvent, setBatchEvent] = useState("");
  const [batchLocation, setBatchLocation] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [reviewItems, setReviewItems] = useState([]);
  const [showReview, setShowReview] = useState(false);
  // Ny state för markerade foton
  const [checkedIds, setCheckedIds] = useState(new Set());
  const fileInputRef = useRef(null);
  const personPhotoInputRef = useRef(null);
  const currentPersonForPhoto = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const unsub = onAuthChange(async (s) => {
      setSession(s);
      if (s) {
        const fam = await getMyFamily();
        setFamily(fam);
        await loadPhotos();
        await loadPersons();
      }
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const fn = authMode === "login" ? signIn : signUp;
    const { error } = await fn(email, password);
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setFamily(null);
    setPhotos([]);
  };

  const loadPhotos = async () => {
    const data = await getPhotos();
    setPhotos(data || []);
    if (data && data.length > 0) {
      const urls = await getPhotoUrls(data.map((p) => p.storage_path));
      setPhotoUrls(urls || {});
    }
  };

  const loadPersons = async () => {
    const data = await getPersons();
    setPersonRegistry(data || []);
    if (data && data.length > 0) {
      const urls = {};
      for (const p of data) {
        if (p.photo_path) {
          const { data: urlData } = await supabase.storage.from("photos").createSignedUrl(p.photo_path, 3600);
          if (urlData) urls[p.id] = urlData.signedUrl;
        }
      }
      setPersonPhotoUrls(urls);
    }
  };

  const extractContextFromName = (name) => {
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    return { year: yearMatch ? yearMatch[0] : "" };
  };

  const handleFiles = async (files, batchContext) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    for (const file of imageFiles) {
      showToast("Laddar upp " + file.name + "...");
      let exifYear = "";
      try {
        const exif = await exifr.parse(file, { gps: true, tiff: true });
        if (exif && exif.DateTimeOriginal) {
          exifYear = new Date(exif.DateTimeOriginal).getFullYear().toString();
        }
      } catch {}
      const nameCtx = extractContextFromName(file.name);
      const finalYear = batchContext?.year || exifYear || nameCtx.year || "";
      const finalLocation = batchContext?.location || "";
      const finalNotes = batchContext?.event || "";
      await uploadPhoto(file, family.id, { year: finalYear, location: finalLocation, notes: finalNotes });
    }
    await loadPhotos();
    showToast("Uppladdning klar!");
  };

  const handleDroppedFiles = (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setPendingFiles(imageFiles);
    const nameCtx = extractContextFromName(imageFiles[0].name);
    setBatchYear(nameCtx.year || "");
    setBatchEvent("");
    setBatchLocation("");
    setShowContextModal(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleDroppedFiles(e.dataTransfer.files);
  };

  const handleContextSubmit = async () => {
    setShowContextModal(false);
    const batchContext = { event: batchEvent, location: batchLocation, year: batchYear };
    await handleFiles(pendingFiles, batchContext);
    setPendingFiles([]);
    await autoAnalyzeNew(batchContext);
  };

  const handleContextSkip = async () => {
    setShowContextModal(false);
    await handleFiles(pendingFiles, {});
    setPendingFiles([]);
    await autoAnalyzeNew({});
  };

  const autoAnalyzeNew = async (batchContext) => {
    const freshPhotos = await getPhotos();
    const unanalyzed = (freshPhotos || []).filter((p) => !p.ai_description);
    if (unanalyzed.length === 0) return;
    setBatchRunning(true);
    const personRegistryForApi = personRegistry.map((p) => ({
      name: p.name,
      description: p.description,
      photoPath: p.photo_path || null,
    }));
    const newReviewItems = [];
    for (let i = 0; i < unanalyzed.length; i++) {
      const photo = unanalyzed[i];
      setBatchProgress("Analyserar foto " + (i + 1) + " av " + unanalyzed.length + "...");
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(EDGE_FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({
            storagePath: photo.storage_path,
            context: {
              location: batchContext?.location || photo.location || "",
              year: batchContext?.year || photo.year || "",
              notes: batchContext?.event || photo.notes || "",
              personRegistry: personRegistryForApi,
            },
          }),
        });
        const data = await res.json();
        if (!data.error) {
          const desc = data.description || data.beskrivning || "";
          await saveAiResult(photo.id, data);
          setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, ai_description: desc } : p));
          newReviewItems.push({ photo, aiDescription: desc, approved: false, edited: desc });
        }
      } catch {}
    }
    setBatchRunning(false);
    setBatchProgress("");
    if (newReviewItems.length > 0) {
      await loadPhotos();
      setReviewItems(newReviewItems);
      setShowReview(true);
    }
    showToast("Analys klar!");
  };

  const handleSelectPhoto = (photo) => {
    setSelectedPhoto(photo);
    setDescription(photo.description || "");
    setPersons(photo.persons || "");
    setLocation(photo.location || "");
    setYear(photo.year || "");
    setNotes(photo.notes || "");
    setAiDescription(photo.ai_description || "");
  };

  const handleSave = async () => {
    if (!selectedPhoto) return;
    setSaving(true);
    await savePhotoTags(selectedPhoto.id, { description, persons, location, year, notes });
    setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, description, persons, location, year, notes } : p));
    showToast("Sparat!");
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;
    if (!confirm("Ta bort det här fotot?")) return;
    await deletePhoto(selectedPhoto.id, selectedPhoto.storage_path);
    setSelectedPhoto(null);
    await loadPhotos();
    showToast("Foto borttaget.");
  };

  const handleDeleteAll = async () => {
    if (!confirm("Ta bort ALLA " + photos.length + " foton? Detta går inte att ångra.")) return;
    if (!confirm("Är du helt säker? Alla foton och beskrivningar raderas permanent.")) return;
    for (const photo of photos) {
      await deletePhoto(photo.id, photo.storage_path);
    }
    setSelectedPhoto(null);
    await loadPhotos();
    showToast("Alla foton borttagna.");
  };

  // Ny funktion: ta bort markerade foton
  const handleDeleteChecked = async () => {
    if (checkedIds.size === 0) return;
    if (!confirm(`Ta bort ${checkedIds.size} markerade foton? Detta går inte att ångra.`)) return;
    const toDelete = photos.filter((p) => checkedIds.has(p.id));
    for (const photo of toDelete) {
      await deletePhoto(photo.id, photo.storage_path);
    }
    if (selectedPhoto && checkedIds.has(selectedPhoto.id)) setSelectedPhoto(null);
    setCheckedIds(new Set());
    await loadPhotos();
    showToast(`${toDelete.length} foton borttagna.`);
  };

  const handleToggleCheck = (e, photoId) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (checkedIds.size === photos.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPhoto) return;
    setAnalyzing(true);
    setAiDescription("");
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const personRegistryForApi = personRegistry.map((p) => ({
        name: p.name,
        description: p.description,
        photoPath: p.photo_path || null,
      }));
      const res = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          storagePath: selectedPhoto.storage_path,
          context: { location, year, notes, personRegistry: personRegistryForApi },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const desc = data.description || "";
      setAiDescription(desc || "(tom beskrivning)");
      if (data.location && !location) setLocation(data.location);
      if (data.era && !year) setYear(data.era);
      if (data.persons && !persons) setPersons(data.persons);
      await saveAiResult(selectedPhoto.id, data);
      setPhotos((prev) => prev.map((p) => p.id === selectedPhoto.id ? { ...p, ai_description: desc } : p));
      showToast("Analys klar!");
    } catch (err) {
      setAiDescription("Analys misslyckades: " + err.message);
    }
    setAnalyzing(false);
  };

  const handleBatchAnalyze = async () => {
    const unanalyzed = photos.filter((p) => !p.ai_description);
    if (unanalyzed.length === 0) { showToast("Alla foton är redan analyserade."); return; }
    await autoAnalyzeNew({});
  };

  const handleAddPerson = async () => {
    if (!newName.trim() || !family) return;
    const result = await addPerson(family.id, newName.trim(), newDesc.trim());
    if (result) {
      const name = newName;
      setNewName("");
      setNewDesc("");
      await loadPersons();
      showToast(name + " tillagd!");
    }
  };

  const handleDeletePerson = async (id) => {
    if (!confirm("Ta bort den här personen?")) return;
    await deletePerson(id);
    await loadPersons();
    showToast("Person borttagen.");
  };

  const handlePersonPhotoClick = (personId) => {
    currentPersonForPhoto.current = personId;
    personPhotoInputRef.current?.click();
  };

  const handlePersonPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    const personId = currentPersonForPhoto.current;
    if (!file || !personId || !family) return;
    showToast("Laddar upp referensfoto...");
    const result = await uploadPersonPhoto(file, family.id, personId);
    if (result) {
      await loadPersons();
      showToast("Referensfoto sparat!");
    }
    e.target.value = "";
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#8a7560" }}>Laddar...</div>
  );

  if (!session) return (
    <>
      <style>{STYLES}</style>
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-title">📷 Levande Fotoalbum</div>
          <div className="auth-subtitle">{authMode === "login" ? "Logga in på ditt album" : "Skapa ett nytt album"}</div>
          {authError && <div className="auth-error">{authError}</div>}
          <form onSubmit={handleAuth}>
            <div className="auth-field"><label>E-post</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
            <div className="auth-field"><label>Lösenord</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <button type="submit" className="btn-primary" disabled={authLoading}>{authLoading ? "..." : authMode === "login" ? "Logga in" : "Skapa ett album"}</button>
          </form>
          <div className="auth-toggle">
            {authMode === "login"
              ? <><span>Ny användare? </span><button onClick={() => setAuthMode("signup")}>Skapa ett album</button></>
              : <><span>Har du redan ett konto? </span><button onClick={() => setAuthMode("login")}>Logga in</button></>
            }
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <div className="header">
          <div>
            <div className="header-title">📷 Levande Fotoalbum</div>
            <div className="header-family">{family?.name || "Mitt album"}</div>
          </div>
          <button className="btn-signout" onClick={handleSignOut}>Logga ut</button>
        </div>

        <div className="tabs">
          <button className={"tab" + (activeTab === "photos" ? " active" : "")} onClick={() => setActiveTab("photos")}>Foton ({photos.length})</button>
          <button className={"tab" + (activeTab === "persons" ? " active" : "")} onClick={() => setActiveTab("persons")}>Personregister ({personRegistry.length})</button>
        </div>

        {activeTab === "photos" && (
          <>
            {batchRunning && <div className="batch-progress"><span className="spinner" />{batchProgress}</div>}
            <div className="photos-toolbar">
              <div style={{ fontSize: 14, color: "#8a7560" }}>{photos.length} foto{photos.length !== 1 ? "n" : ""}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {photos.length > 0 && (
                  <button className="btn-select-toggle" onClick={handleSelectAll}>
                    {checkedIds.size === photos.length ? "Avmarkera alla" : "Markera alla"}
                  </button>
                )}
                {checkedIds.size > 0 && (
                  <button className="btn-delete-selected" onClick={handleDeleteChecked}>
                    🗑 Ta bort markerade ({checkedIds.size})
                  </button>
                )}
                {photos.length > 0 && checkedIds.size === 0 && (
                  <button className="btn-delete" style={{ fontSize: 13, padding: "8px 14px" }} onClick={handleDeleteAll}>🗑 Ta bort alla</button>
                )}
                <button className="btn-batch" onClick={handleBatchAnalyze} disabled={batchRunning}>{batchRunning ? "Analyserar..." : "✨ Analysera alla med AI"}</button>
              </div>
            </div>
            <div className={"upload-zone" + (dragOver ? " drag-over" : "")} onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
              <div className="upload-zone-icon">📸</div>
              <div className="upload-zone-text">Dra och släpp foton här, eller klicka för att välja</div>
              <div className="upload-zone-hint">JPG, PNG, WEBP — flera filer på en gång</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleDroppedFiles(e.target.files)} />

            {photos.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🖼️</div><div>Inga foton ännu — ladda upp ditt första foto ovan</div></div>
            ) : (
              <div className="layout">
                <div className="photo-grid-wrap">
                  <div className="photo-grid">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className={"photo-card" + (selectedPhoto?.id === photo.id ? " selected" : "") + (checkedIds.has(photo.id) ? " checked" : "")}
                        onClick={() => handleSelectPhoto(photo)}
                      >
                        <input
                          type="checkbox"
                          className="photo-checkbox"
                          checked={checkedIds.has(photo.id)}
                          onChange={(e) => handleToggleCheck(e, photo.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {photoUrls[photo.storage_path]
                          ? <img src={photoUrls[photo.storage_path]} alt={photo.filename} loading="lazy" />
                          : <div style={{ width: "100%", aspectRatio: "1", background: "#f0e8d8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📷</div>
                        }
                        <div className="photo-card-label">
                          {photo.description || photo.filename}
                          {photo.ai_description && <div><span className="photo-card-badge">AI ✓</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPhoto && (
                  <div className="side-panel">
                    {photoUrls[selectedPhoto.storage_path] && <img className="panel-photo" src={photoUrls[selectedPhoto.storage_path]} alt={selectedPhoto.filename} />}
                    <div className="panel-body">
                      <div className="panel-title">{selectedPhoto.filename}</div>
                      {aiDescription && (
                        <div className="ai-box">
                          <div className="ai-box-title">✨ AI-förslag</div>
                          <div className="ai-box-text">{aiDescription}</div>
                          <button className="btn-use-ai" onClick={() => setDescription(aiDescription)}>Använd AI-beskrivningen</button>
                        </div>
                      )}
                      <label className="field-label">Beskrivning (läses upp)</label>
                      <textarea className="field-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beskriv vad som händer på bilden..." />
                      <label className="field-label">Personer på bilden</label>
                      <input className="field-input" value={persons} onChange={(e) => setPersons(e.target.value)} placeholder="t.ex. Ingrid till vänster, Karl sittande i mitten" />
                      <label className="field-label">Plats</label>
                      <input className="field-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="t.ex. Mormors stuga i Dalarna" />
                      <label className="field-label">År</label>
                      <input className="field-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="t.ex. 1987" />
                      <label className="field-label">Egna anteckningar</label>
                      <textarea className="field-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Minnen, berättelser, sammanhang..." style={{ minHeight: 70 }} />
                      <div className="panel-actions">
                        <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? "Sparar..." : "Spara"}</button>
                        <button className="btn-analyze" onClick={handleAnalyze} disabled={analyzing}>{analyzing ? <><span className="spinner" />Analyserar...</> : "✨ AI"}</button>
                        <button className="btn-delete" onClick={handleDelete}>🗑</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "persons" && (
          <div className="persons-wrap">
            <div className="persons-title">Personregister</div>
            <div className="persons-hint">Lägg in namn och beskrivning på återkommande personer. Lägg gärna till ett referensfoto — det hjälper AI:n att känna igen personen i andra foton.</div>
            <div className="add-person-box">
              <div className="add-person-row">
                <div className="add-person-field"><label>Namn</label><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="t.ex. Magnus" /></div>
                <div className="add-person-field" style={{ flex: 2 }}><label>Beskrivning</label><input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="t.ex. Man, ca 50 år, mörkt hår, glasögon" /></div>
                <button className="btn-add" onClick={handleAddPerson}>Lägg till</button>
              </div>
            </div>
            <input ref={personPhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePersonPhotoUpload} />
            {personRegistry.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">👤</div><div>Inga personer ännu</div></div>
            ) : (
              <div className="person-list">
                {personRegistry.map((person) => (
                  <div key={person.id} className="person-card">
                    {personPhotoUrls[person.id]
                      ? <img className="person-photo" src={personPhotoUrls[person.id]} alt={person.name} onClick={() => handlePersonPhotoClick(person.id)} />
                      : <div className="person-avatar" onClick={() => handlePersonPhotoClick(person.id)} title="Klicka för att lägga till referensfoto">👤</div>
                    }
                    <div className="person-info">
                      <div className="person-name">{person.name}</div>
                      <div className="person-desc">{person.description || <em style={{ color: "#b0a080" }}>Ingen beskrivning</em>}</div>
                      <div className="person-photo-hint">{personPhotoUrls[person.id] ? "📸 Referensfoto tillagt" : "Klicka på ikonen för att lägga till referensfoto"}</div>
                    </div>
                    <button className="btn-del-person" onClick={() => handleDeletePerson(person.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      {showContextModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">Lägg till information om bilderna</div>
            <div className="modal-subtitle">Valfritt — hjälper AI:n att skriva bättre beskrivningar. Hoppa över om bilderna är orelaterade.</div>
            <div className="modal-files">{pendingFiles.length} foto{pendingFiles.length !== 1 ? "n" : ""}: {pendingFiles.map(f => f.name).join(", ")}</div>
            <div className="auth-field"><label>Händelse / album</label><input className="field-input" value={batchEvent} onChange={(e) => setBatchEvent(e.target.value)} placeholder="t.ex. Julfest Helsingborg 2007" autoFocus /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="auth-field" style={{ flex: 1 }}><label>Plats</label><input className="field-input" value={batchLocation} onChange={(e) => setBatchLocation(e.target.value)} placeholder="t.ex. Helsingborg" /></div>
              <div className="auth-field" style={{ flex: 1 }}><label>År</label><input className="field-input" value={batchYear} onChange={(e) => setBatchYear(e.target.value)} placeholder="t.ex. 2007" /></div>
            </div>
            <div className="modal-actions">
              <button className="btn-skip" onClick={handleContextSkip}>Hoppa över</button>
              <button className="btn-save" onClick={handleContextSubmit}>Ladda upp</button>
            </div>
          </div>
        </div>
      )}

      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div style={{ background: "#fffdf8", borderRadius: 16, padding: 32, width: "100%", maxWidth: 800, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="review-title">Granska AI-beskrivningar</div>
                <div className="review-subtitle">{reviewItems.filter(r => r.approved).length} av {reviewItems.length} godkända</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-approve-all" onClick={async () => {
                  for (const item of reviewItems) {
                    await savePhotoTags(item.photo.id, { description: item.edited });
                  }
                  setReviewItems(prev => prev.map(r => ({ ...r, approved: true })));
                  showToast("Alla beskrivningar sparade!");
                }}>Godkänn alla</button>
                <button className="btn-signout" onClick={() => setShowReview(false)}>Stäng</button>
              </div>
            </div>
            <div className="review-list">
              {reviewItems.map((item, idx) => (
                <div key={item.photo.id} className={"review-item" + (item.approved ? " approved" : "")}>
                  {photoUrls[item.photo.storage_path] && <img className="review-thumb" src={photoUrls[item.photo.storage_path]} alt="" />}
                  <div className="review-content">
                    <div className="review-filename">{item.photo.filename}</div>
                    <textarea className="review-edit" value={item.edited} onChange={(e) => setReviewItems(prev => prev.map((r, i) => i === idx ? { ...r, edited: e.target.value, approved: false } : r))} />
                    <div className="review-actions">
                      <button className="btn-approve" onClick={async () => {
                        await savePhotoTags(item.photo.id, { description: item.edited });
                        setReviewItems(prev => prev.map((r, i) => i === idx ? { ...r, approved: true } : r));
                        showToast("Sparat!");
                      }}>{item.approved ? "✓ Godkänd" : "Godkänn"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
