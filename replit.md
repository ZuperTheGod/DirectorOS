# DirectorOS — AI-Native Creative Operating System for Filmmaking

## Overview

pnpm workspace monorepo using TypeScript. DirectorOS is a full AI-native filmmaking platform with 7 modules: Project Browser, AI Director Workspace, Storyboard Timeline, Image Studio, Video Studio, Non-linear Editor, and Audio Studio. Complete end-to-end pipeline from concept → storyboard → image generation → timeline editing → video generation.

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
- **AI**: OpenAI via Replit AI Integrations — `gpt-5.2` for text, `gpt-image-1` for images

## Design System

- Dark cinematic professional aesthetic — deep blacks, blue-purple accent tones, film production studio feel
- Font: Inter for body, display font for headings
- Glass-panel effects, backdrop blur, subtle gradients
- Sidebar context-aware: shows only Home icon on project browser, expands to all 7 module icons inside a project

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (routes: projects, scenes, shots, assets, director, generation-jobs, generate-image)
│   └── director-os/        # React+Vite frontend (root path /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection (22 tables)
│   └── integrations-openai-ai-server/ # OpenAI integration (chat + image generation)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Tables (22)

User, Project, ProjectProfile, Scene, Shot, StoryboardFrame, Asset, AssetVersion, PromptVersion, GenerationJob, EvaluationResult, ContinuityProfile, CharacterProfile, StyleProfile, VFXPlacement, TimelineSequence, TimelineClip, AudioCue, UserActionEvent, PreferenceSignal, Conversation, Message

DB uses snake_case columns. API schema maps to camelCase — route handlers do this mapping manually:
- `thumbnailUri` → `thumbnailUrl`
- `cameraIntentJson` → `cameraIntent`
- `motionIntentJson` → `motionIntent`

## Frontend Pages (Complete Pipeline)

- `/` — Project Browser (Home) with project cards, New Project dialog
- `/projects/:id/director` — AI Director SSE streaming chat with Creative Intent panel
- `/projects/:id/storyboard` — Storyboard Timeline: editable shot cards, inline edit panel, batch AI image generation with SSE progress, "Accept & Continue to Timeline" button
- `/projects/:id/image-studio/:shotId` — Shot-specific image generation: pre-populated prompt from shot data, generate/regenerate, accept/retry, variants panel
- `/projects/:id/editor` — NLE-style timeline: draggable clip durations, transport controls (play/pause/skip), V1 video track + A1 audio track, inspector panel, "Continue to Video Studio"
- `/projects/:id/video-studio/:shotId` — Per-shot video generation: AI prompt transformer, model selection (Kling/Runway/Pika/MiniMax), camera motion, VFX layer, bottom shot filmstrip
- `/projects/:id/audio` — Audio Studio with music generation, sound effects, voiceover features

## API Routes

All mounted under `/api`:
- `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`
- `GET/POST /projects/:projectId/scenes`, `PUT/DELETE /scenes/:id`
- `GET/POST /scenes/:sceneId/shots`, `PATCH/DELETE /shots/:id`
- `POST /projects/:projectId/assets`, `GET /assets/:id`
- `POST /projects/:projectId/director/chat` — SSE streaming AI chat
- `POST /projects/:projectId/director/generate-storyboard` — AI storyboard generation
- `POST /generation-jobs`, `GET /generation-jobs/:id`
- `POST /shots/:shotId/generate-image` — Single shot image generation (gpt-image-1)
- `POST /projects/:projectId/generate-all-images` — SSE batch image generation for all empty shots
- `POST /shots/:shotId/generate-video-prompt` — AI video prompt transformer

## Image Generation Pipeline

- Images stored at: `artifacts/director-os/public/generated/shot_{id}_{timestamp}.png`
- Served as: `/generated/filename` (via Vite public dir)
- Shot status progression: `empty` → `has_frame` → `has_video` → `approved`
- `buildImagePrompt()` in `director-agent.ts` transforms shot metadata into optimized image prompts

## AI Integration

- OpenAI via `@workspace/integrations-openai-ai-server` (Replit AI Integrations proxy — no API key needed)
- `gpt-5.2` for chat/text (no `temperature` or `max_tokens` params for gpt-5+)
- `gpt-image-1` for image generation via `generateImageBuffer()`
- Director Agent: system prompts for filmmaking, JSON structured output with `{message, structuredIntent, suggestions, reasoning}`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck; actual JS bundling handled by esbuild/tsx/vite
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Key Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes in `src/routes/`. Uses `@workspace/api-zod` for validation and `@workspace/db` for persistence.
- `pnpm --filter @workspace/api-server run dev` — dev server
- `pnpm --filter @workspace/api-server run build` — production bundle

### `artifacts/director-os` (`@workspace/director-os`)
React+Vite frontend at root path `/`. Uses wouter for routing, React Query for data fetching (generated hooks from Orval), Framer Motion for animations.
- `pnpm --filter @workspace/director-os run dev` — dev server

### `lib/db` (`@workspace/db`)
Drizzle ORM with PostgreSQL. 22 tables covering all filmmaking entities.
- `pnpm --filter @workspace/db run push` — push schema to DB
- Schema files in `src/schema/`

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec (`openapi.yaml`) + Orval codegen config.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and schemas

### `lib/api-zod` / `lib/api-client-react`
Generated code from OpenAPI spec. Do not edit directly.

## Build Status

- Task #1 (Foundation): COMPLETE — all DB tables, API routes, frontend pages
- Task #2 (AI Director + LLM): COMPLETE — SSE streaming chat, AI storyboard generation
- Pipeline UX: COMPLETE — Storyboard (editable shots + batch image gen), Image Studio (shot-specific generation), Timeline Editor (NLE-style clips + transport), Video Studio (AI video prompt + model selection)
