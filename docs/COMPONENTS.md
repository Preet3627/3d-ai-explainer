# Component Reference

## Renderer Components

### `<ThreeCanvas />`

**Path:** `src/renderer/components/ThreeCanvas.tsx`

The primary 3D viewport. Manages the Three.js lifecycle (scene, camera, renderer, animation loop).

**Props:**
```typescript
interface ThreeCanvasProps {
  modelPath?: string;       // Path to .glb file to load
  annotations?: Annotation[];  // 3D annotations to display
  onLoad?: () => void;      // Called when model finishes loading
  className?: string;       // CSS classes for container
}
```

**Internal state:**
- SceneManager instance
- Current model (THREE.Group)
- Array of annotation sprites/lines
- Animation loop ID

**Keyboard shortcuts:**
- `R` – Reset camera
- `Space` – Toggle auto-rotation
- `F` – Focus on selected object

---

### `<VoiceBar />`

**Path:** `src/renderer/components/VoiceBar.tsx`

Floating microphone control bar, typically docked at the bottom of the viewport.

**Props:**
```typescript
interface VoiceBarProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  onToggleListening: () => void;
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  interimText?: string;     // Live partial transcript
  className?: string;
}
```

**States:**
| State | Visual | Behavior |
|---|---|---|
| `idle` | Gray mic icon | Waiting for user to click |
| `listening` | Pulsing red mic, waveform animation | Audio streaming to Deepgram |
| `processing` | Spinner over mic | Waiting for LLM response |
| `speaking` | Green speaker icon | TTS is playing |

---

### `<ModelPanel />`

**Path:** `src/renderer/components/ModelPanel.tsx`

Sidebar or modal for loading/generating 3D models.

**Props:**
```typescript
interface ModelPanelProps {
  onModelLoaded: (path: string) => void;
  isGenerating: boolean;
  onGenerateStart: () => void;
}
```

**Tabs:**
1. **Upload Image** – File picker (jpg, png, webp) → Convert to 3D
2. **Text to 3D** – Text prompt → Stable Diffusion → TripoSR
3. **Recent** – List of previously generated models with thumbnails

---

### `<ProviderSelector />`

**Path:** `src/renderer/components/ProviderSelector.tsx`

Dropdown to select the active LLM provider.

**Options:**
- Ollama (local)
- OpenAI (GPT-4o)
- Anthropic (Claude)
- Google (Gemini)
- Groq (fast inference)
- xAI (Grok)

Shows a colored dot indicator per provider (green = connected, red = no key configured).

---

## Three.js Modules

### `SceneManager.ts`

**Path:** `src/renderer/three/SceneManager.ts`

Manages the Three.js core components.

```typescript
class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;

  constructor(container: HTMLElement);
  addModel(model: THREE.Group): void;
  removeModel(): void;
  highlightObject(name: string): void;
  resetCamera(): void;
  dispose(): void;
}
```

**Lighting setup:**
- AmbientLight (soft fill)
- DirectionalLight (primary shadow)
- HemisphereLight (sky/ground bounce)
- Environment map (for reflections, loaded from HDR)

---

### `ModelLoader.ts`

**Path:** `src/renderer/three/ModelLoader.ts`

Handles loading glTF/GLB files with progress reporting.

```typescript
class ModelLoader {
  static load(
    path: string,
    onProgress?: (percent: number) => void
  ): Promise<THREE.Group>;
}
```

Returns a properly scaled and centered group with PBR materials intact.

---

### `Annotations.ts`

**Path:** `src/renderer/three/Annotations.ts`

Creates 3D labels and highlight effects tied to explanation content.

```typescript
interface Annotation {
  objectName: string;
  label: string;
  color?: string;
  highlightDuration?: number;  // ms
}

class AnnotationSystem {
  addAnnotation(annotation: Annotation): void;
  clearAnnotations(): void;
  pulseObject(name: string): void;
  spotlightObject(name: string): void;
}
```

**Highlight effects:**
- Pulsing outline via custom shader or fresnel effect
- Label sprite (CSS2DRenderer or sprite text)
- Spotlight cone originating from camera toward the object

---

## Voice Modules

### `stt.ts` (Renderer)

**Path:** `src/renderer/voice/stt.ts`

Client-side microphone capture and streaming to main process.

```typescript
class STTClient {
  private mediaRecorder: MediaRecorder | null;
  private stream: MediaStream | null;

  async start(): Promise<void>;
  stop(): void;
  onTranscript: (text: string) => void;
  onInterim: (text: string) => void;
}
```

Uses `MediaRecorder` with PCM audio encoding, streams chunks via `window.electronAPI.sendSTTAudio(audioChunk)`.

### `deepgram.ts` (Main)

**Path:** `src/main/deepgram.ts`

Main process Deepgram WebSocket manager.

```typescript
class DeepgramSTT {
  private connection: LiveTranscription | null;

  connect(): void;
  sendAudio(chunk: Buffer): void;
  disconnect(): void;
  onTranscript: (text: string) => void;
}
```

### `tts.ts` (Renderer)

**Path:** `src/renderer/voice/tts.ts`

Web Speech API wrapper.

```typescript
class TTS {
  speak(text: string, options?: SpeakOptions): Promise<void>;
  stop(): void;
  getVoices(): SpeechSynthesisVoice[];
  setVoice(voice: SpeechSynthesisVoice): void;
}

interface SpeakOptions {
  rate?: number;    // 0.1 - 10 (default 1.0)
  pitch?: number;   // 0 - 2 (default 1.0)
  volume?: number;  // 0 - 1 (default 1.0)
}
```

---

## Main Process Modules

### `ai.ts`

**Path:** `src/main/ai.ts`

Vercel AI SDK multi-provider router.

```typescript
class AIHandler {
  constructor(config: AIHandlerConfig);

  async explain(
    prompt: string,
    context: SceneContext,
    provider: LLMProvider
  ): Promise<AIResponse>;
}

type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai';

interface AIResponse {
  explanation: string;
  highlights: string[];
}
```

### `pythonBridge.ts`

**Path:** `src/main/pythonBridge.ts`

Manages the Python FastAPI child process.

```typescript
class PythonBridge {
  private process: ChildProcess | null;

  async start(): Promise<void>;
  async stop(): Promise<void>;
  async imageTo3D(imagePath: string): Promise<string>;        // returns .glb path
  async textToImage(prompt: string): Promise<string>;         // returns image path
  async textToImageTo3D(prompt: string): Promise<string>;     // returns .glb path
  getStatus(): PythonStatus;
}
```

### `modelManager.ts`

**Path:** `src/main/modelManager.ts`

File operations for 3D models and uploaded images.

```typescript
class ModelManager {
  private modelsDir: string;
  private uploadsDir: string;

  saveUpload(file: Buffer, extension: string): Promise<string>;  // saves to uploads/, returns path
  saveModel(glbData: Buffer, name: string): Promise<string>;     // saves to models/, returns path
  listModels(): Promise<ModelInfo[]>;                            // recent model list
  deleteModel(id: string): Promise<void>;
}
```
