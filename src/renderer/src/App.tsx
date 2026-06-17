import { useRef, useState, useCallback } from 'react';
import ThreeCanvas, { ThreeCanvasHandle } from './components/ThreeCanvas';
import VoiceBar from './components/VoiceBar';

function App() {
  const canvasRef = useRef<ThreeCanvasHandle>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [pythonRunning, setPythonRunning] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);

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
      <header className="h-10 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center px-4 shrink-0 gap-3">
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
    </div>
  );
}

export default App;
