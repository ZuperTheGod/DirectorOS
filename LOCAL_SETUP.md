# DirectorOS — Local Setup Guide

Run DirectorOS on your local machine to connect directly to LM Studio, ComfyUI, Wan2GP, and FFmpeg.

## Prerequisites

- **Node.js 20+** (v24 recommended)
- **pnpm** — Install with `npm install -g pnpm`
- **PostgreSQL** — Running locally or via Docker
- **FFmpeg** — Install via your package manager (`brew install ffmpeg`, `apt install ffmpeg`, etc.)

## 1. Clone & Install

```bash
git clone <your-repo-url> directoros
cd directoros
pnpm install
```

## 2. Set Up PostgreSQL

Create a database for DirectorOS:

```bash
createdb directoros
```

Or with Docker:

```bash
docker run -d --name directoros-db \
  -e POSTGRES_DB=directoros \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

## 3. Configure Environment

Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/directoros"
```

That's the only required variable. All AI service URLs default to standard local ports and can also be configured from the Settings page in the app.

Optional overrides (these all have sensible defaults):

```bash
LMSTUDIO_URL="http://localhost:1234"
LMSTUDIO_MODEL=""
COMFYUI_URL="http://localhost:8188"
WAN2GP_URL="http://localhost:7860"
FFMPEG_PATH="ffmpeg"
```

## 4. Push Database Schema

```bash
cd lib/db
npx drizzle-kit push
cd ../..
```

## 5. Start the App

Open two terminal tabs:

**Terminal 1 — API Server (port 8080):**

```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend (port 5173):**

```bash
pnpm --filter @workspace/director-os run dev
```

Open **http://localhost:5173** in your browser.

The frontend automatically proxies `/api` requests to the API server on port 8080.

## 6. Start Your AI Services

Make sure these are running on your machine:

### LM Studio
1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Load a model (e.g., Qwen 2.5, Llama 3, etc.)
3. Start the local server — it runs on port 1234 by default

### ComfyUI
1. Install ComfyUI following their guide
2. Download an SDXL checkpoint
3. Start ComfyUI — it runs on port 8188 by default

### Wan2GP
1. Clone: `git clone https://github.com/deepbeepmeep/Wan2GP`
2. Follow their setup instructions (requires a Wan2.1 model)
3. Start it — it runs on port 7860 by default

### FFmpeg
Usually pre-installed on macOS/Linux. Check with `ffmpeg -version`.

## 7. Verify Connections

Go to the **Settings** page in DirectorOS (gear icon in sidebar). You should see green "Connected" badges for each running service. Use the "Test" button on each card to verify.

If a service is on a non-default port, edit the URL directly in the Settings page and click "Save Settings" — the configuration persists in the database.

## Troubleshooting

- **"fetch failed" errors**: The AI service isn't running or is on a different port. Check the Settings page.
- **Database errors**: Make sure PostgreSQL is running and `DATABASE_URL` is correct.
- **Frontend can't reach API**: Make sure the API server is running on port 8080. The Vite dev server proxies `/api` requests there automatically.
