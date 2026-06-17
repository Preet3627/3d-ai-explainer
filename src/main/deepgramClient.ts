import WebSocket from 'ws';

export interface DeepgramCallbacks {
  onResult: (text: string) => void;
  onInterim: (text: string) => void;
  onError: (error: string) => void;
  onReady: () => void;
}

class DeepgramClient {
  private ws: WebSocket | null = null;
  private callbacks: DeepgramCallbacks | null = null;

  start(apiKey: string, callbacks: DeepgramCallbacks): void {
    this.callbacks = callbacks;

    const url = `wss://api.deepgram.com/v1/listen?${new URLSearchParams({
      model: 'nova-2',
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      interim_results: 'true',
      endpointing: '200',
    })}`;

    try {
      this.ws = new WebSocket(url, {
        headers: { Authorization: `Token ${apiKey}` },
      });

      this.ws.on('open', () => {
        this.callbacks?.onReady();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'Results') {
            const transcript = msg.channel?.alternatives?.[0]?.transcript?.trim();
            if (!transcript) return;
            if (msg.is_final) {
              this.callbacks?.onResult(transcript);
            } else {
              this.callbacks?.onInterim(transcript);
            }
          }
        } catch {
          // Ignore parse errors
        }
      });

      this.ws.on('error', (err) => {
        this.callbacks?.onError(`Deepgram error: ${err.message}`);
      });

      this.ws.on('close', (code) => {
        if (code !== 1000) {
          this.callbacks?.onError(`Deepgram disconnected (code ${code})`);
        }
        this.ws = null;
      });
    } catch (err) {
      this.callbacks?.onError(`Deepgram connection failed: ${(err as Error).message}`);
    }
  }

  sendAudio(chunk: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  stop(): void {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.callbacks = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default DeepgramClient;
