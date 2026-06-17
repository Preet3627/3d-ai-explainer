import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import dotenv from 'dotenv';
import PythonBridge from './pythonBridge';
import ModelManager from './modelManager';
import DeepgramClient from './deepgramClient';
import SettingsStore from './settingsStore';
import { generateAIResponse } from './aiProvider';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// macOS GPU sandbox workaround for WebGL compatibility.
// TODO: Re-enable sandbox in production builds once GPU driver issue is resolved.
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

let mainWindow: BrowserWindow | null = null;
let settingsStore: SettingsStore;
const pythonBridge = new PythonBridge();
const modelManager = new ModelManager();
const deepgram = new DeepgramClient();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '3D AI Explainer',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // DEV only: macOS WebGL compat, re-enable for prod
    },
  });

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// ─── IPC Handlers ──────────────────────────────────────────────────

ipcMain.handle('model:convert', async (_event, data: { imagePath: string }) => {
  try {
    const result = await pythonBridge.imageTo3D(data.imagePath);
    return { success: true, modelPath: result.model_path, modelId: result.model_id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('model:text-to-3d', async (_event, data: { prompt: string }) => {
  try {
    const result = await pythonBridge.textToImageTo3D(data.prompt);
    return { success: true, modelPath: result.model_path, modelId: result.model_id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('model:list', async () => {
  return modelManager.listModels();
});

ipcMain.handle('python:status', async () => {
  return { running: pythonBridge.isRunning };
});

// ─── STT (Speech-To-Text) IPC ──────────────────────────────────────

// ─── Settings IPC ──────────────────────────────────────────────────

ipcMain.handle('settings:get', () => {
  return settingsStore.getAll();
});

ipcMain.handle('settings:set', (_event, updates: Record<string, unknown>) => {
  settingsStore.setAll(updates as any);
  return { success: true };
});

// ─── AI Explanation IPC ────────────────────────────────────────────

ipcMain.handle('ai:explain', async (_event, data: { text: string; context?: string; history?: { role: 'user' | 'assistant'; content: string }[] }) => {
  try {
    const settings = settingsStore.getAll();
    const text = await generateAIResponse(settings, data.text, data.context, data.history);
    return { success: true, text };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// ─── STT (Speech-To-Text) IPC ──────────────────────────────────────

ipcMain.on('stt:start', () => {
  const apiKey = settingsStore.get('deepgramApiKey') || process.env.DEEPGRAM_API_KEY || '';
  if (!apiKey) {
    mainWindow?.webContents.send('stt:error', 'DEEPGRAM_API_KEY not configured — add it in Settings');
    return;
  }

  deepgram.start(apiKey, {
    onResult: (text) => mainWindow?.webContents.send('stt:result', text),
    onInterim: (text) => mainWindow?.webContents.send('stt:interim', text),
    onError: (err) => mainWindow?.webContents.send('stt:error', err),
    onReady: () => mainWindow?.webContents.send('stt:ready'),
  });
});

ipcMain.on('stt:audio', (_event, chunk: Buffer) => {
  deepgram.sendAudio(Buffer.from(chunk));
});

ipcMain.on('stt:stop', () => {
  deepgram.stop();
});

// ─── App lifecycle ─────────────────────────────────────────────────

app.whenReady().then(async () => {
  settingsStore = new SettingsStore();
  createWindow();
  try {
    await pythonBridge.start();
    mainWindow?.webContents.send('python:status', { running: true, busy: false });
  } catch {
    mainWindow?.webContents.send('python:status', { running: false, busy: false, error: 'Python backend failed to start' });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  deepgram.stop();
  await pythonBridge.stop();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
