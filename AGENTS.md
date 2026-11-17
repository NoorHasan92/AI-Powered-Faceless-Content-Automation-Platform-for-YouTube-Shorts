# AGENTS.md — Autonomous Agent Knowledge Base & Architectural Blueprint

> **Notice for AI Coding Agents**:  
> Read this document in full before analyzing, modifying, or executing tasks on this repository. This document serves as the ground-truth technical specification for the **ShortForge** platform. Adhering to these patterns will prevent regressions, memory exhaustion, and unnecessary build cycles.

---

## 1. System Identity & Core Mission

**ShortForge** is an end-to-end autonomous video production SaaS that turns conceptual prompts, niches, or live trends into complete, broadcast-quality faceless YouTube Shorts (9:16 vertical, 1080×1920) and Long-Form mini-documentaries (16:9 landscape, 1920×1080).

The platform handles the entire production lifecycle without external human editing:
1. **Trend Discovery & Deep Research**: Live topic synthesis via Google Gemini API.
2. **2-Stage Script & Direction**: Creative brief lock $\to$ Scene-by-scene scriptwriting with visual roles and asset queries.
3. **Neural Speech Generation**: High-fidelity TTS voiceovers using Microsoft Edge TTS (24kHz).
4. **Visual Asset Retrieval**: Automated Pexels stock video/image querying with multi-tier fallback.
5. **Telemetry Subtitle Rendering**: Frame-synchronized kinetic typography via Advanced SubStation Alpha (`.ass`).
6. **Hardware-Constrained Video Compositing**: Streamlined FFmpeg rendering running within a strict 512MB RAM cap.
7. **Cloud Delivery & Social Publishing**: Cloudinary media hosting and direct YouTube Data API v3 publishing.

---

## 2. Infrastructure Topology & Deployment Architecture

```
                                  ┌─────────────────────────────┐
                                  │   End User / Web Browser    │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │    Vercel Edge / Serverless │
                                  │  (Next.js 16 App Router)    │
                                  │   shortsforge.tars.homes    │
                                  └──────┬───────────────┬──────┘
                                         │               │
                     Database Reads/Writes               │ Delegated Heavy Video Jobs
                                         │               │ (POST /api/jobs/export)
                                         ▼               ▼
┌──────────────────────────────┐  ┌──────────────┐  ┌─────────────────────────────┐
│    Cloudinary CDN Storage    │  │  Neon DB     │  │  Render Worker Web Service  │
│  - 24kHz Scene MP3s          │  │ (PostgreSQL) │  │  (Node.js + FFmpeg Linux)   │
│  - Rendered 1080p MP4 Videos │  │  Prisma 7    │  │  shortforge-worker.onrender │
└──────────────────────────────┘  └──────────────┘  └─────────────────────────────┘
```

### Component Responsibilities:
- **Vercel (`shortsforge.tars.homes`)**:
  - Hosts the Next.js 16 UI, Server Actions, Authentication, Trend Radar, Script Generation, and Voiceover/Asset trigger handlers.
  - Delegates heavy video composition jobs to Render via secure bearer token (`WORKER_SECRET`).
- **Render Worker (`shortforge-worker.onrender.com`)**:
  - Dedicated long-running Node.js process with system FFmpeg (`/usr/bin/ffmpeg`).
  - Executes video composition: streams remote assets, generates `.ass` subtitles, scales/crops media, and uploads the final video.
  - Handles real-time job cancellation (`/api/jobs/cancel`) by killing active FFmpeg processes (`SIGKILL`).
- **Neon Database**:
  - PostgreSQL serverless pooler. Shared between Vercel and Render for atomic state tracking.
- **Cloudinary**:
  - Persistent cloud storage for scene voiceover audio and final rendered 1080p MP4 exports.

---

## 3. Monorepo Directory Layout & Key Locations

