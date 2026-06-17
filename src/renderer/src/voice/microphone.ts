export type MicStopFn = () => void;

export async function startMicrophoneCapture(
  onChunk: (buffer: ArrayBuffer) => void,
  onError: (error: string) => void,
): Promise<MicStopFn> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        int16[i] = s < 0 ? s * 32768 : s * 32767;
      }
      onChunk(int16.buffer);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    return () => {
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      stream.getTracks().forEach((t) => t.stop());
    };
  } catch (err) {
    const message = err instanceof DOMException && err.name === 'NotAllowedError'
      ? 'Microphone permission denied'
      : (err as Error).message;
    onError(message);
    return () => {};
  }
}
