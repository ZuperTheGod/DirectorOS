# DirectorOS — AI-Native Creative Operating System for Filmmaking

## Overview

pnpm workspace monorepo using TypeScript. DirectorOS is a full AI-native filmmaking platform with 7 modules: Project Browser, AI Director Workspace, Storyboard Timeline, Image Studio, Video Studio, Non-linear Editor, and Audio Studio.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + wouter + React Query + Framer Motion + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (20 tables)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Design System

- Dark cinematic professional aesthetic — deep blacks, blue-purple accent tones, film production studio feel
- Font: Inter for body, display font for headings
- Glass-panel effects, backdrop blur, subtle gradients
- Sidebar context-aware: shows only Home icon on project browser, expands to all 7 module icons inside a project

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (routes: projects, scenes, shots, assets, director, generation-jobs)
│   └── director-os/        # React+Vite frontend (root path /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection (20 tables)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Tables (20)

User, Project, ProjectProfile, Scene, Shot, StoryboardFrame, Asset, AssetVersion, PromptVersion, GenerationJob, EvaluationResult, ContinuityProfile, CharacterProfile, StyleProfile, VFXPlacement, TimelineSequence, TimelineClip, AudioCue, UserActionEvent, PreferenceSignal

DB uses snake_case columns. API schema maps to camelCase — route handlers do this mapping manually.

## Frontend Pages

- `/` — Project Browser (Home) with project cards, New Project dialog
- `/projects/:id/director` — AI Director chat workspace with Creative Intent panel
- `/projects/:id/storyboard` — Storyboard Timeline with scene/shot management
- `/projects/:id/image-studio` — Text-to-image with prompt builder, AI evaluation, variant history
- `/projects/:id/video-studio` — Video generation with motion controls, VFX layer system
- `/projects/:id/editor` — Non-linear editor with preview monitor, timeline, Media/Inspector tabs
- `/projects/:id/audio` — Audio Studio with music generation, sound effects, voiceover features

## API Routes

All mounted under `/api`:
- `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`
- `GET/POST /projects/:projectId/scenes`, `PUT/DELETE /scenes/:id`
- `GET/POST /scenes/:sceneId/shots`, `PUT/DELETE /shots/:id`
- `POST /projects/:projectId/assets`, `GET /assets/:id`
- `POST /projects/:projectId/director/chat`, `POST /projects/:projectId/director/generate-storyboard`
- `POST /generation-jobs`, `GET /generation-jobs/:id`

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
Drizzle ORM with PostgreSQL. 20 tables covering all filmmaking entities.
- `pnpm --filter @workspace/db run push` — push schema to DB
- Schema files in `src/schema/`

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec (`openapi.yaml`) + Orval codegen config.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and schemas

### `lib/api-zod` / `lib/api-client-react`
Generated code from OpenAPI spec. Do not edit directly.

## Build Status

- Task #1 (Foundation): COMPLETE — all DB tables, API routes, frontend pages
- Task #2 (AI Director + LLM): PENDING
- Task #3 (Storyboard + Image Studio): PENDING
- Task #4 (Video Studio + VFX): PENDING
- Task #5 (Editor + Audio): PENDING
- Task #6 (Adaptive Memory): PENDING
