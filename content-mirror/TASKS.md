# Content Mirror — Team Task Breakdown

## Team
| Member | Role |
|--------|------|
| **Karam** | Software Engineering (Full-Stack, DevOps) |
| **Amr** | AI — Pipeline Architecture & Integration |
| **Nour Alfarraj** | AI — Audio & Speech Analysis |
| **Noor Adili** | AI — Visual Analysis & Benchmarking |

---

## Karam — Software Engineering

### Phase 1: Project Setup & Infrastructure
- [x] Initialize Git repository, set up `.env`, Docker Compose
- [x] Configure PostgreSQL + Alembic migrations
- [x] Configure Redis for Celery queue and caching
- [x] Set up S3/R2 bucket (or local storage fallback) for video uploads
- [x] Write `backend/app/db/database.py` — async SQLAlchemy engine + session factory
- [x] Run first Alembic migration (users + analyses tables)

### Phase 2: Backend API (FastAPI)
- [x] `app/core/config.py` — Pydantic settings with `.env` loading
- [x] `app/core/security.py` — JWT creation, hashing, refresh tokens
- [x] `app/core/dependencies.py` — `get_current_user`, `get_db` deps
- [x] `app/models/user.py` + `app/models/analysis.py` — SQLAlchemy ORM models
- [x] `app/schemas/` — Pydantic request/response schemas
- [x] `app/api/v1/endpoints/auth.py` — `/register`, `/login`, `/refresh`, `/logout`
- [x] `app/api/v1/endpoints/users.py` — `/me`, `/me/usage`, `PATCH /me`
- [x] `app/api/v1/endpoints/analysis.py` — `/upload`, `/status/{id}`, `/result/{id}`, `/history`
- [x] `app/api/v1/endpoints/reports.py` — `/export/pdf/{id}`, `/export/json/{id}`
- [x] `app/services/storage_service.py` — abstract upload/download (local + S3)
- [x] `app/services/queue_service.py` — enqueue analysis jobs via Celery
- [x] `app/workers/analysis_worker.py` — Celery task that calls AI pipeline
- [x] WebSocket endpoint `/ws/{analysis_id}` — real-time progress updates
- [x] Rate limiting middleware (IP-level 120 req/min + per-user monthly quota at endpoint)
- [x] CORS, request logging, error handler middleware

### Phase 3: Frontend (Next.js 14+)
- [x] `app/(auth)/login/page.tsx` + `app/(auth)/signup/page.tsx`
- [x] `app/(dashboard)/layout.tsx` — Sidebar + Navbar layout
- [x] `app/(dashboard)/dashboard/page.tsx` — usage stats, recent analyses
- [x] `app/(dashboard)/analyze/page.tsx` — main upload + analysis UI (incl. `?id=` history loading)
- [x] `app/(dashboard)/history/page.tsx` — paginated analysis history
- [x] `app/(dashboard)/settings/page.tsx` — profile, plan, usage
- [x] `components/analysis/VideoUploader.tsx` — drag-and-drop + URL input + stage-aware progress label
- [x] `components/analysis/AnalysisResults.tsx` — full results display
- [x] `components/analysis/ScoreCard.tsx` — hook/pacing/audio/visual scores
- [x] `components/analysis/WeakSectionsTimeline.tsx` — visual timeline with weak spots
- [x] `components/analysis/RecommendationsPanel.tsx` — actionable improvement cards
- [x] `hooks/useAnalysis.ts` — upload, poll/WebSocket status, fetch results
- [x] `hooks/useAuth.ts` — login, register, token refresh, protected routes
- [x] `lib/api.ts` — typed API client (axios/fetch wrapper)
- [x] Landing page `app/page.tsx` — marketing/hero

### Phase 4: DevOps & Quality
- [x] `backend/Dockerfile` + `frontend/Dockerfile`
- [x] GitHub Actions CI — lint, test, build on PR
- [x] Write backend unit tests (pytest) for auth + analysis endpoints
- [x] Write frontend component tests (Vitest + Testing Library)
- [x] PDF report export (using `weasyprint`)
- [x] Set up Sentry error tracking (frontend + backend)

---

## Amr — AI Pipeline Architecture & Integration

### Phase 1: Pipeline Core
- [x] `ai/main.py` — entry point: load video, run all analyzers, merge + return JSON
- [x] `ai/pipeline/preprocessor.py` — extract frames (0.5s interval), extract audio, normalize resolution
- [x] `ai/pipeline/segmenter.py` — split video into Hook / Body / CTA segments
- [x] `ai/pipeline/feature_extractor.py` — aggregate features per segment

### Phase 2: Insight & Recommendation Engines
- [x] `ai/engine/insight_engine.py`
  - Rule-based reasoning layer (IF hook_score < 4 AND low motion → "Weak Hook")
  - LLM integration (Claude) for natural-language explanations
  - Output: structured `Problem → Cause → Evidence` per insight
- [x] `ai/engine/recommendation_engine.py`
  - Map each detected problem to a specific, actionable fix
  - Generate 3–5 prioritized recommendations
  - Include example wording/scripts where applicable
- [x] `ai/utils/video_utils.py` — frame extraction, scene change detection helpers
- [x] Backend integration: expose AI pipeline as a callable from `analysis_worker.py`
- [x] Write unit tests for insight + recommendation engines
- [x] Prompt engineering: Gemini prompt designed and integrated in insight_engine.py

