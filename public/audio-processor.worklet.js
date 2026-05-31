/**
 * AudioWorklet processor — runs on the audio render thread.
 * Captures mono Float32 samples, converts to Int16 PCM,
 * and posts chunks to the main thread for WebSocket transmission.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    // 2048 samples @ 16 kHz ≈ 128 ms per chunk
    this._chunkSize = 2048;
    this._active = true;

    this.port.onmessage = (e) => {
      if (e.data === 'stop') this._active = false;
    };
  }

  process(inputs) {
    if (!this._active) return false;

    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buf.push(channel[i]);
    }

    while (this._buf.length >= this._chunkSize) {
      const chunk = new Float32Array(this._buf.splice(0, this._chunkSize));
      const pcm = float32ToInt16(chunk);
      // Transfer ownership to avoid copy
      this.port.postMessage({ type: 'pcm', buffer: pcm.buffer }, [pcm.buffer]);
    }

    return true;
  }
}

function float32ToInt16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
