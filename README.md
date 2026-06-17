# 3D AI Explainer

**Speak to your 3D models.** A desktop application that lets you upload or generate 3D models, then ask questions about them using natural voice — the AI explains what you're seeing while the scene highlights and annotates the model in real time.

---

## What It Does

### Talk to your 3D models

Click the microphone, ask *"What is this object?"* or *"Explain the structure"* — and the app responds:

1. **Deepgram** transcribes your speech in real time (streaming WebSocket, Nova-2 model)
2. **Vercel AI SDK** routes your question to your chosen LLM (Ollama, OpenAI, Anthropic, Google, Groq, or xAI)
3. The 3D model **glows with a pulsing highlight**, a **floating label** appears with the answer, and an **orbiting spotlight** sweeps over the object
4. **Web Speech API** reads the explanation aloud using local OS voices

### Load models however you want

| Method | How |
|---|---|
| **Drag & drop** | Drop `.glb` or `.gltf` files from Finder onto the viewport |
| **2D → 3D** | Upload any photo — TripoSR converts it to a 3D mesh locally |
| **Text → 3D** | Type a description — Stable Diffusion generates an image, then TripoSR converts it |

### Configure without touching config files

The **Settings panel** (gear icon in header) lets you configure:

- **Deepgram API key** (required for voice)
- **LLM provider + model** (Ollama, OpenAI, Anthropic, Google, Groq, xAI)
- **Per-provider API keys** (stored securely in `userData/settings.json`)
- **Temperature and max tokens** for LLM responses
- **Ollama base URL** for local inference

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON SHELL                        │
│                                                          │
│  ┌─── MAIN PROCESS (Node.js) ───────────────────────┐   │
│  │  • Deepgram STT WebSocket client                  │   │
│  │  • Vercel AI SDK multi-provider router            │   │
│  │  • Python backend lifecycle (spawn, health, stop) │   │
│  │  • Settings persistence (JSON in userData)        │   │
│  │  • IPC handler for all renderer requests          │   │
│  └────────────────┬──────────────────────────────────┘   │
│                    │ contextBridge IPC                     │
│  ┌────────────────▼──────────────────────────────────┐   │
│  │  RENDERER PROCESS (Chromium)                      │   │
│  │                                                    │   │
│  │  ┌─ React 19 + Tailwind CSS 4 ───────────────────┐ │   │
│  │  │  • App.tsx — root, wires pipelines             │ │   │
│  │  │  • VoiceBar — mic, transcript, explain button  │ │   │
│  │  │  • ChatOverlay — message history, text input   │ │   │
│  │  │  • SettingsPanel — API keys, provider, params  │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                    │   │
│  │  ┌─ Three.js ─────────────────────────────────────┐ │   │
│  │  │  • SceneManager — scene, camera, controls      │ │   │
│  │  │  • ModelLoader — GLTF/GLB + DRACO, auto-scale  │ │   │
│  │  │  • AnnotationSystem — glow, label, spotlight   │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                    │   │
│  │  ┌─ Voice ────────────────────────────────────────┐ │   │
│  │  │  • Microphone — getUserMedia → Int16 PCM       │ │   │
│  │  │  • TTS — Web Speech API (local, no cloud)      │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └────────────────┬──────────────────────────────────┘   │
│                    │ HTTP (JSON)                          │
│  ┌────────────────▼──────────────────────────────────┐   │
│  │  PYTHON BACKEND (child process)                    │   │
│  │  • FastAPI server on 127.0.0.1:8765                │   │
│  │  • TripoSR — 2D image → 3D mesh (GLB export)      │   │
│  │  • Stable Diffusion — text → 2D image              │   │
│  │  • MPS/CUDA acceleration, rembg background removal │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Process Boundaries

| Boundary | Protocol | Security |
|---|---|---|
| Renderer ↔ Main | IPC via `contextBridge` | `contextIsolation: true`, `nodeIntegration: false` |
| Main ↔ Python | HTTP to `127.0.0.1:8765` | JSON body, localhost only |
| Main ↔ Deepgram | WebSocket to `api.deepgram.com` | API key in header |
| Renderer → TTS | Web Speech API | Direct, no IPC needed |

