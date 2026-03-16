# DirectorOS — AI-Native Creative Operating System for Filmmaking

## Overview

pnpm workspace monorepo using TypeScript. DirectorOS is a frontend orchestration layer for filmmaking that connects to local AI tools via APIs. Complete end-to-end pipeline: User Idea → LLM Provider (LM Studio or ChatGPT) → Storyboard → ComfyUI (Image Generation) → ComfyUI/Wan2GP (Video Generation) → Timeline → FFmpeg (Export).

## Architecture

DirectorOS uses a **multi-provider LLM system** with pluggable providers and a **GPU-aware job scheduler** for safe resource management:

### LLM Provider System
- `services/llm/llm-provider.ts` — Provider interface (chat, streamChat, checkConnection)
- `services/llm/providers/lmstudio-provider.ts` — LM Studio implementation
- `services/llm/providers/openai-provider.ts` — OpenAI/ChatGPT implementation
- `services/llm/llm-service.ts` — Router: `getLLMProvider()` resolves active provider based on config
- Provider selection: "auto" (OpenAI if key set, else LM Studio), "lmstudio", or "openai"

### Service Connectors
- **Image Connector** → ComfyUI (REST API at localhost:8188, workflow-based)
- **Video Connector** → Wan2GP running as ComfyUI custom nodes (workflow JSON files in `workflows/`)
- **Render Connector** → FFmpeg for timeline export + automatic video format conversion

### GPU Task Scheduler
- `services/job-queue/gpu-scheduler.ts` — Tracks GPU state, prevents VRAM exhaustion
- Job GPU classification: IMAGE (low GPU), VIDEO (high GPU), RENDER (none/CPU)
- Worker checks `canProcessJob()` before claiming — GPU-heavy jobs wait if GPU is busy
- CPU-only jobs (render) always process regardless of GPU state

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + wouter + React Query + Framer Motion + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (24 tables including clips, generation jobs, evaluation results)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## External AI Services

- **LM Studio** (localhost:1234): Local LLM for AI Director reasoning. OpenAI-compatible `/v1/chat/completions` API with streaming support.
- **OpenAI/ChatGPT** (api.openai.com): Cloud LLM alternative. Same interface as LM Studio via provider abstraction.
- **ComfyUI** (localhost:8188): Image generation via SDXL workflows + Wan2GP video generation via custom nodes. Submits workflow JSON to `/prompt`, polls `/history/{id}` for completion.
- **FFmpeg** (v6.1.2): Timeline rendering, automatic WEBP/GIF → MP4 conversion, final export.

## Design System