```
.
├── apps/
│   └── dashboard/                  # Main Next.js 16 application
│       ├── prisma/
│       │   └── schema.prisma       # Dashboard copy of Prisma schema
│       ├── public/                 # Static assets, local BGM tracks (/bgm)
│       └── src/
│           ├── actions/            # Next.js Server Actions ("use server")
│           │   ├── asset.actions.ts        # Visual asset search triggers
│           │   ├── export.actions.ts       # Video export & cancellation actions
│           │   ├── project.actions.ts      # Project CRUD, archive, discard
│           │   ├── publish.actions.ts      # YouTube Data API upload action
│           │   ├── script.actions.ts       # 2-stage Gemini script generation
│           │   ├── subtitle.actions.ts     # Subtitle alignment & generation
│           │   └── voiceover.actions.ts    # TTS voiceover synthesis triggers
│           ├── app/                # App Router pages and API routes
│           │   ├── (auth)/         # Login, forgot password
│           │   ├── (dashboard)/    # Studio workspaces, analytics, settings
│           │   │   ├── projects/           # Project list & Create Wizard
│           │   │   └── projects/[id]/      # Production Studio Workspace
│           │   └── api/
│           │       ├── health/             # Health checks for Vercel & Render
│           │       ├── jobs/export/        # Worker endpoint: Starts background FFmpeg render
│           │       ├── jobs/cancel/        # Worker endpoint: Aborts active FFmpeg render
│           │       └── trends/             # Live topic trends generated by Gemini
│           ├── components/         # React 19 Client & Server Components
│           │   ├── export/         # ExportPanel, PublishButton
│           │   ├── project/        # CreateProjectForm, ProjectStudioWorkspace
│           │   ├── voiceover/      # VoiceoverPanel with audio preview player
│           │   └── ...
│           ├── lib/                # Core utility functions
│           │   ├── ass-utils.ts            # .ass subtitle file generation
│           │   ├── audio-utils.ts          # Local audio path resolution
│           │   ├── cloudinary-upload.ts    # Streaming upload to Cloudinary
│           │   ├── constants.ts            # Options, tones, niches, status maps
│           │   ├── ffmpeg-utils.ts         # Scene composition, concat, process registry
│           │   ├── gemini.ts               # Google Gemini client with retry/fallback
│           │   └── prisma.ts               # Global Prisma client singleton
│           ├── services/           # Pure business logic services (DB & API interactions)
│           │   ├── asset.service.ts        # Pexels stock video/photo retrieval
│           │   ├── bgm.service.ts          # Background music track selection
│           │   ├── export.service.ts       # Video compilation orchestrator
│           │   ├── project.service.ts      # Project creation and pipeline queries
│           │   ├── research.service.ts     # Deep research factual dossier generation
│           │   ├── script.service.ts       # 2-stage brief & scene scriptwriter
│           │   ├── subtitle.service.ts     # Telemetry subtitle chunking
│           │   └── voiceover.service.ts    # Edge TTS speech synthesis
│           └── validations/        # Zod validation schemas
├── prisma/
│   └── schema.prisma               # Root Prisma schema (kept in sync with dashboard)
├── .env.example                    # Template environment variables
├── AGENTS.md                       # This documentation file
├── IMPROVEMENTS.md                 # Detailed research and backlog of future enhancements
└── README.md                       # Public-facing repository documentation
```

---

## 4. Pipeline State Machine & Generation Lifecycle

A project progresses through strict sequential states defined by the `ProjectStatus` enum:

```
[DRAFT]
   │
   ▼  (Trigger: generateScriptAction)
[GENERATING_SCRIPT]
   │  Stage 1: Deep Research Dossier & Creative Brief Lock
   │  Stage 2: Scriptwriting & Scene Planning (10–14 scenes)
   ▼
[SCRIPT_READY]
   │
   ▼  (Trigger: generateVoiceoverAction, generateAssetsAction, generateSubtitlesAction)
[IN_PRODUCTION]
   │  Parallel or sequential execution of:
   │  - Voiceovers (Edge TTS)
   │  - Assets (Pexels Video/Image)
   │  - Subtitles (.ass generation)
   ▼
[EXPORT_QUEUED]
   │
   ▼  (Trigger: triggerExportAction -> Render Worker POST /api/jobs/export)
[EXPORTING]
   │  Sequential scene compilation (FFmpeg)
   │  Concatenation + continuous BGM audio mixing
   │  Cloudinary final upload
   ▼
[COMPLETED]
   │
   ▼  (Optional Trigger: publishVideoAction)
[PUBLISHED]
```

### Cancellation & Reset Mechanics:
- If a user cancels an active export, `ExportJob.status` becomes `CANCELLED`.
- `Project.status` is automatically reset to `EXPORT_QUEUED`. This allows the user to re-trigger an export immediately without corrupting pipeline assets.

---

## 5. Strict Constraints & Known Gotchas (DO NOT VIOLATE)

### 1. Render Free Tier Memory Boundary (512MB RAM Cap)
- **Problem**: Render's free container has exactly 512MB RAM. Running FFmpeg with default threads or loading multiple 1080p video clips into Node buffers triggers an Out-Of-Memory (OOM) kernel SIGKILL (`Exit Code 137`).
- **Required Rules**:
  - Render start command **must** enforce Node heap limits: `node --max-old-space-size=96 ...`
  - In `ffmpeg-utils.ts`, FFmpeg **must** be constrained to single-threaded execution:
    ```ts
    command.inputOptions(["-threads", "1"]);
    command.outputOptions([
      "-filter_complex_threads", "1",
      "-threads", "1",
      "-x264-params", "rc-lookahead=5:sync-lookahead=0:bframes=0:ref=1",
      "-bufsize", "1M"
    ]);
    ```
  - Remote media files must be streamed to disk using Node's `pipeline(Readable.fromWeb(...), fs.createWriteStream(...))` instead of `Buffer.from(await res.arrayBuffer())`.
  - Downloaded raw clips must be unlinked from disk immediately after each scene is composited.
  - Call `global.gc()` after every scene if exposed.

