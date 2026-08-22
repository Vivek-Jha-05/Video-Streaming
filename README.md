# 📹 Family Videos — Simple Personal Video Streaming Platform

A **clean, simple, zero-cost video streaming platform** designed specifically for your family videos. No complex Netflix clone clutter, no categories or suggestion structures — just your videos, a fast search bar, effortless uploads, and automatic file detection.

---

## 🌟 How Adding Videos Works (2 Super Easy Ways!)

### 🚀 Method 1: Automatic Live Detection (Easiest!)
1. Just drag and drop or copy any `.mp4`, `.webm`, or `.mov` files into:
   ```text
   public/videos/
   ```
2. Open or refresh the website.
3. **That's it!** The platform automatically scans `public/videos/`, extracts clean titles from filenames (e.g. `Summer_Roadtrip_2024.mp4` &rarr; `"Summer Roadtrip 2024"`), computes the file size and date, and displays the video in your library immediately!

### 📤 Method 2: Direct Browser Upload with Live Progress
1. Open the platform in your browser at [http://localhost:3000](http://localhost:3000).
2. Click the **"Upload Video"** button.
3. Drag and drop your video file into the popup.
4. Watch the live upload progress bar (`0% → 100%`). It saves the file directly into `public/videos/` with zero RAM buffering!

---

## 🚀 Quick Start

### 1. Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎥 Features

- 👨‍👩‍👧‍👦 **Simple, Clean Family Interface**: Straightforward gallery of all your family videos with title, date, duration, and poster.
- 🔍 **Instant Search Bar**: Filter videos as you type right on the home page.
- ⚡ **No Authentication / Hassle-Free Watching**: Anyone with your platform link can open and watch immediately.
- 💾 **Smart Watch Progress**: Each family member's device remembers their own playback progress automatically.
- 🎥 **Fast HTTP Range Streaming (`206 Partial Content`)**: Streams `.mp4`, `.webm`, `.mov` files directly from `public/videos/` with zero server memory overhead and instant seeking.
- 🎛️ **Clean Video Player**: Play/Pause with spacebar, fast forward / rewind 10s (`←` / `→`), volume slider, speed controls (0.5x to 2x), fullscreen, and PiP.

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
