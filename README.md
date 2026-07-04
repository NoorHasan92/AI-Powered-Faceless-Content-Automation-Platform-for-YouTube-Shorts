# ShortForge  

**AI-Powered Faceless Content Automation Platform for YouTube Shorts**

ShortForge is a full-stack AI content automation platform that generates and publishes faceless YouTube Shorts from a simple niche/topic input. It automates the end-to-end workflow: **topic steering, script generation, scene planning, stock asset retrieval, voiceover generation, subtitle rendering, video composition, analytics, and direct YouTube publishing**.

The system is designed as a creator productivity tool for building short-form educational or viral-style content pipelines with minimal manual editing.

---

## ✨ Features

### 1) AI Script Generation with Topic Steering

- Generate short-form video scripts from:
  - **Niche**
  - **Narration tone**
  - **Target duration**
  - **Specific topic / topic seed**
  - **Creator instructions / director notes**
- Supports a **2-stage script generation architecture**:
  - **Stage 1: Creative Brief Lock**
  - **Stage 2: Script + Scene generation**
- Prevents generic topic drift by locking:
  - core topic
  - required anchors
  - forbidden drift topics
  - content constraints
  - ending style

---

### 2) Structured Memory Deduplication

ShortForge avoids repetitive content by maintaining **structured memory** of recent generated briefs.

It stores and reuses:

- `coreTopic`
- `contentAngle`
- `requiredAnchors`
- `endingStyle`

This enables:

- **duplicate topic avoidance** when the user gives only a broad niche
- **fresh execution of repeated topics** when the user intentionally requests a similar topic again

---

### 3) Scene-Level Video Planning

Every generated script is broken into scenes with:

- narration text
- on-screen caption
- visual prompt
- visual intent
- visual role
- structured asset search plan
- scene duration

The AI acts as both **scriptwriter and director**, planning:

- pacing
- beat-based cuts
- visual variety
- final CTA / emotional payoff scene behavior

---

### 4) Smart Asset Retrieval Pipeline

For each scene, the platform generates **ordered asset fallback queries** for stock media retrieval.

Each scene can define:

- primary video query
- fallback video query
- fallback image query

This improves visual relevance and reduces bad stock matches.

Current asset source:

- **Pexels API**

---

### 5) Automated Voiceover + Subtitle Rendering

ShortForge automatically generates narration and subtitles for each scene.

#### Voiceover

- Uses **Microsoft Edge TTS**
- No paid TTS API required

#### Subtitles

- Generates styled subtitles using **`.ass` subtitle rendering**
- Supports:
  - better wrapping
  - stronger readability
  - modern subtitle styling for Shorts

---

### 6) Video Composition Pipeline

The platform composes the final Short by combining:

- stock footage / images
- generated scene timings
- TTS narration
- subtitles
- transitions / overlays

Rendering is handled with:

- **FFmpeg**

---

### 7) YouTube Publishing Integration

ShortForge can directly publish generated Shorts to YouTube.

Features include:

- YouTube OAuth connection
- direct upload/publish flow
- project-level publish state tracking
- analytics-ready storage of published video metadata

---

### 8) Hybrid Analytics Dashboard

The analytics dashboard combines:

#### Internal pipeline analytics

- total projects
- completed pipelines
- success rate
- niche distribution
- recent activity trends

#### YouTube performance analytics

- published video list
- views
- likes
- comments
- top-performing videos

---

### 9) Mobile-Responsive Dashboard

The dashboard was refactored with a mobile-first responsive pass:

- mobile drawer navigation
- stacked mobile cards instead of broken tables
- responsive forms
- mobile-friendly analytics
- collapsible Scene Inspector
- sticky mobile action bars where needed

---

# 🧠 Core Architecture

## Two-Stage AI Script Pipeline

### **Stage 1 — Creative Brief Lock**

The first AI call converts raw user inputs into a structured **Creative Brief**.

It locks:

- `coreTopic`
- `audienceContext`
- `contentAngle`
- `requiredAnchors`
- `forbiddenDriftTopics`
- `contentConstraints`
- `endingStyle`
- `visualExpectations`

This prevents the model from drifting into generic adjacent content.

---

### **Stage 2 — Script + Scene Generation**

The second AI call consumes the locked Creative Brief and generates:

