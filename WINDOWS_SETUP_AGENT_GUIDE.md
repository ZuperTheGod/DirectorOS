# DirectorOS — Windows Local Setup (Step-by-Step for AI Agent)

These are exact instructions to set up and run DirectorOS on a Windows PC. Follow every step in order. Do not skip any step.

The project code is already cloned at: `G:\AI_Fast\DirectorOS\DirectorOS`

---

## STEP 1: Install Prerequisites

### 1a. Install Node.js (v20 or newer)
- Download from: https://nodejs.org/en/download
- Run the installer, accept all defaults
- Verify by opening a NEW command prompt and running:
```
node --version
```
- Expected output: v20.x.x or higher

### 1b. Install pnpm
- In command prompt, run:
```
npm install -g pnpm
```
- Verify:
```
pnpm --version
```

### 1c. Install PostgreSQL
- Download the Windows installer from: https://www.postgresql.org/download/windows/
- Click "Download the installer" which goes to EDB installer page
- Download the latest PostgreSQL 16.x for Windows x86-64
- Run the installer with these settings:
  - Installation directory: use default
  - Select all components (PostgreSQL Server, pgAdmin, Stack Builder, Command Line Tools)
  - Data directory: use default
  - Password: set to `postgres` (remember this — it is needed later)
  - Port: keep default `5432`
  - Locale: use default
- Finish the installer. Uncheck "Launch Stack Builder" at the end.
- IMPORTANT: Add PostgreSQL bin to your PATH:
  - Open System Environment Variables (search "environment variables" in Windows Start)
  - Under System Variables, find `Path`, click Edit
  - Add a new entry: `C:\Program Files\PostgreSQL\16\bin` (adjust version number if different)
  - Click OK on all dialogs
- Close ALL command prompt windows and open a NEW one
- Verify PostgreSQL is accessible:
```
psql --version
```
- Expected output: psql (PostgreSQL) 16.x

### 1d. Install FFmpeg
- Download from: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
- Extract the zip file to `C:\ffmpeg`
- Add `C:\ffmpeg\bin` to your system PATH (same process as PostgreSQL above)
- Open a NEW command prompt and verify:
```
ffmpeg -version
```

---

## STEP 2: Create the Database

Open a command prompt and run:
```
psql -U postgres -c "CREATE DATABASE directoros;"
```
- When prompted for password, enter: `postgres`
- Expected output: `CREATE DATABASE`

If `psql` asks for a password and `postgres` doesn't work, use whatever password was set during PostgreSQL installation.

---

## STEP 3: Create the .env File

Navigate to the project directory and create a `.env` file:
```
cd G:\AI_Fast\DirectorOS\DirectorOS
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/directoros" > .env
```

Verify the file was created correctly:
```
type .env
```
Expected output: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/directoros"`

NOTE: If the PostgreSQL password is NOT `postgres`, edit the .env file and replace `postgres` (the second one, after the colon) with the actual password.

### Optional: Add OpenAI API Key
If using ChatGPT instead of (or alongside) LM Studio, add to the `.env` file:
```
echo OPENAI_API_KEY=sk-your-key-here >> .env
```
Or configure it later through the Settings page in the app.

---

## STEP 4: Install Project Dependencies

```
cd G:\AI_Fast\DirectorOS\DirectorOS
pnpm install
```

Expected: Should complete successfully with no errors. The preinstall script should say "Done".

---

## STEP 5: Push the Database Schema

```
cd G:\AI_Fast\DirectorOS\DirectorOS\lib\db
npx drizzle-kit push
```

- If it asks for confirmation, type `yes` and press Enter
- Expected output should end with: `[✓] Changes applied`
- Then go back to the project root:
```
cd G:\AI_Fast\DirectorOS\DirectorOS
```

---

## STEP 6: Start the API Server

Open a command prompt (Terminal 1):
```
cd G:\AI_Fast\DirectorOS\DirectorOS
pnpm --filter @workspace/api-server run dev
```

Expected output:
```
Server listening on port 8080
[JobWorker] Started (polling every 3000ms)
```

Leave this terminal running. Do NOT close it.

---

## STEP 7: Start the Frontend

Open a SECOND command prompt (Terminal 2):
```
cd G:\AI_Fast\DirectorOS\DirectorOS
pnpm --filter @workspace/director-os run dev
```

Expected output should include something like:
```
VITE v6.x.x ready in xxx ms
➜  Local:   http://localhost:5173/
```

Leave this terminal running. Do NOT close it.

---

## STEP 8: Open the App

Open a web browser and go to: http://localhost:5173

You should see the DirectorOS home page with a dark cinematic theme.

---

## STEP 9: Verify AI Service Connections

In the browser, click the gear icon (Settings) in the left sidebar.

You should see 4 service cards:
- **LM Studio** — will show "Connected" if LM Studio is running on port 1234
- **ComfyUI** — will show "Connected" if ComfyUI is running on port 8188
- **Wan2GP** — will show "Connected" if Wan2GP is running on port 7860
- **FFmpeg** — should show "Connected" with a version number

If any AI service is on a different port, edit the URL in the Settings page and click "Save Settings".

---

## STEP 10: Start the AI Services (if not already running)

These are separate applications that DirectorOS connects to. Start whichever ones you have installed:

### LM Studio
- Open LM Studio application
- Load a model
- Go to Local Server tab and click Start Server
- It runs on http://localhost:1234 by default

### ComfyUI
- Open a command prompt in your ComfyUI folder
- Run: `python main.py`
- It runs on http://localhost:8188 by default

### Wan2GP
- Open a command prompt in your Wan2GP folder
- Run: `python wgp.py`
- It runs on http://localhost:7860 by default

---

## Troubleshooting

### "Cannot find module" or dependency errors during `pnpm install`
- Make sure you are in `G:\AI_Fast\DirectorOS\DirectorOS` (the folder with package.json)
- Try: `pnpm install --force`

### Database connection errors
- Make sure PostgreSQL service is running (check Windows Services for "postgresql")
- Make sure the password in .env matches your PostgreSQL password
- Make sure the database exists: `psql -U postgres -l` should list `directoros`

### Frontend shows blank page
- Make sure the API server (Terminal 1) is running
- Make sure the frontend (Terminal 2) is running
- Check browser console for errors (F12 > Console tab)

### "VITE requires PORT environment variable"
- This should not happen with the latest code. If it does, the vite config defaults to port 5173.

### Services show "Disconnected" in Settings
- The AI services (LM Studio, ComfyUI, Wan2GP) must be running separately on your machine
- DirectorOS does not start them — it connects to them
- Check the URLs in Settings match the ports your services are running on
