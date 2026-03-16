# DirectorOS — AI-Native Creative Operating System for Filmmaking

## Overview

pnpm workspace monorepo using TypeScript. DirectorOS is a frontend orchestration layer for filmmaking that connects to local AI tools via APIs. Complete end-to-end pipeline: User Idea → LM Studio or ChatGPT (AI Director) → Storyboard → ComfyUI (Image Generation) → Wan2 (Video Generation) → Timeline → FFmpeg (Export).

## Architecture

DirectorOS never hardcodes model providers. It uses service connectors with dynamic config (persisted in DB `settings` table, fallback to env vars):
- **LLM Connector** → LM Studio (OpenAI-compatible API at localhost:1234)
- **OpenAI Connector** → ChatGPT / OpenAI (cloud API at api.openai.com, configurable)
- **Image Connector** → ComfyUI (REST API at localhost:8188)
- **Video Connector** → Wan2GP (Gradio API at localhost:7860, github.com/deepbeepmeep/Wan2GP)
- **Render Connector** → FFmpeg for timeline export

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + wouter + React Query + Framer Motion + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (23 tables including clips, generation jobs, evaluation results)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## External AI Services

- **LM Studio** (localhost:1234): Local LLM for AI Director reasoning, scene planning, shot planning, prompt creation, video prompt optimization. OpenAI-compatible `/v1/chat/completions` API with streaming support.
- **ComfyUI** (localhost:8188): Image generation via Stable Diffusion workflows. Submits workflow JSON to `/prompt`, polls `/history/{id}` for completion, downloads via `/view`.
- **Wan2GP** (localhost:7860): Video generation from images via Gradio API (github.com/deepbeepmeep/Wan2GP). Uploads source image, submits generation via queue/join, polls SSE for completion, downloads result video.
- **FFmpeg** (v6.1.2): Timeline rendering — converts image sequences + audio into final MP4.

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
│   │   └── src/
│   │       ├── config/
│   │       │   └── ai-services.ts          # Service URLs and config
│   │       ├── services/
│   │       │   ├── director-agent.ts       # AI Director (uses LLM connector)
│   │       │   ├── connectors/
│   │       │   │   ├── index.ts            # Central connector registry + health checks
│   │       │   │   ├── llm-connector.ts    # LM Studio integration (chat + streaming)
│   │       │   │   ├── image-connector.ts  # ComfyUI integration (workflow submission + polling)
│   │       │   │   ├── video-connector.ts  # Wan2GP integration (video via Gradio API)
│   │       │   │   ├── openai-connector.ts # ChatGPT/OpenAI integration (cloud LLM)
│   │       │   │   └── render-connector.ts # FFmpeg integration (timeline export)
│   │       │   ├── job-queue/
│   │       │   │   ├── queue.ts            # enqueueJob, enqueueImageJob, enqueueVideoJob, enqueueRenderJob
│   │       │   │   ├── worker.ts           # Background polling worker (processes pending jobs)
│   │       │   │   └── job-types.ts        # Job type constants and payload interfaces
│   │       │   ├── evaluation/
│   │       │   │   └── evaluator.ts        # AI quality scoring (prompt match, composition, quality)
│   │       │   └── clips/
│   │       │       ├── clip-manager.ts     # CRUD for reusable clip library
│   │       │       └── clip-loader.ts      # Timeline clip management
│   │       └── routes/
│   │           ├── director.ts             # SSE streaming chat + storyboard generation
│   │           ├── generate-image.ts       # Queues image generation job (via job queue)
│   │           ├── generate-video.ts       # Queues video generation job (via job queue)
│   │           ├── export.ts               # Queues render job (via job queue)
│   │           ├── clips.ts               # Clip library CRUD + sync from assets
│   │           ├── generation-jobs.ts      # Job listing, status polling
│   │           ├── services.ts             # Service health check API
│   │           └── settings.ts            # Settings CRUD (persisted in DB)
│   └── director-os/                        # React+Vite frontend (root path /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection (22 tables)
```

## Database Tables (24)

User, Project, ProjectProfile, Scene, Shot, StoryboardFrame, Asset, AssetVersion, PromptVersion, GenerationJob, EvaluationResult, ContinuityProfile, CharacterProfile, StyleProfile, VFXPlacement, TimelineSequence, TimelineClip, AudioCue, UserActionEvent, PreferenceSignal, Conversation, Message, Clip, Setting

DB uses snake_case columns. API schema maps to camelCase:
- `thumbnailUri` → `thumbnailUrl`
- `cameraIntentJson` → `cameraIntent`
- `motionIntentJson` → `motionIntent`

## Frontend Pages

- `/` — Project Browser with project cards, New Project dialog
- `/projects/:id/director` — AI Director SSE streaming chat (via LM Studio) with Creative Intent panel
- `/projects/:id/storyboard` — Storyboard Timeline: editable shot cards, inline edit panel, batch image generation (ComfyUI) with SSE progress
- `/projects/:id/image-studio/:shotId` — Shot-specific image generation via ComfyUI: pre-populated prompt, generate/regenerate, variants
- `/projects/:id/editor` — NLE-style timeline: draggable clip durations, transport controls, V1 video + A1 audio tracks, Clip Library sidebar with asset browser
- `/projects/:id/video-studio/:shotId` — Per-shot video generation via Wan2: AI prompt transformer, camera motion, VFX layer
- `/projects/:id/audio` — Audio Studio (placeholder)
- `/settings` — AI Services panel: editable config fields (URLs, model names, paths) with save to DB, connection status, test buttons, pipeline diagram, setup guide

## API Routes

All mounted under `/api`:
- `GET/POST /projects`, `GET/PATCH/DELETE /projects/:projectId`
- `GET/POST /projects/:projectId/scenes`, `PATCH/DELETE /scenes/:id`
- `GET/POST /scenes/:sceneId/shots`, `PATCH/DELETE /shots/:id`
- `POST /projects/:projectId/assets`, `GET /assets/:id`
- `POST /projects/:projectId/director/chat` — SSE streaming AI chat (LM Studio)
- `POST /projects/:projectId/director/generate-storyboard` — AI storyboard generation (LM Studio)
- `GET /generation-jobs` — Global job listing with status filter
- `GET /generation-jobs/:jobId` — Single job with evaluations
- `GET /projects/:projectId/generation-jobs` — Project-scoped job listing
- `POST /shots/:shotId/generate-image` — Queue image generation job
- `POST /projects/:projectId/generate-all-images` — Queue batch image generation
- `POST /shots/:shotId/generate-video-prompt` — AI video prompt transformer (LM Studio)
- `POST /shots/:shotId/generate-video` — Queue video generation job
- `POST /projects/:projectId/export` — Queue render job
- `GET /projects/:projectId/clips` — List project clips
- `POST /projects/:projectId/clips` — Create clip
- `POST /projects/:projectId/clips/sync` — Auto-create clips from existing assets
- `DELETE /clips/:clipId` — Delete clip
- `GET /services/status` — All service health checks
- `POST /services/test/:serviceName` — Test individual service connection
- `GET /settings` — Get all service settings
- `PUT /settings` — Save service settings (persisted in DB)

## Environment Variables

- `LMSTUDIO_URL` — LM Studio endpoint (default: `http://localhost:1234`)
- `LMSTUDIO_MODEL` — LM Studio model name
- `COMFYUI_URL` — ComfyUI endpoint (default: `http://localhost:8188`)
- `WAN2GP_URL` — Wan2GP endpoint (default: `http://localhost:7860`)
- `FFMPEG_PATH` — FFmpeg binary path (default: `ffmpeg`)
- `OPENAI_API_KEY` — OpenAI API key (optional, for ChatGPT integration)
- `OPENAI_BASE_URL` — OpenAI API base URL (default: `https://api.openai.com`)
- `OPENAI_MODEL` — OpenAI model name (default: `gpt-4o-mini`)
- All settings can be overridden via the Settings UI (stored in DB `settings` table)

