import { useState, useRef, useCallback, useEffect } from 'react';
import { startMicrophoneCapture, MicStopFn } from '../voice/microphone';
import { speak, stopSpeaking } from '../voice/tts';

type VoiceState = 'idle' | 'connecting' | 'recording' | 'speaking' | 'error';

function waitForSTTReady(): Promise<void> {
  return new Promise((resolve) => {
    window.electronAPI.onSTTReady(() => resolve());
  });
}

function VoiceBar() {
  const [state, setState] = useState<VoiceState>('idle');
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const micStopRef = useRef<MicStopFn | null>(null);
  const transcriptRef = useRef('');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const cleanup = useCallback(() => {
    micStopRef.current?.();
    micStopRef.current = null;
    window.electronAPI.stopSTT();
    window.electronAPI.removeSTTListeners();
  }, []);

  const toggleMic = useCallback(async () => {
    if (state === 'recording' || state === 'connecting') {
      cleanup();
      stopSpeaking();
      setState('idle');
      setError('');
      return;
    }

    setState('connecting');
    setInterim('');
    setTranscript('');
    setError('');
    transcriptRef.current = '';

    const readyPromise = waitForSTTReady();

    window.electronAPI.onSTTResult((text: string) => {
      if (!mountedRef.current) return;
      transcriptRef.current += (transcriptRef.current ? ' ' : '') + text;
      setTranscript(transcriptRef.current);
      setInterim('');
    });

    window.electronAPI.onSTTInterim((text: string) => {
      if (!mountedRef.current) return;
      setInterim(text);
    });

    window.electronAPI.onSTTError((err: string) => {
      if (!mountedRef.current) return;
      setError(err);
      setState('error');
      cleanup();
    });

    window.electronAPI.startSTT();

    await readyPromise;

    if (!mountedRef.current) return;

    const stop = await startMicrophoneCapture(
      (chunk) => window.electronAPI.sendSTTAudio(chunk),
      (err) => {
        if (!mountedRef.current) return;
        setError(err);
        setState('error');
      },
    );
    micStopRef.current = stop;
    if (mountedRef.current) {
      setState('recording');
    }
  }, [state, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      stopSpeaking();
    };
  }, [cleanup]);

  const handleSpeak = useCallback(() => {
    if (!transcriptRef.current) return;
    setState('speaking');
    speak(transcriptRef.current, () => {
      if (mountedRef.current) setState('idle');
    });
  }, []);

  const micColor = state === 'recording' ? 'bg-red-600 hover:bg-red-500'
    : state === 'connecting' ? 'bg-yellow-500'
    : state === 'speaking' ? 'bg-green-500'
    : state === 'error' ? 'bg-red-800'
    : 'bg-gray-700 hover:bg-gray-600';

  const pulseClass = state === 'recording' ? 'animate-pulse' : '';

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
      {(interim || transcript) && (
        <div className="bg-gray-900/90 backdrop-blur rounded-lg px-4 py-2 max-w-md text-center border border-gray-800">
          {transcript && (
            <p className="text-gray-200 text-sm">{transcript}</p>
          )}
          {interim && (
            <p className="text-gray-500 text-xs italic">{interim}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs bg-red-900/50 px-3 py-1 rounded">{error}</p>
      )}

      <div className="flex gap-2 items-center">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${micColor} ${pulseClass}`}
          title={state === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            {state === 'recording' ? (
              <path d="M6 6h12v12H6z" />
            ) : (
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            )}
            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V22h2v-1.06A9 9 0 0 0 21 12v-2z" />
          </svg>
        </button>

        {transcript && state !== 'speaking' && (
          <button
            onClick={handleSpeak}
            className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
            title="Read transcript aloud"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.49 4.49 0 0 0 2.5-3.5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default VoiceBar;
