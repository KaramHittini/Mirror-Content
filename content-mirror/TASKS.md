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
- [ ] Initialize Git repository, set up `.env`, Docker Compose
- [ ] Configure PostgreSQL + Alembic migrations
- [ ] Configure Redis for Celery queue and caching
- [ ] Set up S3/R2 bucket (or local storage fallback) for video uploads
- [ ] Write `backend/app/db/database.py` — async SQLAlchemy engine + session factory
- [ ] Run first Alembic migration (users + analyses tables)

### Phase 2: Backend API (FastAPI)
- [ ] `app/core/config.py` — Pydantic settings with `.env` loading
- [ ] `app/core/security.py` — JWT creation, hashing, refresh tokens
- [ ] `app/core/dependencies.py` — `get_current_user`, `get_db` deps
- [ ] `app/models/user.py` + `app/models/analysis.py` — SQLAlchemy ORM models
- [ ] `app/schemas/` — Pydantic request/response schemas
- [ ] `app/api/v1/endpoints/auth.py` — `/register`, `/login`, `/refresh`, `/logout`
- [ ] `app/api/v1/endpoints/users.py` — `/me`, `/me/usage`
- [ ] `app/api/v1/endpoints/analysis.py` — `/upload`, `/status/{id}`, `/result/{id}`, `/history`
- [ ] `app/api/v1/endpoints/reports.py` — `/export/pdf/{id}`, `/export/json/{id}`
- [ ] `app/services/storage_service.py` — abstract upload/download (local + S3)
- [ ] `app/services/queue_service.py` — enqueue analysis jobs via Celery
- [ ] `app/workers/analysis_worker.py` — Celery task that calls AI pipeline
- [ ] WebSocket endpoint `/ws/{analysis_id}` — real-time progress updates
- [ ] Rate limiting middleware (free: 5/month, pro: 100/month)
- [ ] CORS, request logging, error handler middleware

### Phase 3: Frontend (Next.js 14+)
- [ ] `app/(auth)/login/page.tsx` + `app/(auth)/signup/page.tsx`
- [ ] `app/(dashboard)/layout.tsx` — Sidebar + Navbar layout
- [ ] `app/(dashboard)/dashboard/page.tsx` — usage stats, recent analyses
- [ ] `app/(dashboard)/analyze/page.tsx` — main upload + analysis UI
- [ ] `app/(dashboard)/history/page.tsx` — paginated analysis history
- [ ] `app/(dashboard)/settings/page.tsx` — profile, plan, API keys
- [ ] `components/analysis/VideoUploader.tsx` — drag-and-drop + URL input
- [ ] `components/analysis/AnalysisResults.tsx` — full results display
- [ ] `components/analysis/ScoreCard.tsx` — hook/pacing/audio/visual scores
- [ ] `components/analysis/WeakSectionsTimeline.tsx` — visual timeline with weak spots
- [ ] `components/analysis/RecommendationsPanel.tsx` — actionable improvement cards
- [ ] `hooks/useAnalysis.ts` — upload, poll/WebSocket status, fetch results
- [ ] `hooks/useAuth.ts` — login, register, token refresh, protected routes
- [ ] `lib/api.ts` — typed API client (axios/fetch wrapper)
- [ ] Landing page `app/page.tsx` — marketing/hero

### Phase 4: DevOps & Quality
- [ ] `backend/Dockerfile` + `frontend/Dockerfile`
- [ ] GitHub Actions CI — lint, test, build on PR
- [ ] Write backend unit tests (pytest) for auth + analysis endpoints
- [ ] Write frontend component tests (Vitest + Testing Library)
- [ ] PDF report export (using `reportlab` or `weasyprint`)
- [ ] Set up Sentry error tracking (frontend + backend)

---

## Amr — AI Pipeline Architecture & Integration

