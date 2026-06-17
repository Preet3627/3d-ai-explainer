interface ModelInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

interface PythonStatus {
  running: boolean;
  busy: boolean;
  error?: string;
}

interface ElectronAPI {
  startSTT: () => void;
  sendSTTAudio: (chunk: ArrayBuffer) => void;
  stopSTT: () => void;
  onSTTResult: (callback: (text: string) => void) => void;
  onSTTInterim: (callback: (text: string) => void) => void;
  onSTTError: (callback: (error: string) => void) => void;
  onSTTReady: (callback: () => void) => void;
  removeSTTListeners: () => void;
  requestExplanation: (data: { text: string; context?: string; history?: { role: 'user' | 'assistant'; content: string }[] }) => Promise<{ success: boolean; text?: string; error?: string }>;
  getSettings: () => Promise<Record<string, unknown>>;
  setSettings: (updates: Record<string, unknown>) => Promise<{ success: boolean }>;
  convertImageTo3D: (imagePath: string) => Promise<{ success: boolean; modelPath?: string; error?: string }>;
  textToImageTo3D: (prompt: string) => Promise<{ success: boolean; modelPath?: string; error?: string }>;
  listModels: () => Promise<ModelInfo[]>;
  getPythonStatus: () => Promise<PythonStatus>;
  onPythonStatus: (callback: (status: PythonStatus) => void) => void;
}

interface File {
  path?: string;
}

interface Window {
  electronAPI: ElectronAPI;
}
