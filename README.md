# 3D AI Explainer

**Desktop application** for 3D visualization with AI-powered voice explanations. Upload or generate 2D images, convert them to 3D models, and interact with them through natural speech.

---

## Features

| Feature | Status | Details |
|---|---|---|
| **3D Viewport** (Three.js) | ❌ Not started | Orbital controls, lighting, PBR materials |
| **2D → 3D Conversion** (TripoSR) | ❌ Not started | Local GPU inference via Python backend |
| **Text → Image → 3D Pipeline** | ❌ Not started | Stable Diffusion → TripoSR pipeline |
| **Speech-to-Text** (Deepgram) | ❌ Not started | Real-time WebSocket streaming STT |
| **Text-to-Speech** (Web Speech API) | ❌ Not started | Local OS voices, no cloud dependency |
| **AI Explanations** (Vercel AI SDK) | ❌ Not started | Multi-provider: Ollama, OpenAI, Claude, Groq, Google, Grok |
| **3D Annotations** | ❌ Not started | Spotlights, labels, highlight linked to speech |
| **Cross-platform Packaging** | ❌ Not started | macOS + Windows + Linux |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    ELECTRON SHELL                     │
│                                                       │
│  ┌─── MAIN PROCESS (Node.js) ────────────────────┐   │
│  │  • Deepgram STT WebSocket                      │   │
│  │  • Vercel AI SDK (multi-provider LLM router)   │   │
│  │  • Ollama client for local LLM                 │   │
│  │  • Python backend bridge (spawn/manage)        │   │
│  └────────────────┬───────────────────────────────┘   │
│                    │ IPC                               │
│  ┌────────────────▼───────────────────────────────┐   │
│  │  RENDERER PROCESS (Chromium)                   │   │
│  │  • React + Tailwind UI                         │   │
│  │  • Three.js scene (OrbitControls, glTF loader) │   │
│  │  • Web Speech API TTS (local)                  │   │
│  │  • Mic capture → Deepgram                      │   │
│  └────────────────┬───────────────────────────────┘   │
│                    │ HTTP                              │
│  ┌────────────────▼───────────────────────────────┐   │
│  │  PYTHON BACKEND (child process)                 │   │
│  │  • FastAPI server (port 8765)                   │   │
│  │  • TripoSR – 2D image → 3D mesh (glTF export)  │   │
│  │  • Stable Diffusion – text → 2D image          │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Data Flow

```
User speaks ──► Deepgram STT ──► text ──► Vercel AI SDK / Ollama
                                              │
                                  ┌───────────┴───────────┐
                                  ▼                       ▼
                            Web Speech TTS         Three.js highlight
                            (local OS voice)       (annotate object)

2D Upload / Text Prompt ──► Python Backend (TripoSR/SD) ──► .glb file
                                                                 │
                                                          Three.js scene
                                                          (auto-display)
```

---

## Prerequisites

| Dependency | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 | Electron + build tooling |
| [Python](https://python.org) | ≥ 3.10 | TripoSR, Stable Diffusion |
| [Ollama](https://ollama.ai) | ≥ 0.4 (optional) | Local LLM inference |
| GPU (NVIDIA CUDA) | ≥ 8GB VRAM (optional) | TripoSR / SD acceleration |

### API Keys (at least one LLM provider + Deepgram)

- [Deepgram](https://console.deepgram.com) – STT
- [OpenAI](https://platform.openai.com) – GPT-4o
- [Anthropic](https://console.anthropic.com) – Claude
- [Google AI](https://aistudio.google.com) – Gemini
- [Groq](https://console.groq.com) – fast inference
- [xAI](https://console.x.ai) – Grok

---

## Setup

### 1. Node.js dependencies

```bash
npm install
```

### 2. Python environment

```bash
bash scripts/setup-python.sh
```

This creates a virtual environment and installs PyTorch, TripoSR, diffusers, and FastAPI.

### 3. Download model weights

```bash
bash scripts/download-models.sh
```

Downloads TripoSR pretrained weights and optionally Stable Diffusion weights.

### 4. Environment configuration

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 5. Start development

**Terminal 1** – Python backend:
```bash
npm run python:server
```

**Terminal 2** – Electron app:
```bash
npm run dev
```

---

## Usage

1. **Launch** the app – a 3D viewport fills the main window
2. **Load a model** – click "Upload Image" (any 2D photo) or type a text prompt → AI generates a 2D image → converts to 3D
3. **Interact** – orbit/pan/zoom with mouse. The 3D model auto-rotates
4. **Ask questions via voice** – click the mic button and speak (e.g., *"What is this object?"* or *"Highlight the main feature"*)
5. **AI explains** – the LLM generates an explanation, TTS reads it aloud, and the 3D scene animates/highlights relevant parts

---

## TODO / Roadmap

| Phase | Task | Status |
|---|---|---|
| **P1** | Electron + React + Three.js scaffold | ❌ |
| P1 | Three.js scene with OrbitControls and grid helper | ❌ |
| P1 | glTF/GLB model loader with PBR materials | ❌ |
| **P2** | Python backend: FastAPI server | ❌ |
| P2 | TripoSR integration (2D → 3D mesh) | ❌ |
| P2 | Stable Diffusion pipeline (text → image) | ❌ |
| P2 | Python → Electron IPC bridge | ❌ |
| **P3** | Deepgram WebSocket STT (real-time) | ❌ |
| P3 | Web Speech API TTS wrapper | ❌ |
| P3 | Voice bar UI (mic button, status, waveform) | ❌ |
| **P4** | Vercel AI SDK multi-provider router | ❌ |
| P4 | Ollama client for local LLM | ❌ |
| P4 | Explanation generation prompt engineering | ❌ |
| **P5** | 3D annotations linked to speech highlights | ❌ |
| P5 | Auto-rotate, spotlight, fade animations | ❌ |
| **P6** | Upload panel + text-to-image prompt UI | ❌ |
| P6 | Product packaging (electron-builder) | ❌ |
| P6 | Cross-platform CI/CD | ❌ |

---

## Development

```bash
# Type checking
npm run typecheck

# Lint
npm run lint

# Package for distribution
npm run package:mac   # macOS
npm run package:win   # Windows
npm run package:linux # Linux
```

---

## Tech Stack

| Category | Technology |
|---|---|
| **Desktop** | Electron 33 |
| **3D Engine** | Three.js + @types/three |
| **UI** | React 19 + Tailwind CSS 4 |
| **Build** | electron-vite + electron-builder |
| **STT** | Deepgram SDK (WebSocket) |
| **TTS** | Web Speech API (local OS voices) |
| **AI SDK** | Vercel AI SDK v4 |
| **Local LLM** | Ollama |
| **Image → 3D** | TripoSR (PyTorch) |
| **Text → Image** | Stable Diffusion (diffusers) |

---

## License

MIT
