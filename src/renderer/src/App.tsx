import { useRef, useState, useCallback } from 'react';
import ThreeCanvas, { ThreeCanvasHandle } from './components/ThreeCanvas';
import VoiceBar from './components/VoiceBar';
import SettingsPanel from './components/SettingsPanel';
import ChatOverlay from './components/ChatOverlay';
import { SettingsProvider } from './context/SettingsContext';

function AppContent() {
  const canvasRef = useRef<ThreeCanvasHandle>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [pythonRunning, setPythonRunning] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const onLoadProgress = useCallback((ratio: number) => {
    setLoadProgress(ratio);
    if (ratio >= 1) {
      setTimeout(() => setLoadProgress(null), 500);
    }
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

  const handlePrompt = useCallback(async () => {
    const prompt = window.prompt('Describe the 3D object you want:');
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
      <header className="h-10 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center px-4 shrink-0 gap-2">
        <span className="text-gray-200 text-sm font-medium">3D AI Explainer</span>
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
        <span className="text-xs text-gray-500">{status}</span>
        <ChatOverlay />
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
          title="Settings"
        >
          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
          </svg>
        </button>
        <span className={`w-2 h-2 rounded-full ${pythonRunning ? 'bg-green-500' : 'bg-red-500'}`} />
      </header>
      <main className="flex-1 relative">
        <ThreeCanvas ref={canvasRef} onLoadProgress={onLoadProgress} onStatus={setStatus} />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={handleConvert}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors"
          >
            Upload Image → 3D
          </button>
          <button
            onClick={handlePrompt}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
          >
            Text → 3D
          </button>
        </div>
        <VoiceBar />
      </main>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
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
