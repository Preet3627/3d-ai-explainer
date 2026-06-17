import { useState } from 'react';

interface SetupGuideProps {
  onClose: () => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  details: string[];
  links?: { label: string; url: string }[];
}

const STEPS: Step[] = [
  {
    id: 'python',
    title: '1. Python Backend',
    description: 'The 2D→3D conversion (TripoSR) and text-to-image (Stable Diffusion) run via a Python FastAPI server.',
    details: [
      'Run npm run python:server to start the Python backend',
      'Or manually: cd python-backend && source venv/bin/activate && uvicorn server:app --host 127.0.0.1 --port 8765',
      'First run will download model weights — this takes a few minutes',
      'Requires Python 3.10+ and PyTorch (MPS on Apple Silicon, CUDA on NVIDIA)',
    ],
    links: [
      { label: 'Python setup docs', url: 'https://github.com/anomalyco/3d-ai-explainer#python-backend' },
    ],
  },
  {
    id: 'ollama',
    title: '2. Ollama (Local LLM)',
    description: 'For free, private AI explanations, install Ollama and pull a model.',
    details: [
      'Install Ollama from https://ollama.com',
      'Pull a model: ollama pull llama3.2 (2GB) or ollama pull mistral (4.1GB)',
      'The app auto-detects available models when Ollama is selected as provider',
      'Default endpoint: http://127.0.0.1:11434',
    ],
    links: [
      { label: 'Download Ollama', url: 'https://ollama.com' },
    ],
  },
  {
    id: 'deepgram',
    title: '3. Deepgram (Speech-to-Text)',
    description: 'Voice input requires a Deepgram API key. Free tier includes $200 credit.',
    details: [
      'Sign up at https://console.deepgram.com',
      'Copy your API key from the dashboard',
      'Paste it in Settings → API Keys → Deepgram',
      'Uses Nova-2 model for real-time transcription',
    ],
    links: [
      { label: 'Deepgram Console', url: 'https://console.deepgram.com' },
    ],
  },
  {
    id: 'cloud-llm',
    title: '4. Cloud LLM Providers (Optional)',
    description: 'You can use OpenAI, Anthropic (Claude), Google (Gemini), Groq, or xAI (Grok) instead of Ollama.',
    details: [
      'Each provider needs its own API key',
      'Configure in Settings → API Keys → select provider tab',
      'Switch active provider in Settings → Model',
      'Models are pre-configured with defaults for each provider',
    ],
    links: [
      { label: 'OpenAI API Keys', url: 'https://platform.openai.com/api-keys' },
      { label: 'Anthropic Console', url: 'https://console.anthropic.com' },
      { label: 'Google AI Studio', url: 'https://aistudio.google.com' },
      { label: 'Groq Console', url: 'https://console.groq.com' },
      { label: 'xAI API', url: 'https://console.x.ai' },
    ],
  },
  {
    id: 'usage',
    title: '5. Using the App',
    description: 'Once everything is set up, here is how to use the main features:',
    details: [
      'Upload Image → 3D: Select a photo to convert to a 3D model',
      'Text → 3D: Describe an object to generate it via AI',
      'Mic button: Speak a question about the model',
      'Chat panel: Type questions and get AI answers',
      'Drag & drop: Drop .glb or .gltf files directly onto the viewport',
      'Settings gear: Configure API keys, model, and parameters',
    ],
  },
];

function SetupGuide({ onClose }: SetupGuideProps) {
  const [activeStep, setActiveStep] = useState(0);

  const step = STEPS[activeStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-gray-200 text-sm font-medium">Setup Guide</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              Step {activeStep + 1} of {STEPS.length}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        <div className="flex gap-0 flex-1 overflow-hidden">
          <nav className="w-44 shrink-0 border-r border-gray-800 p-2 space-y-1 overflow-y-auto">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  i === activeStep
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {s.title}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <h3 className="text-gray-200 text-sm font-medium mb-2">{step.title}</h3>
            <p className="text-gray-400 text-xs mb-4 leading-relaxed">{step.description}</p>

            <ul className="space-y-2 mb-4">
              {step.details.map((d, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-300">
                  <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            {step.links && step.links.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Links</p>
                {step.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                  >
                    {link.label} →
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center px-5 py-3 border-t border-gray-800">
          <button
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === activeStep ? 'bg-indigo-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          {activeStep < STEPS.length - 1 ? (
            <button
              onClick={() => setActiveStep(activeStep + 1)}
              className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupGuide;
