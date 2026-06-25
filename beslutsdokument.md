# Beslutsdokument — Levande Fotoalbum
*Klistra in detta i chatten när du återupptar arbetet. Uppdateras löpande.*

---

## Vision och syfte

Vi bygger en webbaserad app som hjälper äldre att återuppleva minnen via gamla foton. Appen ska vara enkel nog för en person på ålderdomshem att använda på en iPad, med eller utan hjälp av personal eller familj.

Grundtanken: varje foto får en berättelse — vem som är på bilden, var det är, och en mänsklig beskrivning — som läses upp med röst.

**Målgrupp:**
- **Slutanvändare:** Äldre personer, ofta på äldreboende. Begränsad teknikvana. Stor text, stora knappar, enkel navigation är krav — inte nice-to-have.
- **Administratör (familjemedlem):** Tekniskt lagd person som laddar upp bilder, taggar dem och konfigurerar appen åt sin anhörig via ett separat admin-gränssnitt.

**Designprinciper:**
- Enkelhet före funktion — om det kan tas bort, ta bort det
- Stor text alltid — minst 20px body, rubriker minst 32px
- Stora pekbara ytor — knappar minst 60px höga
- Hög kontrast — mörk text på ljus bakgrund
- Svenska som primärspråk
- Varm, lugn estetik — inte klinisk eller teknisk känsla

**Batch-first princip (icke förhandlingsbar):**
Allt ska skalas till 100+ foton utan manuellt arbete per foto. Admin laddar upp foton i bulk, AI sköter taggning och identifiering automatiskt. Manuell insats ska bara behövas för att granska och korrigera enstaka fel.

---

## Projektets status
**Fas:** Aktivt under utveckling — grundfunktioner klara, förbättringar pågår
**Nästa steg:** Testa batch-taggning med riktiga foton, sedan finjustera AI-kvalitet

---

## Byggt hittills

- [x] Supabase-projekt uppsatt (projekt-id: uozfslayyfkahvkfbswn)
- [x] Databasschema skapat (photos, families, persons-tabeller med RLS)
- [x] Admin-gränssnitt (src/admin.jsx) — uppladdning, taggning, personregister
- [x] AI-analys via Supabase Edge Function (analyze-image/index.ts)
- [x] Personregister med referensfoton för ansiktsigenkänning
- [x] Batch-analys med kontextformulär (händelse/plats/år) + automatisk analys vid uppladdning
- [x] Granskningsvy efter batch — godkänn/redigera beskrivningar
- [x] EXIF-läsning (år från bildmetadata via exifr-biblioteket)
- [x] GPS-läsning från EXIF (koordinater → platsnamn via OpenStreetMap/Nominatim)
- [x] Batch-borttagning av markerade foton i admin (kryssrutor + markera alla)
- [x] Visningsapp för iPad (src/viewer.jsx) — stort galleri + fullskärm + röstuppläsning
- [x] Röstuppläsning via Web Speech API (läser upp ai_description i första hand)
- [x] Röstfrågor om foton — spela in fråga → Whisper transkriberar → Claude svarar → läses upp
- [x] Automatisk stopp vid tystnad (2 sekunder) via AudioContext/AnalyserNode
- [x] Multi-tenant auth (Supabase Auth, varje familj isolerad via RLS)
- [x] Driftsatt på Vercel (levande-fotoalbum.vercel.app)
- [x] GitHub-repo (github.com/Jonas221/levande-fotoalbum)

---

## Två appar

| App | URL (lokalt) | URL (live) | Användare |
|-----|-------------|------------|-----------|
| Admin | localhost:5173 | levande-fotoalbum.vercel.app | Jonas (admin) |
| Viewer | localhost:5173/viewer.html | levande-fotoalbum.vercel.app/viewer.html | Anhörig på iPad |

---

## Teknisk stack

- **Frontend:** React + Vite (src/admin.jsx, src/viewer.jsx, src/viewer-main.jsx)
- **Backend/DB/Storage:** Supabase
- **AI-analys:** Claude API via Supabase Edge Function (supabase/functions/analyze-image/index.ts)
- **Röstfrågor:** Whisper (OpenAI) för transkribering + Claude för svar
- **EXIF-läsning:** exifr (npm-paket)
- **GPS → plats:** OpenStreetMap Nominatim (gratis, ingen API-nyckel)
- **Text-to-speech:** Web Speech API (inbyggt i webbläsaren)
- **Hosting:** Vercel (auto-deploy från GitHub main-branch)

---

## Viktiga filer

| Fil | Vad den gör |
|-----|-------------|
| src/admin.jsx | Admin-gränssnittet (hela UI:t) |
| src/viewer.jsx | Visningsappen för iPaden |
| src/viewer-main.jsx | Ingångspunkt för viewer-appen |
| src/supabase.js | All kommunikation med Supabase |
| supabase/functions/analyze-image/index.ts | Edge Function — anropar Claude API för bildanalys |
| supabase/functions/ask-about-photo/index.ts | Edge Function — Claude svarar på frågor om foto |
| supabase/functions/transcribe-audio/index.ts | Edge Function — Whisper transkriberar ljud till text |
| viewer.html | HTML-ingång för viewer-appen |
| .env.local | Supabase-nycklar (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) |
| vite.config.js | Dual-app konfiguration (admin + viewer) |

