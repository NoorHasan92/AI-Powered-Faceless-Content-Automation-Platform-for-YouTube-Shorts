# ShortForge 🎬

**AI-Powered Faceless Content Automation Platform for YouTube Shorts**

ShortForge is a complete end-to-end automation platform that uses multi-agent AI to generate scripts, fetch stock videos, generate AI voiceovers, stitch them together via FFmpeg, and securely publish them directly to your YouTube channel as Shorts.

## 🌟 Features

- **AI Scriptwriter:** Uses Google Gemini (with robust fallback logic to `gemini-1.5-flash` / `3.5-flash` to bypass quota limits) to generate hooks, body text, and YouTube metadata.
- **AI Voiceovers:** Integrates with Microsoft Edge TTS for high-quality, free Text-To-Speech.
- **Stock Asset Sourcing:** Automatically searches and downloads vertical 9:16 background videos via the Pexels API.
- **Local FFmpeg Compositing:** Stitches videos, audio, and on-screen captions together locally at 1080x1920, 30fps, 8M high-bitrate, complete with audio crossfades for perfectly smooth cuts.
- **Direct YouTube Publishing:** Uses YouTube Data API v3 OAuth to upload rendered videos instantly to the Shorts shelf (published publicly).
- **Secure Dashboard:** Password-protected admin dashboard using `jose` JWT encryption and `bcryptjs`.
- **Project Archive Management:** Keep your workspace clean by archiving completed videos or permanently deleting them to free up disk space.

---

## 🛠️ Installation & Setup

### 1. Prerequisites

You need **Node.js 18+** and **FFmpeg** (managed automatically via `ffmpeg-static`, but good to have system-level).

Clone the repository and install dependencies from the root directory:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in `apps/dashboard/.env` and provide the following keys:

```env
# Postgres Database (e.g., Neon.tech)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# AI Generation
GEMINI_API_KEY="your_gemini_api_key_here"

# Stock Videos
PEXELS_API_KEY="your_pexels_api_key_here"

# Authentication Security (Generate a random 32-character string)
JWT_SECRET="your_super_secret_jwt_key_here"

# YouTube OAuth Data API v3 Credentials
GOOGLE_CLIENT_ID="your_google_cloud_client_id"
GOOGLE_CLIENT_SECRET="your_google_cloud_client_secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000" # Change to your domain in production
```

### 3. Initialize Database

Push the Prisma schema to your PostgreSQL database and generate the client:

```bash
npx prisma db push
npx prisma generate
```

### 4. Run the Application

Start the Next.js development server:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📂 Understanding the Pipeline Storage

All generated audio (`.mp3`), downloaded stock videos (`.mp4`), and final FFmpeg exports (`.mp4`) are stored locally in:
`apps/dashboard/public/pipeline/`

This folder is ignored by Git to prevent bloating the repository. When you permanently delete an archived project in the dashboard, its associated files are automatically purged from this directory to save space.

## 🚀 Future Deployments

If you host this on a custom domain (e.g. Vercel), remember to:

1. Update `NEXT_PUBLIC_BASE_URL` to your production URL.
2. Update the "Authorized redirect URIs" in your Google Cloud Console for the YouTube API OAuth credential to match `https://yourdomain.com/api/auth/youtube/callback`.
