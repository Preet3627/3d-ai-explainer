# Architecture Document

## Overview

3D AI Explainer is an Electron desktop application that enables users to:

1. Convert 2D images to 3D models via TripoSR (local AI)
2. Generate 2D images from text prompts via Stable Diffusion (local AI)
3. Interact with 3D scenes using natural voice
4. Receive AI-generated explanations read aloud via local TTS

The system is split into three process domains, each with distinct responsibilities.

---

## Process Model

### 1. Electron Main Process

**File:** `electron/main.ts`

Responsibilities:
- Window creation and lifecycle
- IPC handlers for renderer requests
- Deepgram WebSocket client (streams audio from renderer, returns transcriptions)
- Vercel AI SDK multi-provider LLM router
- Ollama HTTP client for local LLM
- Spawning / managing the Python backend child process
- File system operations (model storage, upload management)

**IPC Channels:**

| Channel | Direction | Payload |
|---|---|---|
| `stt:start` | Renderer → Main | Audio stream start |
| `stt:audio` | Renderer → Main | Raw PCM audio chunks |
| `stt:result` | Main → Renderer | Transcribed text |
| `ai:explain` | Renderer → Main | { text, context, provider } |
| `ai:response` | Main → Renderer | Explanation string |
| `model:convert` | Renderer → Main | { imagePath, options } |
| `model:ready` | Main → Renderer | { modelPath, glbUrl } |
| `python:status` | Main → Renderer | { running, busy, error } |

### 2. Electron Renderer Process

**File:** `src/renderer/`

Responsibilities:
- Three.js 3D scene rendering
- User interface (React components)
- Web Speech API TTS (local OS voices, no cloud cost)
- Microphone capture (MediaRecorder API)
- Camera controls (OrbitControls)
- Model loading and annotation display

**Component Tree:**

```
<App>
  ├── <TitleBar />        # App title, minimize/close
  ├── <ModelPanel />      # Upload image or text prompt input
  ├── <ThreeCanvas />     # Three.js viewport
  │   ├── <SceneManager>  # Setup + render loop
  │   ├── <ModelLoader>   # glTF/GLB loading
  │   └── <Annotations>   # 3D labels + highlights
  ├── <VoiceBar />        # Mic button, status, waveform
  └── <ProviderSelector /># LLM provider dropdown
```

### 3. Python Backend Process

**File:** `python-backend/`

Responsibilities:
- FastAPI HTTP server on `127.0.0.1:8765`
- TripoSR inference: 2D image → 3D mesh → glTF export
- Stable Diffusion inference: text prompt → 2D image
- Status reporting to main process

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Backend health check |
| POST | `/image-to-3d` | Upload image → returns glTF file path |
| POST | `/text-to-image` | Text prompt → returns image file path |
| POST | `/text-to-image-to-3d` | Text → image → 3D (composite) |
| GET | `/status` | GPU memory, queue depth |

---

## Data Flow Details

### Voice Interaction Flow

```
1. User clicks mic button
2. Renderer: navigator.mediaDevices.getUserMedia → AudioContext
3. Renderer: streams PCM audio chunks to main process via IPC
4. Main: Deepgram WebSocket client receives chunks
5. Deepgram: returns interim + final transcriptions
6. Main: sends final transcription to renderer via IPC
7. Renderer: displays transcription + sends to main for AI
8. Main: routes to selected LLM provider (Vercel AI SDK)
9. LLM: returns explanation with scene instructions
10. Main: returns explanation to renderer
11. Renderer: calls Web Speech API to speak explanation
12. Renderer: applies 3D annotations (highlight, spotlight, label)
```

### 2D → 3D Pipeline

```
1. User uploads an image (or types a text prompt)
2. If text prompt: sent to Python backend /text-to-image
   → Stable Diffusion generates a 2D image
3. Image sent to Python backend /image-to-3d
   → TripoSR runs inference
   → Exports glTF/GLB file to src/assets/models/
4. Python backend returns model file path
5. Main process forwards to renderer
6. Three.js loads the glTF model
7. Auto-rotation + environment lighting enabled
8. Model ready for voice interaction
```

---

## TTS Strategy

**Web Speech API** (window.speechSynthesis) is used for text-to-speech.

Reasons:
- Built into Chromium (Electron's renderer)
- **Fully local** – uses OS voices, no network requests
- **Free** – no API costs
- **Cross-platform** – works on macOS and Windows
- **Low latency** – no network round-trip

```typescript
// src/renderer/voice/tts.ts
const speak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.voice = speechSynthesis.getVoices().find(
      v => v.lang.startsWith('en')
    ) ?? null;
    speechSynthesis.speak(utterance);
  });
};
```

Limitation: macOS Siri voices and Windows Microsoft voices are both available but vary in quality. The app respects the user's default OS TTS voice selection.

---

## STT Strategy

**Deepgram** is used for speech-to-text via WebSocket.

Reasons:
- Real-time streaming (low latency, interim results)
- High accuracy with domain-specific vocabulary
- Simple Node.js SDK integration
- Pay-as-you-go pricing ($0.0043/min)

```typescript
// Main process: electron/main.ts (conceptual)
import { createClient } from '@deepgram/sdk';
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const connection = deepgram.listen.live({ model: 'nova-2', language: 'en-US' });
connection.on('transcript', (data) => {
  if (data.is_final) {
    mainWindow.webContents.send('stt:result', data.channel.alternatives[0].transcript);
  }
});
```

---

## LLM Provider Architecture

Using **Vercel AI SDK** for unified multi-provider access:

```
┌─────────────────────────────────┐
│          aiHandler.ts            │
│                                 │
│  switch(provider) {             │
│    'ollama'  → ollama.chat()    │
│    'openai'  → openai.chat()    │
│    'anthropic' → anthropic.chat()│
│    'google'  → google.chat()    │
│    'groq'    → groq.chat()      │
│    'xai'     → xai.chat()       │
│  }                              │
└─────────────────────────────────┘
```

This allows the user to select their preferred provider at runtime without code changes. Each provider receives the same prompt template with scene context:

```
System: "You are a 3D object explainer. The user is looking at [object name].
Explain what it is, what its key features are, and point out interesting details.
Keep explanations concise (2-4 sentences). Respond with JSON:
{ explanation: string, highlight: string[] }
where highlight is an array of part names to emphasize in the 3D scene."
```

---

## Security

- **No remote content loaded** in renderer (sandboxed)
- **contextBridge** used for IPC (no nodeIntegration)
- API keys stored in `.env`, never in code or committed to git
- Python backend only listens on `127.0.0.1` (localhost only)
- Generated models stored locally, never sent to cloud
- Deepgram audio streams are encrypted via WebSocket (WSS)