### Data Flow: Voice Question → AI Explanation → 3D Annotation

```
User speaks
    │
    ▼
getUserMedia → ScriptProcessorNode → Int16 PCM @ 16kHz
    │
    ▼
IPC (stt:audio chunks) → Main process
    │
    ▼
Deepgram WebSocket (Nova-2, streaming)
    │
    ▼
IPC (stt:result) → Renderer
    │
    ▼
IPC (ai:explain) → Main → Vercel AI SDK → LLM Provider
    │
    ▼
IPC (response) → Renderer
    ├──► Three.js AnnotationSystem: emissive glow pulse + floating label + orbiting spotlight
    └──► Web Speech API TTS: explanation read aloud
```

### Why Electron + Python?

**Electron** provides a secure desktop shell with full Node.js and Chromium access. The renderer runs React and Three.js natively, while the main process handles sensitive operations (API keys, process management, WebSocket connections) in a sandboxed Node.js environment.

**Python sidecar** (FastAPI child process) was chosen because TripoSR and Stable Diffusion are Python-native (PyTorch). Running them as a separate process keeps the UI responsive — the Electron main process isn't blocked by GPU inference. Communication is JSON HTTP, which is debuggable with any HTTP client.

**Vercel AI SDK** provides a unified API across 6 LLM providers with a single `generateText()` call. Adding a new provider is a 5-line case in the router. Ollama runs locally (no API key, no data leaves your machine); the rest are cloud.

---

## Tech Stack

| Category | Technology | Why |
|---|---|---|
| **Desktop** | Electron 33 | Mature, sandboxed, cross-platform |
| **3D Engine** | Three.js r170 | GLTF/GLB native, DRACO, PBR, post-processing |
| **UI** | React 19 + Tailwind CSS 4 | Fast dev cycle, utility-first styling |
| **Build** | electron-vite + electron-builder | Fast HMR, proper packaging |
| **STT** | Deepgram (Nova-2) | Real-time streaming, 0.5s latency |
| **TTS** | Web Speech API | Free, local, zero latency, no cloud |
| **Image → 3D** | TripoSR (PyTorch) | 0.8s inference, MPS/CUDA |
| **Text → Image** | Stable Diffusion (diffusers) | Local, no API costs |
| **AI Router** | Vercel AI SDK v6 | 6 providers, one API, Ollama support |

---

## Quick Start

```bash
# 1. Install Node dependencies
npm install

# 2. Set up Python environment (venv + PyTorch + TripoSR)
bash scripts/setup-python.sh

# 3. Download TripoSR model weights (1.6 GB)
bash scripts/download-models.sh

# 4. Configure API keys
cp .env.example .env
# Edit .env — at minimum set DEEPGRAM_API_KEY
# LLM keys can also be set in the Settings UI

# 5. Start (two terminals)
npm run python:server   # Terminal 1: Python backend on :8765
npm run dev             # Terminal 2: Electron app with HMR
```

### Prerequisites

| Dependency | Required | For |
|---|---|---|
| Node.js ≥ 20 | Always | Electron + build |
| Python ≥ 3.10 | 3D conversion | TripoSR, Stable Diffusion |
| Deepgram API key | Voice features | Speech-to-text |
| Ollama (optional) | Local AI | Offline LLM, no API key needed |
| GPU (MPS/CUDA ≥ 8GB) | Speed | TripoSR inference (< 1s vs minutes on CPU) |

---

## Usage Walkthrough

### 1. Launch

The app opens to a 3D viewport with a placeholder cube, atmospheric particles, and a dark theme UI. The header shows the Python backend status (green = connected).

### 2. Load a model

- **Drag and drop** a `.glb` or `.gltf` file onto the viewport — the viewport highlights during hover
- **Upload Image → 3D** — select a photo; TripoSR converts it and loads the result automatically
- **Text → 3D** — describe what you want; Stable Diffusion generates an image, then TripoSR converts it

The model is auto-centered, auto-scaled to fit the viewport, and begins orbiting. A progress bar shows during loading.

### 3. Interact

