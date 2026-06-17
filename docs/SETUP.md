# Setup Guide

## Quick Start

### One-line setup (macOS)

```bash
npm install && cp .env.example .env && bash scripts/setup-python.sh && bash scripts/download-models.sh
# Then edit .env with API keys
```

### Step-by-step

#### 1. System dependencies

**macOS:**
```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python 3.11+
brew install python@3.11
```

**Windows:**
- Install [Python 3.11+](https://python.org)
- Install [Node.js 20+](https://nodejs.org)
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) (for native modules)

#### 2. Clone and install

```bash
git clone <repo-url> 3D-AI
cd 3D-AI
npm install
cp .env.example .env
```

#### 3. Edit environment variables

Open `.env` and add your API keys:

| Variable | Required For | How to Get |
|---|---|---|
| `DEEPGRAM_API_KEY` | Speech-to-Text | [Deepgram Console](https://console.deepgram.com) |
| `OPENAI_API_KEY` | GPT-4o provider | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Claude provider | [Anthropic Console](https://console.anthropic.com) |
| `GOOGLE_API_KEY` | Gemini provider | [Google AI Studio](https://aistudio.google.com) |
| `GROQ_API_KEY` | Groq provider | [Groq Console](https://console.groq.com) |
| `XAI_API_KEY` | Grok provider | [xAI Console](https://console.x.ai) |

You only need **one** LLM provider key + Deepgram for full functionality.

#### 4. Python environment

```bash
bash scripts/setup-python.sh
```

This script:
- Creates `python-backend/venv/`
- Installs PyTorch (CUDA if available, else CPU)
- Installs TripoSR from source
- Installs diffusers + transformers for Stable Diffusion
- Installs FastAPI + uvicorn

If you encounter CUDA issues, the script falls back to CPU automatically.

#### 5. Download model weights

```bash
bash scripts/download-models.sh
```

Downloads:
- TripoSR pretrained weights (~300MB)
- Stable Diffusion 1.5 weights (~2GB, optional, skipped with `--no-sd`)

#### 6. Install Ollama (optional, for local LLM)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2
```

#### 7. Start development

**Terminal 1 – Python backend:**
```bash
npm run python:server
# FastAPI starts at http://127.0.0.1:8765
```

**Terminal 2 – Electron app:**
```bash
npm run dev
```

---

## Troubleshooting

### GPU / CUDA

```bash
# Check if PyTorch sees your GPU
cd python-backend && source venv/bin/activate && python -c "import torch; print(torch.cuda.is_available())"
# Should print: True
```

If False, TripoSR will use CPU (much slower, ~30s per model instead of 2-5s).

### Electron won't start

```bash
npx electron --version
# Should be ≥ 33
```

### Python backend won't start

```bash
cd python-backend && source venv/bin/activate && pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8765 --reload
```

### WebSocket connection errors

Make sure Deepgram API key is valid and has credits.
