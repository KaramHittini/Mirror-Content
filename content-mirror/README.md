# Content Mirror

An AI-powered platform that analyzes social media content and explains **why** it performs the way it does — not just how.

---

## The Problem

Content creators on TikTok, Instagram, and YouTube struggle to understand why some videos succeed and others fail. Most analytics tools show numbers (views, retention rate, likes) but offer no explanation. Creators are left guessing, wasting time and effort on trial and error.

## The Solution

Content Mirror uses AI to analyze uploaded videos and produce structured, human-readable insights:

- **What went wrong** — specific problems identified in the content
- **Why exactly** — the root cause behind each problem
- **What to do next** — actionable, prioritized recommendations
- **Proof from successful content** — similar high-performing videos and why they worked

---

## Features

| Feature | Description |
|---------|-------------|
| Hook Analysis | Score the opening 3–5 seconds (0–10). Detect motion, curiosity triggers, value statements |
| Pacing Detection | Classify content as slow / medium / fast based on cuts-per-minute and motion data |
| Audio Quality | RMS energy, SNR, silence ratio, speech clarity — classified as poor / average / good / excellent |
| Visual Quality | Sharpness, brightness, camera stability, resolution quality |
| Whisper Transcription | Full speech-to-text with WPM, filler word ratio, hook message detection |
| Face Detection | Checks for human presence — a key engagement signal |
| Subtitle Detection | Detects whether captions exist in the lower-third region |
| Weak Section Timeline | Visual timeline showing exactly where audience drop-off risk is highest |
| AI Insights | Rule-based + Claude LLM explanations for every detected problem |
| Recommendations | Up to 6 prioritized, specific fixes with example wording |
| Benchmarking | Compares content against similar successful videos via vector similarity search |
| PDF Export | Download and share full analysis reports |
| Real-time Progress | WebSocket streams live analysis progress to the frontend |

---

## Target Users

- **Individual creators** on TikTok, Instagram, YouTube
- **Beginners** learning what makes content work
- **Digital marketing agencies** managing multiple client accounts
- **Small and medium businesses** building a social media presence

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 14+ (App Router) | React framework |
| Tailwind CSS | Styling |
| shadcn/ui + Radix UI | Component library |
| React Query (@tanstack) | Server state, caching |
| Zustand | Client state |
| Axios | HTTP client with interceptors |
| Recharts | Score visualizations |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API + WebSocket server |
| SQLAlchemy (async) | ORM |
| Alembic | Database migrations |
| PostgreSQL | Primary database |
| Redis | Celery broker + pub/sub for WebSocket |
| Celery | Async job queue for video processing |
| python-jose | JWT auth (access + refresh tokens) |
| passlib / bcrypt | Password hashing |
| boto3 | S3 / R2 storage |
| WeasyPrint | PDF report generation |

### AI Pipeline
| Technology | Purpose |
|-----------|---------|
| OpenCV | Frame extraction, sharpness, brightness, face detection |
| PySceneDetect | Scene change detection |
| librosa | Audio analysis (RMS, SNR, silence) |
| moviepy | Audio extraction from video |
| OpenAI Whisper | Speech transcription with word timestamps |
| Anthropic Claude | LLM insight generation (`claude-sonnet-4-6`) |
| Pinecone | Vector DB for benchmark similarity search |
| pytesseract | OCR for subtitle detection |
| face-recognition | Face presence detection |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Local development environment |
| GitHub Actions | CI/CD pipeline |
| Sentry | Error tracking (frontend + backend) |

---

## Project Structure

