import { GoogleGenAI, Modality } from 'https://esm.sh/@google/genai@1.52.0/dist/web/index.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CAPTURE_SAMPLE_RATE  = 16_000;
const PLAYBACK_SAMPLE_RATE = 24_000;

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
const State = Object.freeze({
  IDLE:       'idle',
  CONNECTING: 'connecting',
  LISTENING:  'listening',
  SPEAKING:   'speaking',
  ERROR:      'error',
});

let state = State.IDLE;

function setState(next) {
  state = next;
  document.body.dataset.state = next;
  ui.status.textContent = {
    [State.IDLE]:       'Click the button to start',
    [State.CONNECTING]: 'Connecting…',
    [State.LISTENING]:  'Listening…',
    [State.SPEAKING]:   'Agent speaking…',
    [State.ERROR]:      'Error — see below',
  }[next] ?? next;
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const ui = {
  btn:        document.getElementById('btn-call'),
  status:     document.getElementById('status'),
  transcript: document.getElementById('transcript'),
  error:      document.getElementById('error-msg'),
};

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------
let geminiSession = null;
let captureCtx    = null;
let workletNode   = null;
let micStream     = null;
let playbackCtx   = null;
let playbackHead  = 0;
let sourceNodes   = [];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
ui.btn.addEventListener('click', () => {
  if (state === State.IDLE || state === State.ERROR) {
    startSession();
  } else {
    stopSession();
  }
});

async function startSession() {
  const clientId = new URLSearchParams(window.location.search).get('client_id');
  if (!clientId) {
    showError('Missing client_id in URL. Add ?client_id=YOUR_ID to the URL.');
    return;
  }

  setState(State.CONNECTING);
  ui.btn.textContent = 'Disconnect';
  ui.error.textContent = '';

  // ── 1. Fetch ephemeral token from our serverless function ─────────────────
  let tokenData;
  try {
    const res = await fetch(`/api/token?client_id=${encodeURIComponent(clientId)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Token request failed (${res.status})`);
    }
    tokenData = await res.json();
  } catch (err) {
    showError(`Setup failed: ${err.message}`);
    return;
  }

  // ── 2. Connect directly to Gemini Live using ephemeral token ──────────────
  try {
    const ai = new GoogleGenAI({ apiKey: tokenData.token });

    geminiSession = await ai.live.connect({
      model: tokenData.model,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen() {
          setState(State.LISTENING);
          startCapture();
        },

        onmessage(msg) {
          try { handleGeminiMessage(msg); } catch (err) { showError(err.message); }
        },

        onerror(err) {
          showError(err instanceof Error ? err.message : String(err));
        },

        onclose(e) {
          if (state !== State.ERROR) {
            showError(e?.reason || 'Session closed');
          }
          teardown();
        },
      },
    });
  } catch (err) {
    showError(`Connection failed: ${err.message}`);
    return;
  }
}

function stopSession() {
  geminiSession?.close().catch(() => {});
  teardown();
}

// ---------------------------------------------------------------------------
// Gemini message handler
// ---------------------------------------------------------------------------
function handleGeminiMessage(msg) {
  const sc = msg.serverContent;
  if (!sc) return;

  if (sc.interrupted) {
    flushPlayback();
    setState(State.LISTENING);
    return;
  }

  const parts = sc.modelTurn?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      setState(State.SPEAKING);
      schedulePlayback(part.inlineData.data);
    }
    if (part.text) {
      appendTranscript('model', part.text);
    }
  }

  if (sc.inputTranscription?.text)  appendTranscript('user',  sc.inputTranscription.text);
  if (sc.outputTranscription?.text) appendTranscript('model', sc.outputTranscription.text);

  if (sc.turnComplete) {
    waitForPlaybackEnd(() => setState(State.LISTENING));
  }
}

// ---------------------------------------------------------------------------
// Microphone capture
// ---------------------------------------------------------------------------
async function startCapture() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    captureCtx = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });
    await captureCtx.audioWorklet.addModule('/audio-processor.worklet.js');

    const source = captureCtx.createMediaStreamSource(micStream);
    workletNode = new AudioWorkletNode(captureCtx, 'audio-capture-processor');

    workletNode.port.onmessage = (e) => {
      if (e.data.type === 'pcm' && geminiSession) {
        const base64 = arrayBufferToBase64(e.data.buffer);
        geminiSession.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
        }).catch(() => {});
      }
    };

    source.connect(workletNode);
    workletNode.connect(captureCtx.destination);
  } catch (err) {
    showError(`Microphone error: ${err.message}`);
  }
}

function stopCapture() {
  workletNode?.port.postMessage('stop');
  workletNode?.disconnect();
  captureCtx?.close();
  micStream?.getTracks().forEach((t) => t.stop());
  workletNode = null;
  captureCtx  = null;
  micStream   = null;
}

// ---------------------------------------------------------------------------
// Audio playback scheduler
// ---------------------------------------------------------------------------
function getPlaybackCtx() {
  if (!playbackCtx || playbackCtx.state === 'closed') {
    playbackCtx  = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    playbackHead = playbackCtx.currentTime;
  }
  return playbackCtx;
}

function schedulePlayback(base64Pcm) {
  const ctx    = getPlaybackCtx();
  const int16  = new Int16Array(base64ToArrayBuffer(base64Pcm));
  const float32 = int16ToFloat32(int16);

  const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
  audioBuffer.getChannelData(0).set(float32);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  const startAt = Math.max(playbackHead, ctx.currentTime);
  source.start(startAt);
  playbackHead = startAt + audioBuffer.duration;

  sourceNodes.push(source);
  source.onended = () => { sourceNodes = sourceNodes.filter((n) => n !== source); };
}

function flushPlayback() {
  sourceNodes.forEach((n) => { try { n.stop(); } catch {} });
  sourceNodes  = [];
  playbackHead = playbackCtx?.currentTime ?? 0;
}

function waitForPlaybackEnd(cb) {
  if (sourceNodes.length === 0) { cb(); return; }
  const last = sourceNodes[sourceNodes.length - 1];
  last.onended = () => {
    sourceNodes = sourceNodes.filter((n) => n !== last);
    cb();
  };
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------
function teardown() {
  stopCapture();
  flushPlayback();
  playbackCtx?.close();
  playbackCtx    = null;
  geminiSession  = null;
  setState(State.IDLE);
  ui.btn.textContent = 'Start';
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function showError(msg) {
  setState(State.ERROR);
  ui.error.textContent = msg;
}

function appendTranscript(role, text) {
  const p = document.createElement('p');
  p.className = `transcript-line transcript-${role}`;
  p.textContent = `${role === 'user' ? 'You' : 'Agent'}: ${text}`;
  ui.transcript.appendChild(p);
  ui.transcript.scrollTop = ui.transcript.scrollHeight;
}

// ---------------------------------------------------------------------------
// Binary helpers
// ---------------------------------------------------------------------------
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function int16ToFloat32(int16) {
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    out[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return out;
}
