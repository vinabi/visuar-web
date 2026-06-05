# VISUAR — See Beyond

**Screen-based vision screening for your laptop.**  
Estimate distance and near eyesight numbers, run clinical-style refraction tests, and get AI-powered guidance — all from a browser with a webcam.

<p align="center">
  <a href="https://www.visuar-web.app/dashboard"><strong>🌐 Live App</strong></a> &nbsp;·&nbsp;
  <a href="https://vinabi-visuar-backend.hf.space/"><strong>⚙️ Live API</strong></a> &nbsp;·&nbsp;
  <a href="#getting-started">Quick Start</a> &nbsp;·&nbsp;
  <a href="#vision-tests">Tests</a> &nbsp;·&nbsp;
  <a href="#architecture">Architecture</a>
</p>

---

## Live Deployments

| Service | URL | Platform |
|---------|-----|----------|
| **Frontend (Dashboard)** | [https://www.visuar-web.app/dashboard](https://www.visuar-web.app/dashboard) | Vercel |
| **Backend API** | [https://vinabi-visuar-backend.hf.space/](https://vinabi-visuar-backend.hf.space/) | Hugging Face Spaces |
| **WebSocket (Vision)** | `wss://vinabi-visuar-backend.hf.space/ws/vision` | Hugging Face Spaces |

> **Important:** VISUAR is a **screening tool**, not a clinical prescription. Results are approximate and meant to help you decide whether to visit an eye care professional — not to replace one.

---

## What I Built

I wanted to bring optometry-style vision checks out of the clinic and onto any laptop. In a real exam room the chart sits 6 metres away, the optometrist flips real lenses, and lighting is controlled. VISUAR adapts that workflow for a **60–80 cm laptop screen** with three core ideas:

1. **PPI calibration** — the user matches an on-screen box to a credit card (85.6 mm ISO standard) so we know exactly how many pixels equal one millimetre on *their* display.
2. **Viewing distance band** — acuity is about visual angle, not absolute size. At ~70 cm instead of 6 m, letter heights are recalculated from geometry so the same angle reaches the eye.
3. **Webcam as a clinical proxy** — MediaPipe face landmarks + a focal-length distance model verify face presence, 60–80 cm range, and monocular eye cover before a test can proceed.

The result is a full screening platform: onboarding, a test dashboard, real-time vision gating, diopter estimates, PDF reports, and an AI consultant backed by RAG over vision knowledge.

---

## Features

| Area | What you get |
|------|--------------|
| **Vision tests** | Snellen distance acuity, Jaeger near acuity, Landolt C, contrast sensitivity, colour vision, duochrome refinement, refraction simulator, near–far switching, full refraction battery, blur screener |
| **Webcam gating** | Face detection, distance check (40–80 cm), eye open/closed/covered states, glasses detection |
| **Results** | Approximate diopter estimates, session fusion across battery tests, PDF health report download |
| **AI Consultant** | Profile-aware chat with RAG (Gemini + pgvector), voice input, text-to-speech replies |
| **Auth & profiles** | Supabase authentication, onboarding questionnaire, lifestyle/vision profile |
| **Plans** | Free / Basic / Pro tiers with Stripe integration |
| **i18n** | English and Urdu (RTL support) |
| **Email** | Welcome, login, and test-result notifications via Gmail SMTP |

---

## Architecture

```mermaid
flowchart TB
    subgraph Client["Browser (React + Vite)"]
        UI["Pages & Test Engines"]
        PPI["PPI Calibrator"]
        CAM["Webcam Preview"]
        UI --> PPI
        UI --> CAM
    end

    subgraph Auth["Supabase"]
        SA["Auth (JWT)"]
        DB[("PostgreSQL + pgvector")]
    end

    subgraph Backend["FastAPI (Hugging Face Spaces)"]
        API["REST API"]
        WS["WebSocket /ws/vision"]
        VM["Vision Module\n(MediaPipe + OpenCV)"]
        AI["AI Chat + RAG\n(Gemini)"]
        EMAIL["Email Service"]
        API --> VM
        API --> AI
        API --> EMAIL
        WS --> VM
    end

    UI -->|"HTTPS + JWT"| API
    CAM -->|"WebSocket frames"| WS
    SA -->|"Session tokens"| UI
    API --> DB
    AI --> DB
```

### Request flow (typical test session)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant B as Backend
    participant W as WebSocket Vision

    U->>F: Sign in
    F->>S: Authenticate
    S-->>F: JWT

    U->>F: Calibrate PPI (credit card)
    U->>F: Start test
    F->>W: Connect /ws/vision
    loop Every frame
        F->>W: Base64 webcam frame
        W-->>F: face_detected, distance_cm, eye_state
    end

    U->>F: Complete test rows
    F->>B: POST /api/test-results (JWT)
    B-->>F: Saved result + optional AI analysis
    F->>U: Results page + PDF option
```

---

## Tech Stack

### Frontend (`visuar-frontend/`)

| Layer | Technology |
|-------|------------|
| Framework | React 18, Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS |
| Auth | Supabase JS client |
| HTTP | Axios |
| i18n | i18next + react-i18next |
| Payments | Stripe Elements |
| PDF | jsPDF + jspdf-autotable |
| Voice | ElevenLabs (TTS), Web Speech API (input) |

### Backend (`visuar-backend/`)

| Layer | Technology |
|-------|------------|
| API | FastAPI + Uvicorn |
| Database | PostgreSQL via SQLAlchemy (async) + Supabase |
| Auth validation | Supabase JWT |
| Computer vision | OpenCV, MediaPipe Face Landmarker |
| AI | Google Gemini (chat + result analysis) |
| RAG | LangChain + pgvector embeddings |
| Email | aiosmtplib (Gmail) |

### Infrastructure

| Component | Host |
|-----------|------|
| Frontend | [Vercel](https://vercel.com) — SPA rewrites via `vercel.json` |
| Backend | [Hugging Face Spaces](https://huggingface.co/spaces) (Docker, persistent secrets) |
| Database & Auth | [Supabase](https://supabase.com) |

---

## Project Structure

```
visuar-web/
├── tests_logic_guide.md      # Test logic & formula reference
├── visuar-frontend/          # React SPA — deployed to Vercel
│   ├── src/
│   │   ├── pages/            # Route pages (Dashboard, Test, Results, AI Consult, …)
│   │   ├── components/       # Test engines, UI, webcam gates
│   │   ├── utils/            # Acuity math, diopter estimates, test catalog
│   │   ├── context/          # Auth, theme, plan providers
│   │   ├── lib/              # API client, Supabase, config
│   │   └── locales/          # en + ur translations
│   └── run.sh                # One-command local dev
│
└── visuar-backend/           # FastAPI server — deployed to HF Spaces
    ├── main.py               # Routes, WebSocket, startup
    ├── vision_module/        # MediaPipe distance + eye-state logic
    ├── ai_chat/              # RAG engine, prompts, chat CRUD
    ├── migrations/           # SQL migrations for Supabase
    ├── run.sh                # One-command local dev
    └── requirements.txt
```

---

## Vision Tests

VISUAR routes users based on their blur report (distance, near, both, or unsure). Here is how the main tests map to user problems:

```mermaid
flowchart LR
    subgraph Input
        BS["Blur Screener"]
    end

    subgraph Far["Distance blur"]
        SN["Snellen\n(Distance Eyesight Number)"]
        LC["Landolt C"]
        SIM["Refraction Simulator"]
        DUO["Duochrome"]
        FB["Full Refraction Battery"]
    end

    subgraph Near["Near / reading blur"]
        JG["Jaeger\n(Near Eyesight Number)"]
        NF["Near–Far Switching"]
    end

    subgraph Support["Supporting"]
        CS["Contrast Sensitivity"]
        CV["Colour Vision"]
    end

    BS --> Far
    BS --> Near
    BS --> Support
    SN --> FB
    SIM --> FB
    DUO --> FB
    JG --> FB
```

| Test | ID | Primary output |
|------|----|----------------|
| Distance Eyesight Number Test | `snellen-acuity` | Minus diopters (e.g. −1.50 D) |
| Near Eyesight Number Test | `jaeger-acuity` | Plus reading add (e.g. +1.50 D) |
| Full Refraction Battery | `refraction-battery` | Fused Snellen + Duochrome + Simulator |
| Blur Screener | `blur-screener` | Routes only — no number |
| Landolt C Acuity | `landolt-acuity` | Precise acuity estimate |
| Contrast Sensitivity | `contrast-sensitivity` | Contrast score (not diopters) |
| Colour Vision Test | `color-vision` | Red-green deficiency screen |
| Duochrome Test | `duochrome-refinement` | ±0.25 D sphere refinement |
| Refraction Simulator | `refraction-simulator` | Interactive clearer comparisons |
| Near–Far Switching | `near-far-switching` | Focus flexibility |

For the full formula walkthrough (PPI math, letter height geometry, fusion logic), see [`tests_logic_guide.md`](tests_logic_guide.md).

---

## How PPI Calibration Works

The browser does not know your screen's physical size. We solved this with a credit card as a known ruler:

```mermaid
flowchart LR
    A["User slides blue box\nuntil it matches\ncredit card width"] --> B["boxWidth in CSS pixels"]
    B --> C["PPI = boxWidth / 3.37\n(85.6 mm = 3.37 inches)"]
    C --> D["Letter height in mm\nfrom 70 cm geometry"]
    D --> E["pixels = (mm / 25.4) × PPI"]
    E --> F["Correct visual angle\non this screen"]
```

**Example:** If the card spans 400 px → PPI ≈ 119 → a 5.8 mm letter at 70 cm renders at the right pixel height for that display.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9–3.12
- **Webcam** (required for vision tests)
- A **[Supabase](https://supabase.com)** project (Auth + PostgreSQL)
- Optional: **Gemini API key** (AI chat & result analysis), **ElevenLabs key** (TTS), **Stripe keys** (payments)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/visuar-web.git
cd visuar-web
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **Email** auth (and any OAuth providers you want).
3. Run the SQL migrations in order via **SQL Editor**:

   | File | Purpose |
   |------|---------|
   | `visuar-backend/onboarding_migration.sql` | Onboarding profiles table |
   | `visuar-backend/vision_focus_migration.sql` | Vision focus column |
   | `visuar-backend/migrations_add_result_json.sql` | JSON result storage |
   | `visuar-backend/migrations_add_ai_columns.sql` | AI analysis columns |
   | `visuar-backend/migrations/add_ai_chat_rag.sql` | pgvector, AI chat tables, RAG |

4. Copy your **Project URL** and **anon key** (frontend) plus **service role key** (backend, if needed).

### 3. Backend environment

```bash
cd visuar-backend
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres
GEMINI_API_KEY=your-gemini-key

# Optional — email notifications
EMAIL_USER=your@gmail.com
EMAIL_APP_PASSWORD=your-gmail-app-password
EMAIL_APP_URL=http://localhost:5173
```

Start the backend:

```bash
./run.sh
# → http://localhost:8000
```

The `run.sh` script creates a venv, installs dependencies, and launches Uvicorn with hot reload.

### 4. Frontend environment

```bash
cd visuar-frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key   # optional
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...       # optional
```

Start the frontend:

```bash
./run.sh
# → http://localhost:5173
```

### 5. Verify it works

1. Open [http://localhost:5173](http://localhost:5173) and sign up.
2. Complete onboarding (vision focus, habits, symptoms).
3. On the dashboard, start a **Blur Screener** or **Distance Eyesight Number Test**.
4. Calibrate PPI with a credit card, allow camera access, and sit ~70 cm from the screen.
5. Check the backend health page at [http://localhost:8000](http://localhost:8000).

---

## User Journey

```mermaid
flowchart TD
    A["Landing / Home"] --> B{"Signed in?"}
    B -->|No| C["Sign Up / Login"]
    B -->|Yes| D["Dashboard"]
    C --> E["Onboarding"]
    E --> D
    D --> F["Test Selection\n(based on vision focus)"]
    F --> G["PPI Calibration"]
    G --> H["Webcam + Distance Gate"]
    H --> I["Run Test Engine"]
    I --> J["Results + AI Insight"]
    J --> K["PDF Report / History"]
    D --> L["AI Consultant"]
    D --> M["Profile / Settings"]
```

---

## API Reference

Base URL (production): `https://vinabi-visuar-backend.hf.space`  
Base URL (local): `http://localhost:8000`

All authenticated routes expect `Authorization: Bearer <supabase_jwt>`.

### Auth & user

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register-user` | Register user record |
| `GET` | `/me` | Current user info |

### Profile & onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/profile` | Create/update lifestyle profile |
| `GET` | `/profile` | Get profile |
| `GET` | `/api/onboarding/status` | Onboarding completion status |
| `POST` | `/api/onboarding` | Save onboarding answers |
| `POST` | `/api/onboarding/skip` | Skip onboarding |

### Vision & tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `WS` | `/ws/vision` | Real-time face/distance/eye-state stream |
| `POST` | `/api/vision/calibrate` | Distance focal-length calibration |
| `POST` | `/api/test-results` | Save a test result |
| `GET` | `/api/test-results` | List user's results |
| `GET` | `/api/test-results/{id}` | Single result |
| `POST` | `/api/analyze-results` | Gemini analysis of results |

### AI chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat/ping-gemini` | Health check |
| `POST` | `/api/chat/conversations` | Create conversation |
| `GET` | `/api/chat/conversations` | List conversations |
| `POST` | `/api/chat/conversations/{id}/messages` | Send message (RAG + Gemini) |

### Plans & notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/plan` | Current plan tier |
| `PUT` | `/api/plan` | Update plan |
| `POST` | `/api/notify/signup` | Trigger welcome email |
| `POST` | `/api/notify/login` | Trigger login email |

Interactive API docs (when running locally): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Deployment

### Frontend → Vercel

1. Import the repo and set the **root directory** to `visuar-frontend`.
2. Add environment variables (`VITE_API_URL`, `VITE_SUPABASE_*`, etc.).
3. Set `VITE_API_URL=https://vinabi-visuar-backend.hf.space` for production.
4. Deploy — `vercel.json` handles SPA rewrites.

**Live app:** [https://www.visuar-web.app/dashboard](https://www.visuar-web.app/dashboard)

### Backend → Hugging Face Spaces

The production API runs as a Docker Space. The codebase in `visuar-backend/` is what gets deployed (mirrors the HF Space repo).

1. Create a **Docker Space** on Hugging Face.
2. Upload / sync `visuar-backend/` contents.
3. Set **Secrets** for all `.env` variables (never commit real keys).
4. Ensure `face_landmarker.task` is present in `vision_module/`.
5. The Space exposes port 7860; HF maps it to the public URL.

**Live API:** [https://vinabi-visuar-backend.hf.space/](https://vinabi-visuar-backend.hf.space/)

> **Note:** WebSocket vision requires the HF Space to stay awake. Cold starts may add a few seconds to the first camera connection.

---

## Plans & Pricing

| Feature | Free | Basic ($5/mo) | Pro ($10/mo) |
|---------|------|---------------|--------------|
| All vision tests | ✅ | ✅ | ✅ |
| AI messages / conversation | 5 | 50 | Unlimited |
| Test history | Last 3 | All | All |
| PDF report | ✅ | ✅ | ✅ |
| Priority AI responses | — | ✅ | ✅ |
| Advanced analytics | — | — | ✅ |

Stripe handles checkout on the `/pricing` page. Plan state is stored server-side and synced via `/api/plan`.

---

## Vision Module (Webcam)

The backend `vision_module/` uses MediaPipe Face Landmarker in live-stream mode:

```mermaid
stateDiagram-v2
    [*] --> NoFace: No face detected
    NoFace --> TooClose: face width too large
    NoFace --> TooFar: face width too small
    NoFace --> OK: 40–80 cm

    OK --> BothOpen: EAR above threshold
    OK --> LeftCovered: hand over left eye
    OK --> RightCovered: hand over right eye
    OK --> BothClosed: blink

    LeftCovered --> OK: cover removed
    RightCovered --> OK: cover removed
```

Distance uses a pinhole camera model:

```
focal_length = (face_width_px × known_distance_cm) / real_face_width_cm
distance_cm  = (real_face_width_cm × focal_length) / face_width_px
```

See [`visuar-backend/vision_module/README.md`](visuar-backend/vision_module/README.md) for standalone demo instructions (`python test.py`).

---

## Internationalization

Supported languages:

- **English** (`en`) — default
- **Urdu** (`ur`) — full RTL layout

Translation files live in `visuar-frontend/src/locales/`. The language selector on the home page and dashboard persists the choice via `i18next-browser-languagedetector`.

---

## Environment Variables Reference

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend base URL |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_ELEVENLABS_API_KEY` | — | Text-to-speech for AI consultant |
| `VITE_STRIPE_PUBLISHABLE_KEY` | — | Stripe checkout |

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase anon key |
| `DATABASE_URL` | ✅ | Async PostgreSQL connection string |
| `GEMINI_API_KEY` | — | AI chat & result analysis |
| `EMAIL_USER` | — | Gmail address for notifications |
| `EMAIL_APP_PASSWORD` | — | Gmail app password |
| `EMAIL_APP_URL` | — | Frontend URL for email links |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Camera not opening | Close other apps using the webcam; reload and click **Retry Camera** |
| "Database temporarily unavailable" | Check `DATABASE_URL` and that migrations ran in Supabase |
| WebSocket disconnects on HF | Space may have slept — refresh and wait for cold start |
| Letters look wrong size | Re-run PPI calibration with a real credit card |
| AI chat returns 503 | `GEMINI_API_KEY` not set on the backend |
| Distance always "too close/far" | Recalibrate via the in-test distance step; sit 60–80 cm away |

---

## Disclaimer

VISUAR provides **approximate screening estimates** for educational and informational purposes. It does **not** diagnose eye disease, prescribe lenses, or replace a licensed eye examination. If you have persistent blur, pain, sudden vision changes, or any concerning symptoms, see an eye care professional promptly.

---

## License

This project is provided as-is for portfolio and educational use. Contact me before commercial deployment.

---

## Links

- **Live app:** [https://www.visuar-web.app/dashboard](https://www.visuar-web.app/dashboard)
- **Live API:** [https://vinabi-visuar-backend.hf.space/](https://vinabi-visuar-backend.hf.space/)
- **Test logic reference:** [`tests_logic_guide.md`](tests_logic_guide.md)
- **Vision module docs:** [`visuar-backend/vision_module/README.md`](visuar-backend/vision_module/README.md)

---

<p align="center">
  Built with care for accessible vision screening. <strong>See Beyond.</strong>
</p>

---

<p align="center">
  If you find this project helpful, don't forget to star the repo! 🎀
</p>