```
content-mirror/
├── .env.example                        ← Environment variable template
├── docker-compose.yml                  ← Full local stack (DB, Redis, backend, worker, frontend)
├── TASKS.md                            ← Detailed team task checklist
│
├── frontend/                           ← Next.js 14+ application
│   ├── app/
│   │   ├── page.tsx                    ← Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx              ← Sidebar + Navbar shell
│   │       ├── dashboard/page.tsx      ← Usage stats + recent analyses
│   │       ├── analyze/page.tsx        ← Upload + live analysis UI
│   │       ├── history/page.tsx        ← Paginated analysis history
│   │       └── settings/page.tsx       ← Profile + plan management
│   ├── components/
│   │   ├── analysis/                   ← VideoUploader, AnalysisResults, ScoreCard,
│   │   │                                  WeakSectionsTimeline, RecommendationsPanel
│   │   ├── dashboard/                  ← StatsOverview, RecentAnalyses
│   │   └── shared/                     ← Sidebar, Navbar, Providers
│   ├── hooks/
│   │   ├── useAnalysis.ts              ← Upload, WebSocket progress, polling fallback
│   │   └── useAuth.ts                  ← Login, register, logout, token refresh
│   └── lib/
│       ├── api.ts                      ← Axios client + interceptors + upload helper
│       ├── types.ts                    ← All TypeScript types
│       └── utils.ts                    ← cn(), formatSeconds(), score colors
│
├── backend/                            ← FastAPI application
│   └── app/
│       ├── main.py                     ← App entry point + WebSocket endpoint
│       ├── api/v1/endpoints/
│       │   ├── auth.py                 ← /register /login /refresh /logout
│       │   ├── users.py                ← /me
│       │   └── analysis.py             ← /upload /list /get
│       ├── core/
│       │   ├── config.py               ← Pydantic settings from .env
│       │   ├── security.py             ← JWT creation + verification + bcrypt
│       │   └── dependencies.py         ← get_current_user, get_db
│       ├── models/
│       │   ├── user.py                 ← SQLAlchemy User model
│       │   └── analysis.py             ← SQLAlchemy Analysis model
│       ├── schemas/                    ← Pydantic request/response schemas
│       ├── services/
│       │   ├── storage_service.py      ← Abstract upload/download (local + S3)
│       │   └── queue_service.py        ← Enqueue analysis jobs
│       └── workers/
│           ├── celery_app.py           ← Celery configuration
│           └── analysis_worker.py      ← Main processing task
│
└── ai/                                 ← Standalone AI pipeline
    ├── main.py                         ← run_pipeline(video_path) → JSON
    ├── analyzers/
    │   ├── video_analyzer.py           ← Hook score, pacing, weak sections
    │   ├── audio_analyzer.py           ← Audio quality, silence, SNR, Whisper
    │   └── image_analyzer.py           ← Sharpness, brightness, face, subtitles
    ├── engine/
    │   ├── insight_engine.py           ← Rules + Claude → Problem/Cause/Evidence
    │   ├── recommendation_engine.py    ← Maps insights → actionable fixes
    │   └── benchmark_engine.py         ← Pinecone similarity search
    └── utils/
        ├── video_utils.py              ← Frame extraction, duration helpers
        └── audio_utils.py              ← Audio loading, normalization helpers
```

---

## Team & Task Breakdown

### Karam — Software Engineering

#### Phase 1: Infrastructure
- [ ] Initialize Git repo, configure `.env`, Docker Compose
- [ ] PostgreSQL setup + Alembic migrations (users + analyses tables)
- [ ] Redis setup for Celery queue and WebSocket pub/sub
- [ ] S3/R2 bucket setup (or local storage for dev)

#### Phase 2: Backend API
- [ ] `core/config.py` — Pydantic settings
- [ ] `core/security.py` — JWT access + refresh tokens, bcrypt hashing
- [ ] `core/dependencies.py` — `get_current_user`, `get_db`
- [ ] `models/` — SQLAlchemy ORM for User and Analysis
- [ ] `schemas/` — Pydantic request/response types
- [ ] Auth endpoints: `/register`, `/login`, `/refresh`, `/logout`
- [ ] User endpoints: `/me`
- [ ] Analysis endpoints: `/upload`, `/list`, `/{id}`
- [ ] Report endpoints: `/export/pdf/{id}`, `/export/json/{id}`
- [ ] `storage_service.py` — abstract local ↔ S3 uploads
- [ ] `queue_service.py` — enqueue Celery jobs on upload
- [ ] `analysis_worker.py` — Celery task, calls `ai/main.py`, writes results to DB
- [ ] WebSocket `/ws/{analysis_id}` — real-time progress via Redis pub/sub
- [ ] Rate limiting middleware (5/month free, 100/month pro)
- [ ] CORS, logging, error handler middleware

#### Phase 3: Frontend
- [ ] Login + Signup pages with form validation
- [ ] Dashboard layout (Sidebar + Navbar)
- [ ] Dashboard page (stats + recent analyses)
- [ ] Analyze page (upload UI + live results display)
- [ ] History page (paginated list)
- [ ] Settings page (profile, plan, usage)
- [ ] `VideoUploader` — drag-and-drop + URL input field
- [ ] `AnalysisResults` — full results display with all sections
- [ ] `ScoreCard` — hook/pacing/audio/visual scores
- [ ] `WeakSectionsTimeline` — visual timeline with red weak-section markers
- [ ] `RecommendationsPanel` — priority-sorted actionable cards
- [ ] `useAnalysis` hook — upload, WebSocket progress, polling fallback
- [ ] `useAuth` hook — login, register, token refresh, protected routes
- [ ] `lib/api.ts` — typed Axios client with auto token refresh

