interface ElectronAPI {
  startSTT: () => void;
  sendSTTAudio: (chunk: ArrayBuffer) => void;
  stopSTT: () => void;
  onSTTResult: (callback: (text: string) => void) => void;
  onSTTInterim: (callback: (text: string) => void) => void;
  removeSTTListeners: () => void;
  requestExplanation: (data: { text: string; context: string; provider: string }) => Promise<string>;
  convertImageTo3D: (imagePath: string) => Promise<{ modelPath: string }>;
  textToImageTo3D: (prompt: string) => Promise<{ modelPath: string }>;
  onPythonStatus: (callback: (status: { running: boolean; busy: boolean; error?: string }) => void) => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
