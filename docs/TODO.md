# Project TODO

**Last updated:** 2026-06-17

**Legend:**
- ✅ Done
- 🔄 In Progress
- ❌ Not Started
- ⏸️ Blocked / Deferred

---

## Phase 1: Scaffold & 3D Viewport

| ID | Task | Status | Depends On |
|---|---|---|---|
| 1.1 | Initialize Electron + TypeScript + Vite project | ❌ | – |
| 1.2 | Set up React + Tailwind in renderer | ❌ | 1.1 |
| 1.3 | Create Three.js scene (scene, camera, renderer) | ❌ | 1.2 |
| 1.4 | Add OrbitControls (rotate, pan, zoom) | ❌ | 1.3 |
| 1.5 | Add environment lighting (ambient, directional, HDR) | ❌ | 1.4 |
| 1.6 | Implement glTF/GLB model loader with progress bar | ❌ | 1.5 |
| 1.7 | Create responsive ThreeCanvas React component | ❌ | 1.3 |
| 1.8 | Add grid helper + axis helper | ❌ | 1.4 |
| 1.9 | Auto-rotation toggle | ❌ | 1.6 |
| 1.10 | Render a sample cube as placeholder | ❌ | 1.2 |

### Verification: `npm run dev` shows a 3D viewport with a rotating cube

---

## Phase 2: Python Backend & 3D Generation

| ID | Task | Status | Depends On |
|---|---|---|---|
| 2.1 | Create FastAPI server skeleton with `/health` endpoint | ❌ | – |
| 2.2 | Write `setup-python.sh` (venv + PyTorch + dependencies) | ❌ | – |
| 2.3 | Write `download-models.sh` (TripoSR weights) | ❌ | – |
| 2.4 | Integrate TripoSR: `/image-to-3d` endpoint | ❌ | 2.1, 2.3 |
| 2.5 | Export 3D mesh as glTF/GLB | ❌ | 2.4 |
| 2.6 | Integrate Stable Diffusion: `/text-to-image` endpoint | ❌ | 2.1 |
| 2.7 | Composite endpoint: `/text-to-image-to-3d` | ❌ | 2.5, 2.6 |
| 2.8 | Create PythonBridge in main process (spawn FastAPI) | ❌ | 2.1 |
| 2.9 | IPC handler: `model:convert` → PythonBridge | ❌ | 2.8, 1.1 |
| 2.10 | Error handling: GPU memory, timeout, invalid images | ❌ | 2.4, 2.6 |

### Verification: Upload a photo → glTF file appears in `src/assets/models/`

---

## Phase 3: Voice Interaction (STT + TTS)

| ID | Task | Status | Depends On |
|---|---|---|---|
| 3.1 | Deepgram WebSocket client in main process | ❌ | 1.1 |
| 3.2 | Microphone capture in renderer (MediaRecorder) | ❌ | 1.2 |
| 3.3 | IPC stream: renderer audio chunks → Deepgram | ❌ | 3.1, 3.2 |
| 3.4 | Deepgram transcription → renderer display | ❌ | 3.3 |
| 3.5 | Web Speech API TTS wrapper module | ❌ | 1.2 |
| 3.6 | Create VoiceBar component (mic button + status) | ❌ | 3.2, 3.5 |
| 3.7 | Push-to-talk vs toggle mode setting | ❌ | 3.6 |
| 3.8 | Voice activity detection (VAD) for auto-stop | ❌ | 3.3 |
| 3.9 | Interim transcript display (live text) | ❌ | 3.4 |

### Verification: Click mic, speak "hello" → transcribed text appears → TTS speaks it back

---

## Phase 4: AI Explanations

