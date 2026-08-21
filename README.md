# 📹 Family Videos — Simple Personal Video Streaming Platform

A **clean, simple, zero-cost video streaming platform** designed specifically for your family videos. No complex Netflix clone clutter, no categories or suggestion structures — just your videos, a fast search bar, and instant playback.

---

## 🌟 Features

- 👨‍👩‍👧‍👦 **Simple, Clean Family Interface**:
  - No complex categories, algorithms, or suggestion rows.
  - Straightforward gallery of all your family videos with title, date, duration, and poster.
  - Search bar to instantly filter videos as you type.
- ⚡ **No Authentication / Hassle-Free Watching**:
  - Anyone with your platform link can open and watch immediately.
  - Each family member's device remembers their own playback progress automatically.
- 🎥 **Fast HTTP Range Streaming (`206 Partial Content`)**:
  - Streams `.mp4`, `.webm`, `.mov` files directly from `public/videos/`.
  - Zero server memory overhead and instant seek across large videos.
- 🎛️ **Clean Video Player**:
  - Play/Pause with spacebar
  - Fast forward / Rewind 10s (`←` / `→`)
  - Volume slider and mute toggle
  - Speed Controls (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
  - Fullscreen & Picture-in-Picture mode
  - Auto-resumes playback from where you left off.
- 📁 **Simple Video Management & Folder Scanner**:
  - Drop video files into `public/videos/`.
  - Open `/manage` and click **Scan Folder** &rarr; **Add to Library** to index new videos in 1 click!

---

## 🚀 Quick Start

### 1. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 How to Add Your Videos

1. **Place your video files** (`.mp4`, `.webm`, `.mov`) in:
   ```text
   public/videos/
   ```
2. Open **[http://localhost:3000/manage](http://localhost:3000/manage)** and switch to the **Scan Folder** tab.
3. Click **"Add to Library"** next to your video and save!

---

## ⌨️ Player Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` or `K` | Play / Pause |
| `←` or `J` | Rewind 10 seconds |
| `→` or `L` | Fast Forward 10 seconds |
| `↑` / `↓` | Volume Up / Down |
| `F` | Fullscreen |
| `M` | Mute |
| `P` | Picture-in-Picture |