- hook
- body text
- CTA
- metadata
- scene breakdown
- narration text
- captions
- visual planning
- asset retrieval queries

Stage 2 is intentionally **blind to topic selection** and acts only as a strict brief executor.

---

## Structured Memory Deduplication Logic

ShortForge uses **Stage 1 structured memory** to prevent repetitive videos.

### If the user does **not** provide a specific topic

- the AI must choose a **fresh core topic**
- it avoids recently used topics from prior creative briefs

### If the user **does** provide a specific topic

- the AI must keep the requested topic
- but it must vary execution using at least two of:
  - content angle
  - anchors/examples
  - ending style
  - visual expectations

---

# 🛠 Tech Stack

## Frontend

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**

## Backend / Data

- **Prisma**
- **PostgreSQL / SQL database**

## AI / Automation

- **Google Gemini API** — structured script + creative brief generation
- **Microsoft Edge TTS** — narration generation
- **Pexels API** — stock media retrieval
- **FFmpeg** — video composition
- **YouTube Data API** — publishing + video metrics

## Visualization / UI

- **Recharts** — analytics dashboard charts

---

# 📦 Main Workflow

## 1. Create a Project

User provides:

- niche
- tone
- duration
- optional specific topic
- optional creator instructions

## 2. Generate Creative Brief

AI normalizes the request into a locked creative brief.

## 3. Generate Script + Scenes

AI generates:

- hook / body / CTA
- scene-by-scene narration
- captions
- visual roles
- asset queries

## 4. Generate Voiceover

Each scene receives TTS narration with accurate duration parsing.

## 5. Fetch Visual Assets

Scene asset plans are used to retrieve stock videos/images.

## 6. Generate Subtitles

Subtitle files are created and styled for readability.

## 7. Compose Final Video

FFmpeg combines:

- visuals
- audio
- subtitles
- timing

## 8. Publish to YouTube

The final Short can be uploaded directly to YouTube.

## 9. Track Analytics

The dashboard displays:

- internal pipeline metrics
- live YouTube performance metrics

---

# 📊 Dashboard Modules

- **Projects** — create and manage content pipelines
- **Project Details** — inspect scripts, scenes, assets, and status
- **Analytics** — pipeline + YouTube performance
- **Settings** — YouTube connection and platform configuration
- **Archive** — completed / older projects

---

# 🚀 Future Improvements

Potential next upgrades:

- multi-platform export (Instagram Reels / TikTok)
- advanced YouTube analytics (watch time, retention, CTR)
- branded subtitle themes / templates
- multi-voice narration options
- AI-generated thumbnails
- manual scene editing before export
- approval workflow before publishing
- scheduling / queueing system
- webhook / cron-based automation

---

# ⚠️ Current Limitations

- Stock footage quality depends on external search results and media availability
- Script quality depends on prompt quality and topic specificity
- YouTube analytics currently focus on practical video-level metrics, not full advanced channel analytics
- Fully automated content still benefits from human review before large-scale publishing

---

# 💡 Why I Built This

ShortForge was built as a full-stack AI automation project to explore how generative AI, structured prompting, media pipelines, and publishing integrations can be combined into a real creator workflow product.

Instead of building a simple “script generator,” the goal was to design a system that behaves more like an **AI production pipeline**:

- it understands creative constraints,
- remembers past topics,
- plans visuals scene-by-scene,
- generates assets and narration,
- renders final videos,
- and publishes them directly to YouTube.

---

Examples:

- Dashboard
- Project creation flow
- Scene Inspector
- Analytics page
- Settings / YouTube connection
- Final generated Short sample

---

# ⚙️ Setup

**1. Clone the repository**

```bash
git clone <https://github.com/NoorHasan92/AI-Powered-Faceless-Content-Automation-Platform-for-YouTube-Shorts.git>
cd AI-Powered-Faceless-Content-Automation-Platform-for-YouTube-Shorts
npm install
```

**2. Configure Environment Variables**
Create a `.env` file in the root directory with the following required keys:

```env
DATABASE_URL=
GEMINI_API_KEY=
PEXELS_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

**3. Initialize Database & Run**

```bash
npx prisma db push
npm run dev
```

---

**👨‍💻 Author:** Md Noor Hasan Ansari