| ID | Task | Status | Depends On |
|---|---|---|---|
| 4.1 | Vercel AI SDK multi-provider router | ❌ | 1.1 |
| 4.2 | Ollama client integration | ❌ | 4.1 |
| 4.3 | OpenAI provider integration | ❌ | 4.1 |
| 4.4 | Anthropic (Claude) provider integration | ❌ | 4.1 |
| 4.5 | Google (Gemini) provider integration | ❌ | 4.1 |
| 4.6 | Groq provider integration | ❌ | 4.1 |
| 4.7 | xAI (Grok) provider integration | ❌ | 4.1 |
| 4.8 | Explanation prompt template with scene context | ❌ | 4.1 |
| 4.9 | ProviderSelector component (UI dropdown) | ❌ | 1.2 |
| 4.10 | Explanation history / chat log | ❌ | 4.1 |

### Verification: Select provider, ask "what is this object?" → AI explains → TTS reads it

---

## Phase 5: 3D Annotations & Visuals

| ID | Task | Status | Depends On |
|---|---|---|---|
| 5.1 | AnnotationSystem class (labels + highlight) | ❌ | 1.3, 1.6 |
| 5.2 | Object highlighting via outline shader | ❌ | 5.1 |
| 5.3 | Spotlight animation on highlighted object | ❌ | 5.2 |
| 5.4 | CSS2D label sprites (floating text in 3D) | ❌ | 5.1 |
| 5.5 | Wire explanation ↔ annotation linkage | ❌ | 5.1, 4.1 |
| 5.6 | Model auto-rotation with pause-on-interact | ❌ | 1.9 |
| 5.7 | Smooth camera transitions (focus on object) | ❌ | 1.4 |
| 5.8 | Loading screen / splash animation | ❌ | 1.2 |

### Verification: Speak "highlight the top part" → 3D model highlights + label appears

---

## Phase 6: UI Polish & Packaging

| ID | Task | Status | Depends On |
|---|---|---|---|
| 6.1 | ModelPanel component (upload + text prompt UI) | ❌ | 1.2 |
| 6.2 | Image preview before conversion | ❌ | 6.1 |
| 6.3 | Recent models gallery with thumbnails | ❌ | 6.1, 2.9 |
| 6.4 | Dark theme UI (Tailwind) | ❌ | 1.2 |
| 6.5 | Settings panel (LLM provider, voice, theme) | ❌ | 1.2 |
| 6.6 | electron-builder configuration (macOS + Windows) | ❌ | 1.1 |
| 6.7 | Code signing setup (macOS notarization) | ❌ | 6.6 |
| 6.8 | CI/CD pipeline (GitHub Actions) | ❌ | 6.6 |
| 6.9 | Error boundaries + crash reporting | ❌ | 1.2 |
| 6.10 | App icon + splash screen | ❌ | 6.6 |

### Verification: `npm run package:mac` produces a valid .dmg

---

## Phase 7: Testing & Refinement

| ID | Task | Status | Depends On |
|---|---|---|---|
| 7.1 | Unit tests: SceneManager, ModelLoader, TTS | ❌ | All P1-P2 |
| 7.2 | Integration test: STT → AI → TTS pipeline | ❌ | All P3-P4 |
| 7.3 | Performance profiling (GPU memory, frame rate) | ❌ | All P1-P5 |
| 7.4 | Error handling for missing API keys | ❌ | All P3-P4 |
| 7.5 | GPU fallback (CPU mode for TripoSR) | ❌ | 2.4 |
| 7.6 | User documentation / help screen | ❌ | 6.9 |

---

## Summary

| Phase | Total Tasks | ✅ Done | 🔄 In Progress | ❌ Not Started |
|---|---|---|---|---|
| P1: Scaffold & 3D | 10 | 0 | 0 | 10 |
| P2: Python Backend | 10 | 0 | 0 | 10 |
| P3: Voice | 9 | 0 | 0 | 9 |
| P4: AI Explanations | 10 | 0 | 0 | 10 |
| P5: Annotations | 8 | 0 | 0 | 8 |
| P6: UI & Packaging | 10 | 0 | 0 | 10 |
| P7: Testing | 6 | 0 | 0 | 6 |
| **Total** | **63** | **0** | **0** | **63** |
