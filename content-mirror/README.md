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
| AI Insights | Rule-based + Gemini LLM explanations for every detected problem |
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
| Google Gemini | LLM insight generation (`gemini-2.0-flash`) |
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
    │   ├── insight_engine.py           ← Rules + Gemini → Problem/Cause/Evidence
    │   ├── recommendation_engine.py    ← Maps insights → actionable fixes
    │   └── benchmark_engine.py         ← Pinecone similarity search
    └── utils/
        ├── video_utils.py              ← Frame extraction, duration helpers
        └── audio_utils.py              ← Audio loading, normalization helpers
```

---

## Task Breakdown

See [TASKS.md](TASKS.md) for the full per-member task checklist with completion status.

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
Week 1:  Karam → DB + Auth API       | Amr → Pipeline skeleton    | Nour → Audio analyzer  | Noor A → Image analyzer
Week 2:  Karam → Upload + Queue      | Amr → Insight engine        | Nour → Whisper module  | Noor A → Benchmark engine
Week 3:  Karam → Frontend core       | Amr → Integration + tests   | Nour → Insight rules   | Noor A → Vector DB seeding
Week 4:  Karam → Frontend UI polish  | All → Integration testing + bug fixes
```

---

## Team

| Name | Role | Owns |
|------|------|------|
| Karam | Software Engineering | Frontend, Backend API, DevOps, Infrastructure |
| Amr | AI | Pipeline architecture, insight engine, recommendation engine |
| Nour Alfarraj | AI | Audio analysis, Whisper transcription |
| Noor Adili | AI | Visual analysis, benchmark engine, Pinecone |

---

## Dependency Map

```
Nour Alfarraj  ──→  defines audio output schema
Noor Adili   ──→  defines visual output schema
                         ↓
Amr  ──→  builds insight engine on top of both schemas
                         ↓
Karam  ──→  wires Amr's run_pipeline() into Celery worker
```