---

## Kommandon att kunna

```bash
npm run dev                               # Starta lokalt (localhost:5173 eller 5174)
supabase functions deploy analyze-image   # Driftsätt Edge Function efter ändringar
supabase functions deploy ask-about-photo
supabase functions deploy transcribe-audio
git add . && git commit -m "..." && git push  # Pusha till GitHub (Vercel auto-deployas)
```

---

## Fattade beslut

### Grundarkitektur
- **Multi-tenant** — varje familj har helt isolerad data via Supabase RLS
- **Supabase** — auth + databas + bildlagring i ett
- **Web Speech API** — röstuppläsning inbyggt i webbläsaren, gratis, fungerar på iPad
- **Claude API** — bildanalys via Edge Function, ~0.01-0.03 USD per bild (engångskostnad)
- **React + Vercel** — gratis hosting, enkel deploy via GitHub

### AI och taggning
- **Batch-first** — allt ska skalas till 100+ foton utan manuellt arbete per foto
- **Kontextformulär vid uppladdning** — händelse/plats/år skickas med till AI:n
- **Personregister med referensfoton** — Claude jämför ansikten visuellt
- **AI skriver inte över manuellt ifyllda fält** — plats/år/personer skrivs bara in om fälten är tomma
- **ai_description läses upp i viewer** — inte description (den manuella)
- **Granskningsvy efter batch** — godkänn eller redigera AI-beskrivningar snabbt

### Edge Function (analyze-image/index.ts)
- Returnerar engelska fältnamn: description, location, era, persons, keywords
- Skickar personregister med referensfoton som base64 till Claude
- Tar emot context med location, year, notes, personRegistry från frontend
- Prompt instruerar Claude att använda admin-kontext och namnge identifierade personer
- EXIF GPS-läsning inbyggd — läser koordinater direkt ur bildfilen
- Reverse geocoding via OpenStreetMap/Nominatim — konverterar GPS till platsnamn på svenska
- Prioriteringsordning för plats: (1) admin-inmatning, (2) EXIF GPS, (3) tomt
- OBS: Kameror utan GPS-chip (t.ex. digitalkameror) sparar inte platsdata — endast mobilfoton har detta

### Röstfrågor (viewer.jsx + Edge Functions)
- **MediaRecorder** spelar in ljud — fungerar i Safari/iPad, till skillnad från Web Speech API SpeechRecognition
- **Whisper (OpenAI)** transkriberar ljud → text (kräver betalkort på platform.openai.com, kostar ~$0.006/min)
- **Claude** svarar på frågan med bilden som kontext via ask-about-photo Edge Function
- **Autostopp** vid 2 sekunders tystnad via AudioContext/AnalyserNode
- **iOS ljudlåsning** löses via tyst SpeechSynthesisUtterance vid knappklick
- **Web Speech API SpeechRecognition fungerar EJ på iPad/Safari** — loopar utan att fånga tal (därför Whisper)
- **Röst på iPad** — bara "Alva" (kvinnlig) finns som svensk röst på iOS, ingen manlig tillgänglig

---

## Kända problem / att förbättra

- Personidentifiering är opålitlig — Claude förväxlar ibland personer trots referensfoton
- AI-beskrivningar är fortfarande ibland för generella
- RLS-policy blockerar ibland uppladdning av referensfoton till Storage (400-fel)
- Foton tagna med digitalkamera saknar GPS i EXIF — plats måste anges manuellt vid uppladdning
- Röstfrågor har fördröjning (2 nätverksanrop: Whisper + Claude) — utvärdera om det är acceptabelt för äldre användare. Vid behov: backa till Web Speech API (snabbare men fungerar ej på iPad/Safari) eller hitta annan lösning

---

## Öppna frågor

- [ ] Ska appen ha ett eget domännamn? (t.ex. mittalbum.se)
- [ ] Vill vi ha ett bildspelsläge som rullar automatiskt?
- [ ] Ska personal på äldreboendet kunna ha en egen inloggning?
- [ ] Röstval — Web Speech API räcker, eller vill vi ha ElevenLabs/klonad röst?

---

## Idéer på hyllan (ej beslutade)

- **ElevenLabs röst** — bättre och mer naturlig röst, möjlighet till manlig svenska. Utvärdera om Alva är tillräcklig
- **Robotröst/klonad röst** — ElevenLabs kan klona en röst från några minuters inspelning
- **Muntlig interaktion** — redan byggt! Röstfrågor om bilden fungerar nu
- **Slideshow-läge** — bilderna rullar automatiskt med musik
- **Familjealbum** — flera familjemedlemmar kan bidra med taggar och minnen
- **Tidslinjevy** — bilder sorterade kronologiskt på en visuell tidslinje
