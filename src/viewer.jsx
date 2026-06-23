// viewer.jsx — Levande Fotoalbum, visningsapp för iPad
import { useState, useEffect, useRef } from "react";
import {
  onAuthChange,
  signIn,
  signOut,
  getMyFamily,
  getPhotos,
  getPhotoUrls,
} from "./supabase.js";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Inter:wght@300;400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

html, body {
  background: #1a1410;
  font-family: 'Inter', sans-serif;
  color: #f5f0e8;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
}

/* AUTH */
.auth-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1410;
  padding: 24px;
}
.auth-box {
  width: 100%;
  max-width: 460px;
  text-align: center;
}
.auth-icon { font-size: 64px; margin-bottom: 20px; }
.auth-title {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  color: #f5f0e8;
  margin-bottom: 8px;
  line-height: 1.2;
}
.auth-subtitle {
  font-size: 20px;
  color: #a09080;
  margin-bottom: 48px;
}
.auth-field { margin-bottom: 20px; text-align: left; }
.auth-field label {
  display: block;
  font-size: 18px;
  color: #c8b896;
  margin-bottom: 10px;
  font-weight: 500;
}
.auth-field input {
  width: 100%;
  padding: 20px 24px;
  border: 2px solid #3a2e20;
  border-radius: 16px;
  font-size: 22px;
  background: #2a2010;
  color: #f5f0e8;
  outline: none;
  font-family: 'Inter', sans-serif;
}
.auth-field input:focus { border-color: #b8973a; }
.btn-login {
  width: 100%;
  padding: 22px;
  background: #b8973a;
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 24px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  font-family: 'Inter', sans-serif;
}
.btn-login:active { background: #9d7e2e; }
.auth-error {
  background: rgba(192,57,43,0.2);
  border: 1px solid rgba(192,57,43,0.4);
  color: #e74c3c;
  border-radius: 12px;
  padding: 16px;
  font-size: 18px;
  margin-bottom: 20px;
}

/* HEADER */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: #1a1410;
  border-bottom: 1px solid #2a2010;
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-title {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: #f5f0e8;
}
.header-family {
  font-size: 16px;
  color: #a09080;
  margin-top: 2px;
}
.btn-signout {
  background: none;
  border: 2px solid #3a2e20;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 16px;
  color: #a09080;
  cursor: pointer;
}

/* GALLERY */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 24px;
}
.gallery-card {
  border-radius: 16px;
  overflow: hidden;
  background: #2a2010;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  border: 2px solid transparent;
}
.gallery-card:active { transform: scale(0.97); }
.gallery-card img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  display: block;
}
.gallery-card-label {
  padding: 14px 16px;
  font-size: 17px;
  color: #c8b896;
  line-height: 1.3;
}
.gallery-card-year {
  font-size: 14px;
  color: #7a6a50;
  margin-top: 4px;
}

/* FULLSCREEN VIEWER */
.viewer {
  position: fixed;
  inset: 0;
  background: #0d0b08;
  display: flex;
  flex-direction: column;
  z-index: 100;
}
.viewer-photo-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}
.viewer-photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.viewer-nav-left, .viewer-nav-right {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.5);
  border: none;
  color: #f5f0e8;
  font-size: 36px;
  padding: 20px 16px;
  cursor: pointer;
  border-radius: 12px;
  z-index: 10;
}
.viewer-nav-left { left: 12px; }
.viewer-nav-right { right: 12px; }

