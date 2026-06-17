import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface PythonStatus {
  running: boolean;
  busy: boolean;
  error?: string;
}

interface ModelResult {
  model_id: string;
  model_path: string;
  format: string;
}

class PythonBridge {
  private process: ChildProcess | null = null;
  private baseUrl: string;
  private statusListeners: Array<(status: PythonStatus) => void> = [];

  constructor(baseUrl = 'http://127.0.0.1:8765') {
    this.baseUrl = baseUrl;
  }

  get isRunning(): boolean {
    return this.process !== null && this.process.exitCode === null;
  }

  onStatusChange(listener: (status: PythonStatus) => void): void {
    this.statusListeners.push(listener);
  }

  private notifyStatus(status: PythonStatus): void {
    this.statusListeners.forEach((fn) => fn(status));
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    return new Promise((resolve, reject) => {
      const pythonDir = path.resolve(path.join(__dirname, '../../python-backend'));
      const venvPython = path.join(pythonDir, 'venv/bin/python3');
      const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python3';

      this.notifyStatus({ running: false, busy: true });

      this.process = spawn(pythonExe, [
        '-m', 'uvicorn', 'server:app',
        '--host', '127.0.0.1',
        '--port', '8765',
        '--log-level', 'warning',
      ], {
        cwd: pythonDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const onReady = (data: Buffer) => {
        const text = data.toString();
        if (text.includes('Uvicorn running on') || text.includes('startup complete')) {
          cleanup();
          this.notifyStatus({ running: true, busy: false });
          resolve();
        }
      };

      const cleanup = () => {
        this.process?.stdout?.removeListener('data', onReady);
        this.process?.stderr?.removeListener('data', onReady);
      };

      this.process.stdout?.on('data', onReady);
      this.process.stderr?.on('data', onReady);

      this.process.on('error', (err) => {
        cleanup();
        this.notifyStatus({ running: false, busy: false, error: err.message });
        reject(err);
      });

      this.process.on('exit', (code) => {
        cleanup();
        this.process = null;
        const err = code !== 0 ? `Python exited with code ${code}` : undefined;
        this.notifyStatus({ running: false, busy: false, error: err });
        if (code !== 0) reject(new Error(err));
      });

      setTimeout(() => {
        this.waitForHealth(30)
          .then(() => {
            this.notifyStatus({ running: true, busy: false });
            resolve();
          })
          .catch(reject);
      }, 2000);
    });
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    this.process.kill('SIGTERM');
    this.process = null;
    this.notifyStatus({ running: false, busy: false });
  }

  async waitForHealth(retries = 30): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const res: any = await this.post('/health', {});
        if (res.status === 'ok') return;
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error('Python backend did not become healthy');
  }

  async imageTo3D(imagePath: string): Promise<ModelResult> {
    return this.post('/image-to-3d', { image_path: imagePath }) as Promise<ModelResult>;
  }

  async textToImage(prompt: string): Promise<{ image_path: string }> {
    return this.post('/text-to-image', { prompt }) as Promise<{ image_path: string }>;
  }

  async textToImageTo3D(prompt: string): Promise<ModelResult> {
    return this.post('/text-to-image-to-3d', { prompt }) as Promise<ModelResult>;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Python error ${res.status}: ${text}`);
    }
    return res.json();
  }
}

export default PythonBridge;
