# StreamForge — Premium YouTube + Instagram Media Downloader

StreamForge is a production-ready, full-stack web application designed to extract and download public media from **YouTube** (Videos & Shorts) and **Instagram** (Public Posts & Reels) as high-quality **MP4 video** or **MP3 audio**.

---

## 🌟 Key Features

- 🎯 **Focused Scope**: Exclusively supports YouTube and Instagram for maximum reliability.
- ⚡ **Auto Platform Detection**: Paste any URL to immediately detect the platform.
- 🎬 **MP4 & MP3 Formats**: Download HD video or extract crisp 192kbps MP3 audio via FFmpeg.
- 📡 **Real-time SSE Progress**: Server-Sent Events stream live percentage, speed (MiB/s), and ETA without client polling.
- 🛡️ **Enterprise Security**: SSRF protection blocking local IP ranges, rate-limiting, strict input sanitization, argument array execution (`child_process`), and auto temp-directory cleanup.
- 📱 **Responsive UI**: Built with React 18, Tailwind CSS, Lucide icons, mobile-first design, keyboard accessible.

---

## 🏗️ Architecture Overview

```
youtube_com_mp3_4/
├── backend/                  # Node.js + Express + TypeScript API Engine
│   ├── src/
│   │   ├── config/           # Binaries auto-detection & environment config
│   │   ├── middleware/       # Error handling & rate limiting
│   │   ├── routes/           # REST endpoints (/analyze, /download, /health, SSE)
│   │   ├── services/         # ytdlp, instagram, ffmpeg & job manager services
│   │   ├── utils/            # URL validator (SSRF defense) & filename sanitizer
│   │   └── server.ts         # Express server bootstrap
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React + TypeScript + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/       # Navbar, UrlForm, MediaCard, DownloadProgress, Footer
│   │   ├── services/         # Axios API client & EventSource SSE listener
│   │   ├── types/            # API TypeScript interfaces
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── vercel.json
├── render.yaml               # Backend Render deployment manifest
├── .env.example
└── README.md
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js (v18+)
- Python 3 with `yt-dlp` (`pip install yt-dlp`) or `yt-dlp` binary on PATH
- `FFmpeg` installed on system PATH or via `imageio-ffmpeg`

### 1. Install & Build Backend
```bash
cd backend
npm install
npm run build
npm start
```
*Backend runs on `http://localhost:5050`*

### 2. Install & Launch Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 📡 API Specification

### `GET /api/health`
System diagnostics and binary status.
**Response**:
```json
{
  "status": "ok",
  "environment": "development",
  "ytDlp": { "available": true, "version": "2026.08.19" },
  "ffmpeg": { "available": true, "version": "7.1" }
}
```

### `POST /api/analyze`
Extracts metadata for a given URL.
**Request**: `{ "url": "https://www.youtube.com/watch?v=..." }`  
**Response**:
```json
{
  "success": true,
  "platform": "youtube",
  "title": "Media Title",
  "thumbnail": "https://...",
  "duration": 213,
  "formats": [...]
}
```

### `POST /api/download`
Initializes media extraction and conversion job.
**Request**: `{ "url": "https://...", "format": "mp4" }` (or `"mp3"`)  
**Response**: `{ "success": true, "jobId": "uuid-v4-string" }`

### `GET /api/download/:jobId/progress`
Server-Sent Events (SSE) stream returning real-time progress:
```data
data: {"jobId":"...","status":"downloading","percent":45,"speed":"12.5MiB/s","eta":"00:03","stage":"Downloading media..."}
```

### `GET /api/download/:jobId/file`
Streams completed file for user download with `Content-Disposition: attachment`.

---

## 🌐 Production Deployment

### Backend (Render)
1. Connect repo to Render.
2. Select **Web Service** using `render.yaml` or set:
   - Build Command: `cd backend && npm install && npm run build && apt-get update && apt-get install -y python3 python3-pip ffmpeg && pip3 install yt-dlp`
   - Start Command: `cd backend && npm run start`

### Frontend (Vercel)
1. Import `frontend/` directory into Vercel.
2. Set Environment Variable: `VITE_API_URL=https://your-backend.onrender.com`
3. Framework Preset: **Vite**.

---

## 🛡️ Security & Known Platform Limitations

1. **SSRF Defense**: Strict hostname whitelisting (`youtube.com`, `youtu.be`, `instagram.com`). Blocks all internal/private IP ranges (`127.0.0.1`, `10.x`, `192.168.x`).
2. **Safe Spawning**: No shell concatenation. Arguments are passed strictly as sanitized string arrays to `child_process`.
3. **Public Access Only**: Does not bypass private accounts, DRM, or login walls. Returns user-friendly error messages if content is restricted or private.
