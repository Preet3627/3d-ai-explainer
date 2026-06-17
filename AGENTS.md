# AGENTS.md – AI Assistant Context

This file helps AI coding assistants understand the project conventions and avoid repetitive questions.

## Project Identity
- **Name:** 3D AI Explainer
- **Type:** Electron desktop app with Python sidecar
- **Package manager:** npm
- **UI framework:** React 19 + Tailwind CSS 4
- **Language:** TypeScript (strict mode)
- **Build system:** electron-vite + electron-builder

## Key Conventions

### Code style
- No JSDoc comments unless the function has a complex public API
- Use TypeScript `interface` over `type` for object shapes
- Async/await over raw promises
- Named exports, no default exports (except for pages/components)
- 2-space indentation
- Single quotes for strings

### Naming
- Files: `pascal-case.ts` (components), `camelCase.ts` (utilities), `KEBAB-CASE.md` (docs)
- Components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- IPC channels: `domain:action` (e.g., `stt:start`, `model:convert`)

### Project structure
```
electron/        – Main process, preload
src/
  main/         – Main process logic (Deepgram, AI, PythonBridge)
  renderer/     – Renderer (React components, Three.js, voice)
  assets/       – Static resources
python-backend/ – FastAPI + TripoSR + Stable Diffusion
docs/           – Documentation
scripts/        – Setup scripts
```

### Process communication
- **Renderer ↔ Main:** IPC via contextBridge (preload.ts)
- **Main ↔ Python:** HTTP to FastAPI on 127.0.0.1:8765
- **Main ↔ Deepgram:** WebSocket (`ws` package) to api.deepgram.com, audio chunks via IPC from renderer
- **Renderer → TTS:** Web Speech API (direct, no IPC needed)
- **STT flow:** Renderer mic (ScriptProcessorNode) → Int16 PCM @16kHz → IPC chunks → Main (DeepgramClient) → WebSocket → Results back via IPC

### Testing
- Vitest for unit tests
- Test files co-located: `*.test.ts` next to source
- Prefer integration tests over unit tests for voice/AI pipelines

### Commands
- `npm run dev` – Start dev server
- `npm run typecheck` – TypeScript check
- `npm run lint` – ESLint
- `npm run python:server` – Start Python backend
- `npm run package:mac` – Build macOS distribution

### Environment
- `.env` file at root (never committed)
- `.env.example` documents all required variables
- Python virtual environment at `python-backend/venv/`

## Architecture reminders
1. **TTS is local only** – Web Speech API, no cloud dependency
2. **STT is Deepgram** – requires API key, real-time WebSocket
3. **LLM is multi-provider** – Vercel AI SDK routes between Ollama/OpenAI/Claude/Groq/Google/xAI
4. **2D→3D is TripoSR** – Python subprocess, requires GPU for speed
5. **All IPC is secure** – no `nodeIntegration`, use `contextBridge`
6. **Model format** – glTF/GLB for Three.js, PBR materials