- Dark cinematic professional aesthetic — deep blacks, blue-purple accent tones, film production studio feel
- Font: Inter for body, display font for headings
- Glass-panel effects, backdrop blur, subtle gradients
- Sidebar context-aware: shows Home + Settings globally, expands to all 7 module icons inside a project

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/
│   │   ├── workflows/                       # ComfyUI workflow JSON files
│   │   │   ├── wan_image_to_video.json     # Wan2GP image-to-video workflow
│   │   │   ├── wan_text_to_video.json      # Wan2GP text-to-video workflow
│   │   │   └── sdxl_image.json             # SDXL image generation workflow
│   │   └── src/
│   │       ├── config/
│   │       │   └── ai-services.ts          # Dynamic config with llmProvider routing
│   │       ├── services/
│   │       │   ├── director-agent.ts       # AI Director (uses LLM provider system)
│   │       │   ├── llm/
│   │       │   │   ├── llm-provider.ts     # LLMProvider interface
│   │       │   │   ├── llm-service.ts      # Provider router (getLLMProvider)
│   │       │   │   └── providers/
│   │       │   │       ├── lmstudio-provider.ts
│   │       │   │       └── openai-provider.ts
│   │       │   ├── connectors/
│   │       │   │   ├── index.ts            # Health checks (uses LLM providers)
│   │       │   │   ├── image-connector.ts  # ComfyUI image generation
│   │       │   │   ├── video-connector.ts  # ComfyUI/Wan2GP video + auto MP4 conversion
│   │       │   │   └── render-connector.ts # FFmpeg timeline export
│   │       │   ├── job-queue/
│   │       │   │   ├── queue.ts            # enqueueJob, enqueueImageJob, enqueueVideoJob
│   │       │   │   ├── worker.ts           # GPU-aware background worker
│   │       │   │   ├── gpu-scheduler.ts    # GPU state tracking and job scheduling
│   │       │   │   └── job-types.ts        # Job type constants and payload interfaces
│   │       │   ├── evaluation/
│   │       │   │   └── evaluator.ts        # AI quality scoring (uses LLM provider)
│   │       │   └── clips/
│   │       │       ├── clip-manager.ts     # CRUD for reusable clip library
│   │       │       └── clip-loader.ts      # Timeline clip management
│   │       └── routes/
│   │           ├── director.ts             # SSE streaming chat + storyboard generation
│   │           ├── generate-image.ts       # Queues image generation job
│   │           ├── generate-video.ts       # Queues video generation job
│   │           ├── export.ts               # Queues render job
│   │           ├── clips.ts               # Clip library CRUD + sync from assets
│   │           ├── generation-jobs.ts      # Job listing, status polling
│   │           ├── services.ts             # Service health + GPU status APIs
│   │           └── settings.ts            # Settings CRUD with llmProvider support
│   └── director-os/                        # React+Vite frontend (root path /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection (24 tables)
```

## Database Tables (24)

User, Project, ProjectProfile, Scene, Shot, StoryboardFrame, Asset, AssetVersion, PromptVersion, GenerationJob, EvaluationResult, ContinuityProfile, CharacterProfile, StyleProfile, VFXPlacement, TimelineSequence, TimelineClip, AudioCue, UserActionEvent, PreferenceSignal, Conversation, Message, Clip, Setting

DB uses snake_case columns. API schema maps to camelCase:
- `thumbnailUri` → `thumbnailUrl`
- `cameraIntentJson` → `cameraIntent`
- `motionIntentJson` → `motionIntent`

## Frontend Pages

- `/` — Project Browser with project cards, New Project dialog
- `/projects/:id/director` — AI Director SSE streaming chat (via LLM provider) with Creative Intent panel
- `/projects/:id/storyboard` — Storyboard Timeline: editable shot cards, inline edit panel, batch image generation (ComfyUI) with SSE progress
- `/projects/:id/image-studio/:shotId` — Shot-specific image generation via ComfyUI: pre-populated prompt, generate/regenerate, variants
- `/projects/:id/editor` — NLE-style timeline: draggable clip durations, transport controls, V1 video + A1 audio tracks, Clip Library sidebar with asset browser
- `/projects/:id/video-studio/:shotId` — Per-shot video generation via Wan2GP (ComfyUI): local model selector, camera motion, VFX layer
- `/projects/:id/audio` — Audio Studio (placeholder)
- `/settings` — AI Services: LLM provider selector, GPU scheduler status, editable config, connection tests, pipeline diagram, setup guide

## API Routes

All mounted under `/api`:
- `GET/POST /projects`, `GET/PATCH/DELETE /projects/:projectId`
- `GET/POST /projects/:projectId/scenes`, `PATCH/DELETE /scenes/:id`
- `GET/POST /scenes/:sceneId/shots`, `PATCH/DELETE /shots/:id`
- `POST /projects/:projectId/assets`, `GET /assets/:id`
- `POST /projects/:projectId/director/chat` — SSE streaming AI chat (LLM provider)
- `POST /projects/:projectId/director/generate-storyboard` — AI storyboard generation (LLM provider)
- `GET /generation-jobs` — Global job listing with status filter
- `GET /generation-jobs/:jobId` — Single job with evaluations
- `GET /projects/:projectId/generation-jobs` — Project-scoped job listing
- `POST /shots/:shotId/generate-image` — Queue image generation job
- `POST /projects/:projectId/generate-all-images` — Queue batch image generation
- `POST /shots/:shotId/generate-video-prompt` — AI video prompt transformer (LLM provider)
- `POST /shots/:shotId/generate-video` — Queue video generation job
- `POST /projects/:projectId/export` — Queue render job
- `GET /projects/:projectId/clips` — List project clips
- `POST /projects/:projectId/clips` — Create clip
- `POST /projects/:projectId/clips/sync` — Auto-create clips from existing assets
- `DELETE /clips/:clipId` — Delete clip
- `GET /services/status` — All service health checks + active LLM info
- `GET /services/gpu` — GPU scheduler status (busy/idle, current job)
- `POST /services/test/:serviceName` — Test individual service connection
- `GET /settings` — Get all service settings (includes llmProvider)
- `PUT /settings` — Save service settings (persisted in DB, includes llmProvider)

## Environment Variables

- `LLM_PROVIDER` — LLM provider selection: "auto", "lmstudio", "openai" (default: "auto")
- `LMSTUDIO_URL` — LM Studio endpoint (default: `http://localhost:1234`)
- `LMSTUDIO_MODEL` — LM Studio model name
- `COMFYUI_URL` — ComfyUI endpoint (default: `http://localhost:8188`)
- `FFMPEG_PATH` — FFmpeg binary path (default: `ffmpeg`)
- `OPENAI_API_KEY` — OpenAI API key (optional, for ChatGPT integration)
- `OPENAI_BASE_URL` — OpenAI API base URL (default: `https://api.openai.com`)
- `OPENAI_MODEL` — OpenAI model name (default: `gpt-4o-mini`)
- All settings can be overridden via the Settings UI (stored in DB `settings` table)

