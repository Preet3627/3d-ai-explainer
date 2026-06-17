"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // STT (Speech-To-Text via Deepgram)
  startSTT: () => electron.ipcRenderer.send("stt:start"),
  sendSTTAudio: (chunk) => electron.ipcRenderer.send("stt:audio", chunk),
  stopSTT: () => electron.ipcRenderer.send("stt:stop"),
  onSTTResult: (callback) => electron.ipcRenderer.on("stt:result", (_event, text) => callback(text)),
  onSTTInterim: (callback) => electron.ipcRenderer.on("stt:interim", (_event, text) => callback(text)),
  removeSTTListeners: () => {
    electron.ipcRenderer.removeAllListeners("stt:result");
    electron.ipcRenderer.removeAllListeners("stt:interim");
  },
  // AI Explanation
  requestExplanation: (data) => electron.ipcRenderer.invoke("ai:explain", data),
  // Model conversion (2D → 3D via Python backend)
  convertImageTo3D: (imagePath) => electron.ipcRenderer.invoke("model:convert", { imagePath }),
  textToImageTo3D: (prompt) => electron.ipcRenderer.invoke("model:text-to-3d", { prompt }),
  // Python backend status
  onPythonStatus: (callback) => electron.ipcRenderer.on("python:status", (_event, status) => callback(status))
});