### Phase 3: Pipeline API Contract
- [x] Define strict JSON schema for pipeline input/output
- [x] Validate output matches schema before returning to backend (`_sanitize`)
- [x] Handle edge cases: very short videos (<5s), audio-only, silent videos

---

## Nour Alfarraj — Audio & Speech Analysis

### Phase 1: Audio Analyzer
- [x] `ai/analyzers/audio_analyzer.py`
  - Extract audio track using `moviepy`
  - RMS energy analysis (volume consistency)
  - Silence ratio detection (pause mapping)
  - SNR approximation (noise estimation)
  - Speech energy detection
  - Classify overall quality: `poor / average / good / excellent`
  - Return: `{ "audio_quality": string, "silence_ratio": float, "snr_db": float }`

### Phase 2: Whisper Transcription
- [x] `ai/analyzers/transcription_analyzer.py` — standalone Whisper transcription module with word-level timestamps, WPM, filler words, hook message detection

### Phase 3: Audio Insight Integration
- [x] Feed audio insights into `insight_engine.py` rules
  - IF silence_ratio > 0.4 → "Too many pauses slow down pacing"
  - IF filler_word_ratio > 0.1 → "High filler words reduce perceived authority"
  - IF hook_message_present == false → "Main message missing from opening"
- [x] Write unit tests for audio analyzer with sample clips
- [x] Document expected input format (audio file path, sample rate) — see AUDIO_README.md

---

## Noor Adili — Visual Analysis & Benchmarking

### Phase 1: Image/Visual Analyzer
- [x] `ai/analyzers/image_analyzer.py`
  - Sample frames across video timeline
  - Sharpness: Laplacian variance per frame
  - Brightness: histogram analysis (over/underexposed detection)
  - Blur: mean Laplacian across sampled frames
  - Camera stability: frame-to-frame difference (motion estimation)
  - Face presence: OpenCV Haar cascade or `face_recognition`
  - Text on screen: detect captions/subtitles presence
  - Classify: `poor / average / good / excellent`
  - Return: `{ "image_quality": string, "sharpness_score": float, "brightness_score": float, "face_detected": bool, "subtitles_detected": bool }`

### Phase 2: Benchmark Engine
- [x] `ai/engine/benchmark_engine.py`
  - Design vector embedding schema for content fingerprinting
  - Extract feature vector per video (topic + structure + pacing + quality scores)
  - Query: find top-3 similar successful videos given new content features (Pinecone + fallback)
  - Return: `{ "similar_content": [{ "title": str, "platform": str, "why_successful": str, "key_differences": str }] }`
- [x] Store & seed successful content embeddings in Pinecone vector DB — see `ai/scripts/seed_pinecone.py` (8 curated records, run once per environment)

### Phase 3: Visual Insight Integration
- [x] Feed visual insights into `insight_engine.py` rules
  - IF face_detected == false AND hook_score < 5 → "No human presence in hook reduces connection"
  - IF sharpness_score < 30 → "Low sharpness signals low production value"
  - IF subtitles_detected == false → "Missing captions reduce accessibility and watch time"
  - IF brightness_score < 20 OR > 235 → "Lighting is too dark/bright, hurts visual quality"
- [x] Write unit tests for image analyzer with sample frames
- [x] `ai/utils/audio_utils.py` — shared audio loading/normalization helpers

---

## Shared / Cross-Team Dependencies

```
Amr depends on:      Nour Alfarraj (audio output schema) + Noor Adili (visual output schema)
Karam depends on:    Amr (final JSON schema from ai/main.py) for worker integration
Frontend depends on: Karam backend API being stable
```

## Recommended Development Order

```
Week 1:  Karam: DB + Auth API  |  Amr: Pipeline skeleton  |  Nour: Audio analyzer  |  Noor A: Image analyzer
Week 2:  Karam: Upload + Queue |  Amr: Insight engine      |  Nour: Whisper module  |  Noor A: Benchmark engine
Week 3:  Karam: Frontend core  |  Amr: Integration + tests |  Nour: Insight rules   |  Noor A: Vector DB seeding
Week 4:  Karam: Frontend UI    |  All: Integration testing  |  Bug fixes + polish
```

---

## Improvements Beyond Original Spec

| # | Improvement | Owner | Priority |
|---|-------------|-------|----------|
| 1 | **Async job queue** (Celery + Redis) — video processing is long-running, must be async | Karam | Critical |
| 2 | **WebSocket progress updates** — real-time analysis progress instead of polling | Karam | High |
| 3 | **Whisper transcription** — extract speech for deeper hook/message analysis | Nour Alfarraj | High |
| 4 | **Face & subtitle detection** — strong engagement signals from visual layer | Noor Adili | High |
| 5 | **PDF report export** — users can share/save analysis reports | Karam | Medium |
| 6 | **JWT refresh tokens** — better auth security than single short-lived tokens | Karam | Medium |
| 7 | **Probability language in insights** — never claim certainty ("likely", "strong signal suggests") | Amr | Medium |
| 8 | **Content type auto-detection** — classify niche (fitness, tech, lifestyle) for better benchmarking | Noor Adili | Medium |
| 9 | **Arabic/English UI** — i18n support (team + likely user base) | Karam | Low |
| 10 | **Filler word detection** — "um", "uh" frequency signals speech quality | Nour Alfarraj | Low |