## Image/Video Pipeline

- Images stored at: `artifacts/director-os/public/generated/shot_{id}_{timestamp}.png`
- Videos stored at: `artifacts/director-os/public/generated/video_{id}_{timestamp}.webp`
- Exports stored at: `artifacts/director-os/public/exports/{project_name}_{timestamp}.mp4`
- Shot status progression: `empty` → `has_frame` → `has_video` → `approved`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Job Queue Architecture

All AI generation goes through the job queue — routes never call connectors directly.

Flow: API Route → `enqueueJob()` → DB (status: pending) → Worker polls → Connector → Evaluate → Update status

- Worker polls every 3 seconds, processes one job at a time
- Jobs support retry (configurable `maxRetries`, default 1 for generation, 0 for render)
- After image/video generation, the evaluator scores quality (0-100)
- If overall score < 70, the evaluator auto-enqueues a regeneration job
- Evaluation scores stored in `evaluation_results` table with sub-scores (promptMatch, composition, quality)
- Job status: `pending` → `processing` → `completed` | `failed`

## Clip Library

Reusable asset library that bridges generated assets and the timeline:
- Clips are auto-created from assets via `/clips/sync` endpoint
- Clip Library panel in Timeline Editor sidebar shows images, videos, and audio categorized
- Clips are draggable from the library panel

## UI Components

- **JobStatusPanel**: Fixed bottom-right panel showing all active/recent generation jobs with real-time polling (3s interval). Shows job type, shot reference, status, and error messages. Collapsible and minimizable.

## Build Status

- Foundation: COMPLETE — 23 DB tables, all API routes, 9 frontend pages
- AI Director: COMPLETE — SSE streaming chat via LM Studio connector, AI storyboard generation
- Pipeline UX: COMPLETE — Storyboard, Image Studio, Timeline Editor (with Clip Library), Video Studio
- External Integrations: COMPLETE — LM Studio, ComfyUI, Wan2, FFmpeg connectors with service health checks
- Settings UI: COMPLETE — AI Services panel with editable config fields, DB persistence, connection status, test buttons, setup guide
- Job Queue: COMPLETE — Background worker, retry logic, all routes queue instead of direct calls
- AI Evaluation: COMPLETE — Quality scoring via LLM, auto-regeneration below threshold
- Clip Library: COMPLETE — Asset-to-clip sync, categorized browser in Editor sidebar