#### Phase 4: DevOps & Quality
- [ ] `backend/Dockerfile` + `frontend/Dockerfile`
- [ ] GitHub Actions CI (lint, test, build on PR)
- [ ] Backend tests (pytest) for auth + analysis endpoints
- [ ] Frontend tests (Vitest + Testing Library)
- [ ] PDF report export (WeasyPrint)
- [ ] Sentry error tracking

---

### Amr — AI Pipeline Architecture & Integration

#### Phase 1: Pipeline Core
- [ ] `ai/main.py` — `run_pipeline(video_path)` entry point, merges all analyzer outputs, returns final JSON
- [ ] `ai/pipeline/preprocessor.py` — extract frames every 0.5s, extract audio track, normalize resolution
- [ ] `ai/pipeline/segmenter.py` — split video into Hook (0–5s) / Body / CTA segments
- [ ] `ai/pipeline/feature_extractor.py` — aggregate features per segment

#### Phase 2: Insight & Recommendation Engines
- [ ] `ai/engine/insight_engine.py`
  - Rule-based layer: deterministic detection (weak hook, slow pacing, silence, audio quality, filler words, no subtitles, poor lighting)
  - LLM layer: Claude generates 1–2 additional nuanced insights
  - All insights follow: `Problem → Cause → Evidence` structure
  - All LLM outputs use probability language: "Likely…", "Strong signal suggests…"
- [ ] `ai/engine/recommendation_engine.py`
  - Maps each insight problem type to a specific, actionable recommendation
  - Each recommendation includes a concrete example fix
  - Returns top 6 prioritized recommendations
- [ ] Backend integration — connect `ai/main.py` to `analysis_worker.py`
- [ ] Define and document the final JSON output contract
- [ ] Unit tests for insight engine rules and recommendation mapping
- [ ] Prompt engineering — iterate on Claude system prompts for quality and consistency

#### Phase 3: Edge Cases & Validation
- [ ] Handle very short videos (< 5 seconds)
- [ ] Handle silent videos (no audio track)
- [ ] Handle audio-only inputs
- [ ] Validate all output matches the strict JSON schema before returning

---

### Noor Najjar — Audio & Speech Analysis

#### Phase 1: Audio Analyzer
- [ ] `ai/analyzers/audio_analyzer.py`
  - Extract audio track from video using `moviepy`
  - RMS energy computation (volume level and consistency)
  - Silence ratio detection (fraction of audio that is silent)
  - SNR approximation (signal-to-noise ratio in dB)
  - Speech energy detection
  - Classify overall quality: `poor / average / good / excellent`
  - Return: `{ audio_quality, silence_ratio, snr_db }`

#### Phase 2: Whisper Transcription
- [ ] `ai/analyzers/transcription_analyzer.py` *(new file)*
  - Integrate OpenAI Whisper (local `base` model)
  - Full transcript with word-level timestamps
  - Speaking pace (WPM — words per minute)
  - Filler word detection: `um`, `uh`, `like`, `you know`, `basically`, etc.
  - Filler word ratio (filler count / total words)
  - Hook message detection: are at least 5 words spoken in the first 5 seconds?
  - Return: `{ transcript, wpm, filler_word_ratio, hook_message_present }`

#### Phase 3: Insight Integration
- [ ] Feed audio outputs into `insight_engine.py` rule layer:
  - `silence_ratio > 0.4` → "Excessive silence gaps hurt engagement"
  - `filler_word_ratio > 0.08` → "High filler words reduce perceived authority"
  - `hook_message_present == false` → "Main message missing from opening"
  - `audio_quality == poor` → "Poor audio quality — viewers may tune out"
- [ ] Write unit tests with real sample audio clips
- [ ] Document input format and expected output schema

---

### Noor Adili — Visual Analysis & Benchmarking

#### Phase 1: Image Analyzer
- [ ] `ai/analyzers/image_analyzer.py`
  - Sample 30 evenly-spaced frames across the video
  - Sharpness: Laplacian variance per frame (higher = sharper)
  - Brightness: HSV histogram mean (detect over/underexposure)
  - Camera stability: inter-frame pixel difference
  - Face detection: OpenCV Haar cascade across sampled frames
  - Subtitle detection: edge density in lower-third region + pytesseract OCR fallback
  - Classify: `poor / average / good / excellent`
  - Return: `{ image_quality, sharpness_score, brightness_score, face_detected, subtitles_detected }`

