import { useRef, useState, useCallback, useEffect } from 'react';
import ThreeCanvas, { ThreeCanvasHandle } from './components/ThreeCanvas';
import VoiceBar from './components/VoiceBar';
import SettingsPanel from './components/SettingsPanel';
import SetupGuide from './components/SetupGuide';
import ChatOverlay from './components/ChatOverlay';
import { SettingsProvider } from './context/SettingsContext';
import { speak } from './voice/tts';

function AppContent() {
  const canvasRef = useRef<ThreeCanvasHandle>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [pythonRunning, setPythonRunning] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    window.electronAPI.getPythonStatus().then((s) => setPythonRunning(s.running));
    window.electronAPI.onPythonStatus((s) => setPythonRunning(s.running));
  }, []);

  const onLoadProgress = useCallback((ratio: number) => {
    setLoadProgress(ratio);
    if (ratio >= 1) {
      setTimeout(() => setLoadProgress(null), 500);
    }
  }, []);

  const handleAIExplanation = useCallback(async (text: string) => {
    setStatus('AI is thinking...');
    try {
      const result = await window.electronAPI.requestExplanation({ text });
      if (result.success && result.text) {
        setStatus(result.text.slice(0, 60) + (result.text.length > 60 ? '...' : ''));
        canvasRef.current?.annotateExplanation(result.text);
        speak(result.text);
      } else {
        setStatus(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    }
  }, []);

  const handleVoiceTranscript = useCallback((text: string) => {
    handleAIExplanation(text);
  }, [handleAIExplanation]);

  const handleChatResponse = useCallback((text: string) => {
    canvasRef.current?.annotateExplanation(text);
  }, []);

  const handleConvert = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setStatus('Converting image to 3D...');
      try {
        const result = await window.electronAPI.convertImageTo3D(file.path);
        if (result.success && result.modelPath) {
          setStatus('Loading model...');
          await canvasRef.current?.loadModel(result.modelPath);
          setStatus('Model loaded — ask a question via voice!');
        } else {
          setStatus(`Error: ${result.error ?? 'unknown'}`);
        }
      } catch (err) {
        setStatus(`Error: ${(err as Error).message}`);
      }
    };
    input.click();
  }, []);

  const handlePrompt = useCallback(async (prompt: string) => {
    if (!prompt) return;

    setStatus(`Generating "${prompt}"...`);
    try {
      const result = await window.electronAPI.textToImageTo3D(prompt);
      if (result.success && result.modelPath) {
        setStatus('Loading generated model...');
        await canvasRef.current?.loadModel(result.modelPath);
        setStatus('Generated model loaded!');
      } else {
        setStatus(`Error: ${result.error ?? 'unknown'}`);
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    }
  }, []);

  return (
    <div className="w-screen h-screen bg-gray-950 flex flex-col overflow-hidden">
      <header className="h-11 bg-gray-900/80 backdrop-blur border-b border-gray-800/60 flex items-center px-4 shrink-0 gap-2">
        <span className="text-gray-200 text-sm font-semibold tracking-tight">3D AI Explainer</span>
        <div className="flex-1" />
        {loadProgress !== null && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                style={{ width: `${loadProgress * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{Math.round(loadProgress * 100)}%</span>
          </div>
        )}
        <span className="text-xs text-gray-500 max-w-64 truncate">{status}</span>
        <ChatOverlay onAIResponse={handleChatResponse} />
        <button
          onClick={() => setShowSetup(true)}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          title="Setup Guide"
        >
          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
          </svg>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          title="Settings"
        >
          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
          </svg>
        </button>
        <span className={`w-2 h-2 rounded-full ${pythonRunning ? 'bg-green-500' : 'bg-red-500'}`} title={pythonRunning ? 'Python backend running' : 'Python backend offline'} />
      </header>
      <main className="flex-1 relative">
        <ThreeCanvas ref={canvasRef} onLoadProgress={onLoadProgress} onStatus={setStatus} />
        {status === 'Ready' && !loadProgress && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              <p className="text-gray-600 text-sm">Drop a .glb or .gltf file here</p>
              <p className="text-gray-700 text-xs mt-1">or use the buttons below to generate a 3D model</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={handleConvert}
            className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs rounded-lg transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Image → 3D
            </span>
          </button>
          <button
            onClick={() => { setPromptText(''); setShowPrompt(true); }}
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs rounded-lg transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Text → 3D
            </span>
          </button>
        </div>
        <VoiceBar onTranscriptFinal={handleVoiceTranscript} />

        {showPrompt && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-2xl w-96">
              <h3 className="text-gray-200 text-sm font-medium mb-3">Describe your 3D object</h3>
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const text = promptText.trim();
                    setShowPrompt(false);
                    handlePrompt(text);
                  }
                  if (e.key === 'Escape') setShowPrompt(false);
                }}
                placeholder="e.g. a red sports car"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 mb-3"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowPrompt(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                <button
                  onClick={() => { const text = promptText.trim(); setShowPrompt(false); handlePrompt(text); }}
                  disabled={!promptText.trim()}
                  className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showSetup && <SetupGuide onClose={() => setShowSetup(false)} />}
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
