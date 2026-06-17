# 3D AI Explainer

**Desktop application** for 3D visualization with AI-powered voice explanations. Upload or generate 2D images, convert them to 3D models, and interact with them through natural speech.

---

## Features

| Feature | Status | Details |
|---|---|---|
| **3D Viewport** (Three.js) | ✅ Complete | OrbitControls, 5-point lighting, PBR materials, grid/axes helpers, auto-rotation, atmospheric particles, drag-and-drop GLB |
| **2D → 3D Conversion** (TripoSR) | ✅ Complete | Local GPU inference via Python backend, GLB export, background removal |
| **Text → Image → 3D Pipeline** | ✅ Complete | Stable Diffusion → TripoSR pipeline |
| **Speech-to-Text** (Deepgram) | ✅ Complete | Real-time WebSocket streaming STT, Nova-2 model, interim results |
| **Text-to-Speech** (Web Speech API) | ✅ Complete | Local OS voices, no cloud dependency |
| **AI Explanations** (Vercel AI SDK) | ❌ Planned | Multi-provider: Ollama, OpenAI, Claude, Groq, Google, Grok |
| **3D Annotations** | ❌ Planned | Spotlights, labels, highlight linked to speech |
| **Cross-platform Packaging** | ✅ Complete | macOS + Windows + Linux via electron-builder |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    ELECTRON SHELL                     │
│                                                       │
│  ┌─── MAIN PROCESS (Node.js) ────────────────────┐   │
│  │  • Deepgram STT WebSocket                      │   │
│  │  • Python backend bridge (spawn/manage)        │   │
│  │  • Model file management                       │   │
│  └────────────────┬───────────────────────────────┘   │
│                    │ IPC (contextBridge)               │
│  ┌────────────────▼───────────────────────────────┐   │
│  │  RENDERER PROCESS (Chromium)                   │   │
│  │  • React 19 + Tailwind CSS 4 UI                │   │
│  │  • Three.js scene (OrbitControls, GLB loader)  │   │
│  │  • Web Speech API TTS (local OS voices)        │   │
│  │  • Mic capture → Int16 PCM → Deepgram          │   │
│  │  • Drag-and-drop GLB/GLTF files                │   │
│  └────────────────┬───────────────────────────────┘   │
│                    │ HTTP (JSON)                       │
│  ┌────────────────▼───────────────────────────────┐   │
│  │  PYTHON BACKEND (child process)                 │   │
│  │  • FastAPI server (127.0.0.1:8765)              │   │
│  │  • TripoSR – 2D image → 3D mesh (GLB export)   │   │
│  │  • Stable Diffusion – text → 2D image           │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Data Flow

```
User speaks ──► Deepgram STT ──► text ──► [Phase 4: Vercel AI SDK]
                                               │
                                   ┌───────────┴───────────┐
                                   ▼                       ▼
                             Web Speech TTS         3D Annotations
                             (local OS voice)       (highlight parts)

2D Upload / Text Prompt ──► Python Backend (TripoSR/SD) ──► .glb file
                                                                  │
                                                           Three.js scene
                                                      (auto-display, orbit)
```

---

## Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 | Electron + build tooling |
| [Python](https://python.org) | ≥ 3.10 | TripoSR, Stable Diffusion |
| [Ollama](https://ollama.ai) | ≥ 0.4 (optional) | Local LLM inference (Phase 4) |
| GPU (Apple MPS / NVIDIA CUDA) | ≥ 8GB VRAM | TripoSR / SD acceleration |

### API Keys (Deepgram required; at least one LLM provider for Phase 4)

Copy `.env.example` to `.env` and configure:

- [Deepgram](https://console.deepgram.com) – STT (required)
- [OpenAI](https://platform.openai.com) – GPT-4o
- [Anthropic](https://console.anthropic.com) – Claude
- [Google AI](https://aistudio.google.com) – Gemini
- [Groq](https://console.groq.com) – fast inference
- [xAI](https://console.x.ai) – Grok

---

## Quick Start

```bash
# 1. Install Node dependencies
npm install

# 2. Set up Python environment
bash scripts/setup-python.sh

# 3. Download model weights
bash scripts/download-models.sh

# 4. Configure API keys
cp .env.example .env
# Edit .env with your Deepgram API key

# 5. Start development (two terminals)
npm run python:server   # Terminal 1: Python backend
npm run dev             # Terminal 2: Electron app
```

---

## Usage

1. **Launch** – a 3D viewport with a placeholder cube fills the window
2. **Load a model** – drag-and-drop a `.glb`/`.gltf` file onto the viewport, click "Upload Image → 3D" to convert a photo, or "Text → 3D" to generate from a prompt
3. **Interact** – orbit/pan/zoom with mouse. The model auto-rotates
4. **Ask questions via voice** – click the mic button and speak. Transcription appears live. Tap the speaker button to hear it read back
5. **AI explains** (Phase 4) – the LLM generates an explanation, TTS reads it aloud, and the 3D scene highlights relevant parts

---

## Development Commands

```bash
npm run dev              # Start dev server (Electron + Vite)
npm run typecheck        # TypeScript check (strict mode)
npm run build            # Production build
npm run lint             # ESLint
npm run package:mac      # macOS distribution (.dmg)
npm run package:win      # Windows distribution (.exe)
npm run package:linux    # Linux distribution (.AppImage)
```

---

## Project Structure

```
src/
  main/                  # Electron main process
    index.ts             # App entry, IPC handlers, env loading
    pythonBridge.ts      # FastAPI process manager
    modelManager.ts      # Model file operations
    deepgramClient.ts    # Deepgram WebSocket STT client
  preload/
    index.ts             # contextBridge API (electronAPI)
  renderer/
    index.html
    src/
      App.tsx            # Root component
      components/
        ThreeCanvas.tsx  # React ↔ Three.js bridge
        VoiceBar.tsx     # Mic button, transcript, TTS
      three/
        scene.ts         # SceneManager (lighting, controls, helpers)
        modelLoader.ts   # GLTF/GLB loader with DRACO
      voice/
        microphone.ts    # Mic capture → Int16 PCM @ 16kHz
        tts.ts           # Web Speech API wrapper
  types/
    electron.d.ts        # Window.electronAPI declarations
python-backend/
  server.py              # FastAPI (health, image-to-3d, text-to-image)
  triposr_worker.py      # TripoSR inference
  stable_diffusion_worker.py  # Stable Diffusion inference
scripts/
  setup-python.sh        # Python venv + deps
  download-models.sh     # TripoSR weights
```

---

## Tech Stack

| Category | Technology |
|---|---|
| **Desktop** | Electron 33 |
| **3D Engine** | Three.js r170 |
| **UI** | React 19 + Tailwind CSS 4 |
| **Build** | electron-vite + electron-builder |
| **STT** | Deepgram Nova-2 (WebSocket) |
| **TTS** | Web Speech API (local OS voices) |
| **Image → 3D** | TripoSR (PyTorch) |
| **Text → Image** | Stable Diffusion (diffusers) |
| **AI SDK** | Vercel AI SDK v4 (Phase 4) |

## Release

Builds are automated via GitHub Actions. See `.github/workflows/release.yml`.

---

## License

Copyright 2026 Latestinssan

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

---

*Innovation idea thanks to **Daksh Patel** for the original concept and vision.*