### 2. Edge-TTS WebSocket Lifecycle & Throttling
- **Problem**: `msedge-tts` creates WebSocket connections to Microsoft's speech service. If instances are created without calling `tts.close()`, sockets remain open. Microsoft detects concurrent connections from the same IP and drops requests (`Error: Stream closed before the synthesis completed (no turn.end received)`).
- **Required Rules**:
  - Always instantiate `tts` inside a `try...finally` block that explicitly calls `tts.close()`.
  - Always implement incremental generation: skip scenes that already have a completed voiceover.
  - Implement fallback to `wordBoundaryEnabled: false` on retries to ensure pure audio streams without metadata dropouts.
  - Maintain an 800ms cooldown between scenes.

### 3. Multi-Step Form State in Framer Motion
- **Problem**: In multi-step wizards using `<AnimatePresence mode="wait">` (like `CreateProjectForm.tsx`), unmounted steps are removed from the DOM. Standard HTML form submission will send `null` for fields in unmounted steps, failing Zod schema validation.
- **Required Rules**:
  - Always mirror state variables into permanent hidden `<input>` elements at the root of the `<form>`:
    ```tsx
    <input type="hidden" name="title" value={title} />
    <input type="hidden" name="niche" value={niche} />
    ...
    ```

### 4. Turbopack Binary Pathing
- **Problem**: Next.js Turbopack mangles static asset binary paths by prepending `\ROOT\`.
- **Required Rules**:
  - In `ffmpeg-utils.ts`, resolve binary paths dynamically using `path.join(process.cwd(), "node_modules", "ffmpeg-static", ...)` and check for `/usr/bin/ffmpeg` first.

### 5. Dynamic Rendering in Next.js App Router
- **Problem**: Next.js tries to statically pre-render pages during `npm run build`. Pages querying PostgreSQL via Prisma will fail at build time if static.
- **Required Rules**:
  - Always add `export const dynamic = "force-dynamic";` at the top of pages and route handlers that interact with the database or headers.

---

## 6. API Route Contracts

### `POST /api/jobs/export`
- **Host**: Render Worker (`shortforge-worker.onrender.com`)
- **Headers**: `Authorization: Bearer <WORKER_SECRET>`, `Content-Type: application/json`
- **Body**: `{ "projectId": "uuid", "jobId": "uuid" }`
- **Behavior**: Asynchronously spawns `triggerExport(projectId, jobId)` and returns `200 OK` immediately.

### `POST /api/jobs/cancel`
- **Host**: Render Worker (`shortforge-worker.onrender.com`)
- **Headers**: `Authorization: Bearer <WORKER_SECRET>`, `Content-Type: application/json`
- **Body**: `{ "projectId": "uuid", "jobId": "uuid" }`
- **Behavior**: Kills any active FFmpeg command via `killActiveJob(jobId)`, marks `ExportJob` as `CANCELLED`, and resets `Project` to `EXPORT_QUEUED`.

### `GET /api/trends`
- **Host**: Vercel (`shortsforge.tars.homes`)
- **Query Params**: `?niche=science&format=SHORTS`
- **Behavior**: Calls Google Gemini to generate 4 live viral video ideas with hook angles and buzz scores.

---

## 7. Environment Variables Reference

| Variable | Target | Purpose |
|---|---|---|
| `DATABASE_URL` | Vercel & Render | Neon PostgreSQL connection string (pooler format) |
| `JWT_SECRET` | Vercel | Secret for custom authentication JWT cookies |
| `GEMINI_API_KEY` | Vercel | Google Gemini API key for script & research generation |
| `PEXELS_API_KEY` | Vercel & Render | Stock video and photography search |
| `CLOUDINARY_CLOUD_NAME` | Vercel & Render | Cloudinary storage bucket identifier |
| `CLOUDINARY_API_KEY` | Vercel & Render | Cloudinary API access key |
| `CLOUDINARY_API_SECRET` | Vercel & Render | Cloudinary API secret |
| `RENDER_WORKER_URL` | Vercel | URL of the Render service (`https://shortforge-worker.onrender.com`) |
| `WORKER_SECRET` | Vercel & Render | Shared secret token authorizing export dispatch |
| `IS_RENDER_WORKER` | Render only | Set to `"true"` on Render to prevent worker delegating to itself |
| `GOOGLE_CLIENT_ID` | Vercel | YouTube Data API OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Vercel | YouTube Data API OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | Vercel | OAuth callback URL (`https://shortsforge.tars.homes/api/auth/youtube/callback`) |

---

## 8. Development & Verification Workflow

When making modifications:
1. Ensure both `prisma/schema.prisma` and `apps/dashboard/prisma/schema.prisma` stay identical if modifying database models. Run `npx prisma db push` and `npx prisma generate` in root and `apps/dashboard`.
2. Verify TypeScript and Next.js compilation locally:
   ```bash
   cd apps/dashboard
   npm run build
   ```
3. Test Server Actions and client components together.
4. Push to `main` branch to trigger synchronized deployments across Vercel and Render.