.viewer-bottom {
  background: linear-gradient(to top, #0d0b08, #13100c);
  padding: 20px 24px 32px;
  border-top: 1px solid #2a2010;
}
.viewer-description {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  color: #f5f0e8;
  line-height: 1.5;
  margin-bottom: 8px;
  min-height: 60px;
}
.viewer-meta {
  font-size: 16px;
  color: #7a6a50;
  margin-bottom: 20px;
}
.viewer-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}
.btn-play {
  flex: 1;
  padding: 18px;
  background: #b8973a;
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 22px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.btn-play:active { background: #9d7e2e; }
.btn-play.playing { background: #5a4a35; }
.btn-close {
  padding: 18px 22px;
  background: #2a2010;
  border: 2px solid #3a2e20;
  border-radius: 16px;
  font-size: 24px;
  cursor: pointer;
  color: #f5f0e8;
}
.viewer-counter {
  text-align: center;
  font-size: 15px;
  color: #5a4a50;
  margin-top: 12px;
}

/* EMPTY */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #5a4a50;
  text-align: center;
  padding: 40px;
}
.empty-icon { font-size: 64px; margin-bottom: 16px; }
.empty-text { font-size: 22px; }

/* LOADING */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 22px;
  color: #7a6a50;
}

@media (min-width: 768px) {
  .gallery { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 32px; }
  .viewer-description { font-size: 26px; }
  .btn-play { font-size: 26px; padding: 22px; }
}
`;

export default function ViewerApp() {
  const [session, setSession] = useState(null);
  const [family, setFamily] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const unsub = onAuthChange(async (s) => {
      setSession(s);
      if (s) {
        const fam = await getMyFamily();
        setFamily(fam);
        const data = await getPhotos();
        const withDesc = (data || []).filter((p) => p.description || p.ai_description);
        setPhotos(withDesc);
        if (withDesc.length > 0) {
          const urls = await getPhotoUrls(withDesc.map((p) => p.storage_path));
          setPhotoUrls(urls || {});
        }
      }
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    return () => { synthRef.current?.cancel(); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const { error } = await signIn(email, password);
    if (error) setAuthError("Fel e-post eller lösenord. Försök igen.");
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    synthRef.current?.cancel();
    await signOut();
    setSession(null);
    setFamily(null);
    setPhotos([]);
    setSelectedIndex(null);
  };

  const openPhoto = (index) => {
    synthRef.current?.cancel();
    setSpeaking(false);
    setSelectedIndex(index);
  };

  const closePhoto = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
    setSelectedIndex(null);
  };

  const goNext = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
    setSelectedIndex((i) => (i + 1) % photos.length);
  };

  const goPrev = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
    setSelectedIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  const handleSpeak = () => {
    if (speaking) {
      synthRef.current?.cancel();
      setSpeaking(false);
      return;
    }
    const photo = photos[selectedIndex];
    const text = photo.ai_description || photo.description || "";
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "sv-SE";
    utt.rate = 0.9;
    utt.pitch = 1.0;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    synthRef.current?.speak(utt);
    setSpeaking(true);
  };

  if (loading) return (
    <>
      <style>{STYLES}</style>
      <div className="loading">Laddar albumet...</div>
    </>
  );

  if (!session) return (
    <>
      <style>{STYLES}</style>
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-icon">📷</div>
          <div className="auth-title">Levande Fotoalbum</div>
          <div className="auth-subtitle">Logga in för att se dina foton</div>
          {authError && <div className="auth-error">{authError}</div>}
          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label>E-post</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="auth-field">
              <label>Lösenord</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn-login" disabled={authLoading}>
              {authLoading ? "Loggar in..." : "Logga in"}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      <style>{STYLES}</style>

      <div className="header">
        <div>
          <div className="header-title">📷 Mitt album</div>
          {family && <div className="header-family">{family.name}</div>}
        </div>
        <button className="btn-signout" onClick={handleSignOut}>Logga ut</button>
      </div>

      {photos.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🖼️</div>
          <div className="empty-text">Inga foton ännu</div>
        </div>
      ) : (
        <div className="gallery">
          {photos.map((photo, i) => (
            <div key={photo.id} className="gallery-card" onClick={() => openPhoto(i)}>
              {photoUrls[photo.storage_path]
                ? <img src={photoUrls[photo.storage_path]} alt={photo.description || photo.filename} loading="lazy" />
                : <div style={{ width: "100%", aspectRatio: "4/3", background: "#2a2010", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>📷</div>
              }
              <div className="gallery-card-label">
                {photo.ai_description || photo.description || photo.filename}
                {photo.year && <div className="gallery-card-year">{photo.year}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="viewer">
          <div className="viewer-photo-wrap">
            {photoUrls[selectedPhoto.storage_path] && (
              <img className="viewer-photo" src={photoUrls[selectedPhoto.storage_path]} alt={selectedPhoto.description || selectedPhoto.filename} />
            )}
            {photos.length > 1 && (
              <>
                <button className="viewer-nav-left" onClick={goPrev}>‹</button>
                <button className="viewer-nav-right" onClick={goNext}>›</button>
              </>
            )}
          </div>

          <div className="viewer-bottom">
            <div className="viewer-description">
              {selectedPhoto.ai_description || selectedPhoto.description || "Ingen beskrivning"}
            </div>
            {(selectedPhoto.location || selectedPhoto.year) && (
              <div className="viewer-meta">
                {[selectedPhoto.location, selectedPhoto.year].filter(Boolean).join(" · ")}
              </div>
            )}
            <div className="viewer-controls">
              <button className={"btn-play" + (speaking ? " playing" : "")} onClick={handleSpeak}>
                {speaking ? "⏹ Stoppa" : "▶ Läs upp"}
              </button>
              <button className="btn-close" onClick={closePhoto}>✕</button>
            </div>
            {photos.length > 1 && (
              <div className="viewer-counter">{selectedIndex + 1} / {photos.length}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
