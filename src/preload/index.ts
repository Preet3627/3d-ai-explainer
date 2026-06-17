import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // STT (Speech-To-Text via Deepgram)
  startSTT: () => ipcRenderer.send('stt:start'),
  sendSTTAudio: (chunk: ArrayBuffer) => ipcRenderer.send('stt:audio', chunk),
  stopSTT: () => ipcRenderer.send('stt:stop'),
  onSTTResult: (callback: (text: string) => void) =>
    ipcRenderer.on('stt:result', (_event, text) => callback(text)),
  onSTTInterim: (callback: (text: string) => void) =>
    ipcRenderer.on('stt:interim', (_event, text) => callback(text)),
  onSTTError: (callback: (error: string) => void) =>
    ipcRenderer.on('stt:error', (_event, error) => callback(error)),
  onSTTReady: (callback: () => void) =>
    ipcRenderer.on('stt:ready', () => callback()),
  removeSTTListeners: () => {
    ipcRenderer.removeAllListeners('stt:result');
    ipcRenderer.removeAllListeners('stt:interim');
    ipcRenderer.removeAllListeners('stt:error');
    ipcRenderer.removeAllListeners('stt:ready');
  },

  // AI Explanation
  requestExplanation: (data: { text: string; context?: string; history?: { role: 'user' | 'assistant'; content: string }[] }) =>
    ipcRenderer.invoke('ai:explain', data),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke('settings:get'),
  setSettings: (updates: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:set', updates),

  // Model conversion (2D → 3D via Python backend)
  convertImageTo3D: (imagePath: string) =>
    ipcRenderer.invoke('model:convert', { imagePath }),
  textToImageTo3D: (prompt: string) =>
    ipcRenderer.invoke('model:text-to-3d', { prompt }),
  listModels: () =>
    ipcRenderer.invoke('model:list'),

  // Python backend status
  getPythonStatus: () =>
    ipcRenderer.invoke('python:status'),
  onPythonStatus: (callback: (status: { running: boolean; busy: boolean; error?: string }) => void) =>
    ipcRenderer.on('python:status', (_event, status) => callback(status)),
});