#### Phase 2: Benchmark Engine
- [ ] `ai/engine/benchmark_engine.py`
  - Design 7-dimensional feature vector schema for content fingerprinting
  - Encode analysis output into normalized feature vector
  - Query Pinecone for top-3 most similar successful videos
  - Return: title, platform, why_successful, key_differences, hook_score
  - Seed vector DB with manually curated successful content (MVP phase)
  - Fallback to built-in seed examples when Pinecone is unavailable

#### Phase 3: Insight Integration
- [ ] Feed visual outputs into `insight_engine.py` rule layer:
  - `face_detected == false` → "No human presence — weaker emotional connection"
  - `sharpness_score < 40` → "Low visual sharpness signals poor production quality"
  - `subtitles_detected == false` → "Missing captions reduce accessibility and watch time"
  - `brightness_score < 30 or > 230` → "Lighting is too dark / overexposed"
- [ ] Seed Pinecone index with at least 20 example successful content vectors
- [ ] Write unit tests for image analyzer using sample frame images
- [ ] `ai/utils/audio_utils.py` — shared audio loading and normalization helpers

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account → returns access token |
| POST | `/api/v1/auth/login` | Login → returns access token |
| POST | `/api/v1/auth/refresh` | Refresh access token via httpOnly cookie |
| POST | `/api/v1/auth/logout` | Clear refresh token cookie |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Current user profile + usage stats |

### Analyses
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analyses/upload` | Upload video → queues analysis job |
| GET | `/api/v1/analyses` | List user's analysis history |
| GET | `/api/v1/analyses/{id}` | Get full analysis result |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/export/pdf/{id}` | Download PDF report |
| GET | `/api/v1/reports/export/json/{id}` | Download JSON report |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://host/ws/{analysis_id}` | Real-time analysis progress stream |

---

## AI Output Schema (Strict)

```json
{
  "hook_score": 0.0,
  "pacing": "slow | medium | fast",
  "audio_quality": "poor | average | good | excellent",
  "image_quality": "poor | average | good | excellent",
  "weak_sections": [
    { "start_seconds": 0, "end_seconds": 0, "reason": "" }
  ],
  "hook_duration_seconds": 0,
  "transcript": "",
  "wpm": 0,
  "filler_word_ratio": 0.0,
  "hook_message_present": true,
  "sharpness_score": 0.0,
  "brightness_score": 0.0,
  "face_detected": true,
  "subtitles_detected": false,
  "insights": [
    { "id": "", "problem": "", "cause": "", "evidence": "", "severity": "low | medium | high", "timestamp_seconds": null }
  ],
  "recommendations": [
    { "id": "", "title": "", "description": "", "example": "", "priority": 1, "category": "" }
  ],
  "similar_content": [
    { "title": "", "platform": "", "url": null, "why_successful": "", "key_differences": "", "hook_score": 0.0 }
  ]
}
```

---

## MVP Scope (v1)

- Video upload only (no URL scraping yet)
- Hook analysis + 3 insights + 3 recommendations minimum
- No social media API integration
- Whisper local model (no external API dependency)
- Pinecone with seed data fallback

---

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Clone and configure

```bash
git clone <repo-url>
cd content-mirror
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Start the full stack

```bash
docker-compose up
```

This starts: PostgreSQL, Redis, FastAPI backend, Celery worker, Next.js frontend.

### 3. Frontend only (dev mode)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 4. Backend only (dev mode)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
```

### 5. Run the AI pipeline directly

```bash
cd ai
pip install -r requirements.txt
python main.py /path/to/video.mp4
```

### 6. Start the Celery worker

```bash
cd backend
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
```

---

## Recommended Development Order

```
Week 1:  Karam → DB + Auth API       | Amr → Pipeline skeleton    | Noor N → Audio analyzer  | Noor A → Image analyzer
Week 2:  Karam → Upload + Queue      | Amr → Insight engine        | Noor N → Whisper module  | Noor A → Benchmark engine
Week 3:  Karam → Frontend core       | Amr → Integration + tests   | Noor N → Insight rules   | Noor A → Vector DB seeding
Week 4:  Karam → Frontend UI polish  | All → Integration testing + bug fixes
```

---

## Team

| Name | Role | Owns |
|------|------|------|
| Karam | Software Engineering | Frontend, Backend API, DevOps, Infrastructure |
| Amr | AI | Pipeline architecture, insight engine, recommendation engine |
| Noor Najjar | AI | Audio analysis, Whisper transcription |
| Noor Adili | AI | Visual analysis, benchmark engine, Pinecone |

---

## Dependency Map

```
Noor Najjar  ──→  defines audio output schema
Noor Adili   ──→  defines visual output schema
                         ↓
Amr  ──→  builds insight engine on top of both schemas
                         ↓
Karam  ──→  wires Amr's run_pipeline() into Celery worker
```