### Phase 1: Pipeline Core
- [ ] `ai/main.py` — entry point: load video, run all analyzers, merge + return JSON
- [ ] `ai/pipeline/preprocessor.py` — extract frames (0.5s interval), extract audio, normalize resolution
- [ ] `ai/pipeline/segmenter.py` — split video into Hook / Body / CTA segments
- [ ] `ai/pipeline/feature_extractor.py` — aggregate features per segment

### Phase 2: Insight & Recommendation Engines
- [ ] `ai/engine/insight_engine.py`
  - Rule-based reasoning layer (IF hook_score < 4 AND low motion → "Weak Hook")
  - LLM integration (Claude) for natural-language explanations
  - Output: structured `Problem → Cause → Evidence` per insight
- [ ] `ai/engine/recommendation_engine.py`
  - Map each detected problem to a specific, actionable fix
  - Generate 3–5 prioritized recommendations
  - Include example wording/scripts where applicable
- [ ] `ai/utils/video_utils.py` — frame extraction, scene change detection helpers
- [ ] Backend integration: expose AI pipeline as a callable from `analysis_worker.py`
- [ ] Write unit tests for insight + recommendation engines
- [ ] Prompt engineering: design and iterate Claude system prompts for explanation quality

### Phase 3: Pipeline API Contract
- [ ] Define strict JSON schema for pipeline input/output
- [ ] Validate output matches schema before returning to backend
- [ ] Handle edge cases: very short videos (<5s), audio-only, silent videos

---

## Nour Alfarraj — Audio & Speech Analysis

### Phase 1: Audio Analyzer
- [ ] `ai/analyzers/audio_analyzer.py`
  - Extract audio track using `moviepy`
  - RMS energy analysis (volume consistency)
  - Silence ratio detection (pause mapping)
  - SNR approximation (noise estimation)
  - Speech energy detection
  - Classify overall quality: `poor / average / good / excellent`
  - Return: `{ "audio_quality": string, "silence_ratio": float, "snr_db": float }`

### Phase 2: Whisper Transcription
- [ ] `ai/analyzers/transcription_analyzer.py`
  - Integrate OpenAI Whisper (local model or API)
  - Extract full transcript with word-level timestamps
  - Detect: speech clarity, filler words (`um`, `uh`, `like`), speaking pace (WPM)
  - Identify key message clarity (is the main idea stated in first 5 seconds?)
  - Return: `{ "transcript": string, "wpm": int, "filler_word_ratio": float, "hook_message_present": bool }`

### Phase 3: Audio Insight Integration
- [ ] Feed audio insights into `insight_engine.py` rules
  - IF silence_ratio > 0.4 → "Too many pauses slow down pacing"
  - IF filler_word_ratio > 0.1 → "High filler words reduce perceived authority"
  - IF hook_message_present == false → "Main message missing from opening"
- [ ] Write unit tests for audio analyzer with sample clips
- [ ] Document expected input format (audio file path, sample rate)

---

## Noor Adili — Visual Analysis & Benchmarking

### Phase 1: Image/Visual Analyzer
- [ ] `ai/analyzers/image_analyzer.py`
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
- [ ] `ai/engine/benchmark_engine.py`
  - Design vector embedding schema for content fingerprinting
  - Extract feature vector per video (topic + structure + pacing + quality scores)
  - Store successful content embeddings in Pinecone vector DB
  - Query: find top-3 similar successful videos given new content features
  - Return: `{ "similar_content": [{ "title": str, "platform": str, "why_successful": str, "key_differences": str }] }`

### Phase 3: Visual Insight Integration
- [ ] Feed visual insights into `insight_engine.py` rules
  - IF face_detected == false AND hook_score < 5 → "No human presence in hook reduces connection"
  - IF sharpness_score < 30 → "Low sharpness signals low production value"
  - IF subtitles_detected == false → "Missing captions reduce accessibility and watch time"
  - IF brightness_score < 20 OR > 235 → "Lighting is too dark/bright, hurts visual quality"
- [ ] Seed vector DB with sample successful content (manual curation for MVP)
- [ ] Write unit tests for image analyzer with sample frames
- [ ] `ai/utils/audio_utils.py` — shared audio loading/normalization helpers

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