## Image/Video Pipeline

- Images stored at: `artifacts/director-os/public/generated/shot_{id}_{timestamp}.png`
- Videos stored at: `artifacts/director-os/public/generated/video_{id}_{timestamp}.mp4` (auto-converted from WEBP/GIF)
- Exports stored at: `artifacts/director-os/public/exports/{project_name}_{timestamp}.mp4`
- Shot status progression: `empty` → `has_frame` → `has_video` → `approved`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Job Queue Architecture

All AI generation goes through the job queue — routes never call connectors directly.

Flow: API Route → `enqueueJob()` → DB (status: pending) → Worker polls → GPU Scheduler check → Connector → Evaluate → Update status

- Worker polls every 3 seconds, checks GPU availability before claiming GPU-intensive jobs
- GPU scheduler classifies: IMAGE=low GPU, VIDEO=high GPU, RENDER=no GPU
- GPU-heavy jobs wait if GPU is busy; CPU jobs always process
- Jobs support retry (configurable `maxRetries`, default 1 for generation, 0 for render)
- After image/video generation, the evaluator scores quality (0-100)
- If overall score < 70, the evaluator auto-enqueues a regeneration job
- Evaluation scores stored in `evaluation_results` table with sub-scores (promptMatch, composition, quality)
- Job status: `pending` → `processing` → `completed` | `failed`

## Video Generation (Wan2GP via ComfyUI)

Video generation uses ComfyUI workflow files (not standalone Gradio API):
1. Upload source image to ComfyUI via `/upload/image`
2. Load workflow template from `workflows/wan_image_to_video.json`
3. Inject parameters (prompt, dimensions, frames, seed, motion strength)
4. Submit workflow to ComfyUI via `/prompt`
5. Poll `/history/{prompt_id}` for completion
6. Download output file
7. Auto-convert non-MP4 formats (WEBP, GIF) to MP4 via FFmpeg

## Clip Library

Reusable asset library that bridges generated assets and the timeline:
- Clips are auto-created from assets via `/clips/sync` endpoint
- Clip Library panel in Timeline Editor sidebar shows images, videos, and audio categorized
- Clips are draggable from the library panel

## UI Components

- **JobStatusPanel**: Fixed bottom-right panel showing all active/recent generation jobs with real-time polling (3s interval). Shows job type, shot reference, status, and error messages. Collapsible and minimizable.

## Build Status

- Foundation: COMPLETE — 24 DB tables, all API routes, 9 frontend pages
- AI Director: COMPLETE — SSE streaming chat via LLM provider system, AI storyboard generation
- Multi-Provider LLM: COMPLETE — Pluggable provider interface, LM Studio + OpenAI implementations, auto/manual selection
- Pipeline UX: COMPLETE — Storyboard, Image Studio, Timeline Editor (with Clip Library), Video Studio
- External Integrations: COMPLETE — ComfyUI (images + Wan2GP video), FFmpeg, LLM providers
- GPU Scheduler: COMPLETE — GPU-aware job scheduling, prevents VRAM exhaustion
- Auto Video Conversion: COMPLETE — WEBP/GIF → MP4 via FFmpeg after video generation
- Settings UI: COMPLETE — LLM provider selector, GPU status, editable config, connection tests, setup guide
- Job Queue: COMPLETE — Background worker, retry logic, GPU scheduling, all routes queue instead of direct calls
- AI Evaluation: COMPLETE — Quality scoring via LLM, auto-regeneration below threshold
- Clip Library: COMPLETE — Asset-to-clip sync, categorized browser in Editor sidebar
