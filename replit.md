# DirectorOS — AI-Native Creative Operating System for Filmmaking

## Overview

pnpm workspace monorepo using TypeScript. DirectorOS is a frontend orchestration layer for filmmaking that connects to local AI tools via APIs. Complete end-to-end pipeline: User Idea → LM Studio (AI Director) → Storyboard → ComfyUI (Image Generation) → Wan2 (Video Generation) → Timeline → FFmpeg (Export).

## Architecture

DirectorOS never hardcodes model providers. It uses service connectors:
- **LLM Connector** → LM Studio (OpenAI-compatible API at localhost:1234)
- **Image Connector** → ComfyUI (REST API at localhost:8188)
- **Video Connector** → Wan2 via ComfyUI workflows
- **Render Connector** → FFmpeg for timeline export

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + wouter + React Query + Framer Motion + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (22 tables including conversations + messages)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## External AI Services

- **LM Studio** (localhost:1234): Local LLM for AI Director reasoning, scene planning, shot planning, prompt creation, video prompt optimization. OpenAI-compatible `/v1/chat/completions` API with streaming support.
- **ComfyUI** (localhost:8188): Image generation via Stable Diffusion workflows. Submits workflow JSON to `/prompt`, polls `/history/{id}` for completion, downloads via `/view`.
- **Wan2**: Video generation from images via ComfyUI workflows. Uses WanVideoSampler node.
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
│   │       │   └── connectors/
│   │       │       ├── index.ts            # Central connector registry + health checks
│   │       │       ├── llm-connector.ts    # LM Studio integration (chat + streaming)
│   │       │       ├── image-connector.ts  # ComfyUI integration (workflow submission + polling)
│   │       │       ├── video-connector.ts  # Wan2 integration (video via ComfyUI)
│   │       │       └── render-connector.ts # FFmpeg integration (timeline export)
│   │       └── routes/
│   │           ├── director.ts             # SSE streaming chat + storyboard generation
│   │           ├── generate-image.ts       # Single + batch image generation via ComfyUI
│   │           ├── generate-video.ts       # Video generation via Wan2
│   │           ├── export.ts               # FFmpeg timeline export
│   │           └── services.ts             # Service health check API
│   └── director-os/                        # React+Vite frontend (root path /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection (22 tables)
```

## Database Tables (22)

User, Project, ProjectProfile, Scene, Shot, StoryboardFrame, Asset, AssetVersion, PromptVersion, GenerationJob, EvaluationResult, ContinuityProfile, CharacterProfile, StyleProfile, VFXPlacement, TimelineSequence, TimelineClip, AudioCue, UserActionEvent, PreferenceSignal, Conversation, Message

DB uses snake_case columns. API schema maps to camelCase:
- `thumbnailUri` → `thumbnailUrl`
- `cameraIntentJson` → `cameraIntent`
- `motionIntentJson` → `motionIntent`

## Frontend Pages

- `/` — Project Browser with project cards, New Project dialog
- `/projects/:id/director` — AI Director SSE streaming chat (via LM Studio) with Creative Intent panel
- `/projects/:id/storyboard` — Storyboard Timeline: editable shot cards, inline edit panel, batch image generation (ComfyUI) with SSE progress
- `/projects/:id/image-studio/:shotId` — Shot-specific image generation via ComfyUI: pre-populated prompt, generate/regenerate, variants
- `/projects/:id/editor` — NLE-style timeline: draggable clip durations, transport controls, V1 video + A1 audio tracks
- `/projects/:id/video-studio/:shotId` — Per-shot video generation via Wan2: AI prompt transformer, camera motion, VFX layer
- `/projects/:id/audio` — Audio Studio (placeholder)
- `/settings` — AI Services panel: connection status for all 4 services, test buttons, pipeline architecture diagram

## API Routes

All mounted under `/api`:
- `GET/POST /projects`, `GET/PATCH/DELETE /projects/:projectId`
- `GET/POST /projects/:projectId/scenes`, `PATCH/DELETE /scenes/:id`
- `GET/POST /scenes/:sceneId/shots`, `PATCH/DELETE /shots/:id`
- `POST /projects/:projectId/assets`, `GET /assets/:id`
- `POST /projects/:projectId/director/chat` — SSE streaming AI chat (LM Studio)
- `POST /projects/:projectId/director/generate-storyboard` — AI storyboard generation (LM Studio)
- `POST /generation-jobs`, `GET /generation-jobs/:id`
- `POST /shots/:shotId/generate-image` — Single shot image generation (ComfyUI)
- `POST /projects/:projectId/generate-all-images` — SSE batch image generation (ComfyUI)
- `POST /shots/:shotId/generate-video-prompt` — AI video prompt transformer (LM Studio)
- `POST /shots/:shotId/generate-video` — Video generation from image (Wan2 via ComfyUI)
- `POST /projects/:projectId/export` — FFmpeg timeline render to MP4
- `GET /services/status` — All service health checks
- `POST /services/test/:serviceName` — Test individual service connection

## Environment Variables

- `LMSTUDIO_URL` — LM Studio endpoint (default: `http://localhost:1234`)
- `LMSTUDIO_MODEL` — LM Studio model name (default: `local-model`)
- `COMFYUI_URL` — ComfyUI endpoint (default: `http://localhost:8188`)

## Image/Video Pipeline

- Images stored at: `artifacts/director-os/public/generated/shot_{id}_{timestamp}.png`
- Videos stored at: `artifacts/director-os/public/generated/video_{id}_{timestamp}.webp`
- Exports stored at: `artifacts/director-os/public/exports/{project_name}_{timestamp}.mp4`
- Shot status progression: `empty` → `has_frame` → `has_video` → `approved`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Build Status

- Foundation: COMPLETE — 22 DB tables, all API routes, 8 frontend pages
- AI Director: COMPLETE — SSE streaming chat via LM Studio connector, AI storyboard generation
- Pipeline UX: COMPLETE — Storyboard, Image Studio, Timeline Editor, Video Studio
- External Integrations: COMPLETE — LM Studio, ComfyUI, Wan2, FFmpeg connectors with service health checks
- Settings UI: COMPLETE — AI Services panel with connection status and test buttons