- **Orbit** — left-click drag
- **Pan** — right-click drag or scroll-wheel
- **Zoom** — scroll or pinch
- Auto-rotation is enabled by default

### 4. Ask questions

**Via voice:**
1. Click the microphone button (bottom center)
2. Wait for the yellow connecting indicator → red pulsing = recording
3. Speak your question
4. Click the **checkmark button** to send to AI
5. The model glows, a label floats above with the answer, a spotlight sweeps around it
6. The explanation is read aloud by the system voice

**Via chat:**
1. Click the chat icon (header)
2. Type a question and press Enter
3. The response appears in the chat and the 3D scene annotates simultaneously

### 5. Configure

Click the gear icon in the header to open Settings:

- **API Keys** — set Deepgram and LLM provider keys
- **Model** — choose active provider, model name, temperature, max tokens
- Settings persist across app restarts

---

## Project Structure

```
src/
  main/                        # Electron main process
    index.ts                   # App entry, IPC handlers, env loader
    pythonBridge.ts            # Spawns/manages FastAPI child process
    modelManager.ts            # File operations for generated models
    deepgramClient.ts          # Deepgram WebSocket client (Nova-2)
    settingsStore.ts           # Settings persistence (userData/settings.json)
    aiProvider.ts              # Vercel AI SDK router for 6 LLM providers
  preload/
    index.ts                   # contextBridge: 15 IPC methods exposed as electronAPI
  renderer/
    src/
      App.tsx                  # Root: wires STT → AI → annotation → TTS pipeline
      components/
        ThreeCanvas.tsx        # React ↔ Three.js bridge, drag-and-drop, ref handle
        VoiceBar.tsx           # Mic button, states, transcript, explain trigger
        ChatOverlay.tsx        # Slide-out message history, text input
        SettingsPanel.tsx      # 3-tab modal: API Keys, Model, About
      three/
        scene.ts               # SceneManager: lighting, helpers, model loading, annotations
        modelLoader.ts         # GLTFLoader + DRACO, auto-center, auto-scale
        annotationSystem.ts    # Emissive glow pulse, canvas sprite label, orbiting spotlight
      voice/
        microphone.ts          # getUserMedia → ScriptProcessorNode → Int16 PCM @ 16kHz
        tts.ts                 # Web Speech API: speak(), stopSpeaking(), voice selection
      context/
        SettingsContext.tsx    # React context: loads/saves settings via IPC
  types/
    electron.d.ts              # Window.electronAPI TypeScript declarations
    settings.ts                # AppSettings, LLMProvider, ChatMessage types
python-backend/
  server.py                    # FastAPI: /health, /image-to-3d, /text-to-image, /text-to-image-to-3d
  triposr_worker.py            # TripoSR: load checkpoint, infer, mesh extraction, GLB export
  stable_diffusion_worker.py   # Stable Diffusion: text → 2D image pipeline
scripts/
  setup-python.sh              # Creates venv, installs PyTorch + TripoSR + deps
  download-models.sh           # Downloads TripoSR checkpoint via HuggingFace hub
.github/workflows/
  release.yml                  # CI: builds macOS (.dmg), Windows (.exe), Linux (.AppImage)
```

---

## Commands

```bash
npm run dev              # Development server (Electron + Vite HMR)
npm run build            # Production build (electron-vite)
npm run typecheck        # TypeScript strict check
npm run lint             # ESLint
npm run python:server    # Start Python backend (uvicorn)
npm run python:setup     # Create venv + install Python deps
npm run models:download  # Download TripoSR weights
npm run package:mac      # macOS .dmg + .zip
npm run package:win      # Windows .exe + .zip
npm run package:linux    # Linux .AppImage + .deb
```

---

## Release

Automated via GitHub Actions. Pushing a `v*` tag triggers:

1. Build matrix: macOS (arm64 + x64), Windows (x64), Linux (x64)
2. Artifacts uploaded to GitHub Release
3. Full release notes generated from commit history

---

## License

Copyright 2026 Latestinssan — Apache 2.0

---

*Innovation idea thanks to **Daksh Patel** for the original concept and vision.*
