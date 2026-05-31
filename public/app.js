// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CAPTURE_SAMPLE_RATE = 16_000;  // Gemini input requirement
const PLAYBACK_SAMPLE_RATE = 24_000; // Gemini output sample rate

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
// idle → connecting → ready → listening → speaking → idle
//                           ↘ error
const State = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  READY: 'ready',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  ERROR: 'error',
});

let state = State.IDLE;

function setState(next) {
  state = next;
  document.body.dataset.state = next;
  ui.status.textContent = {
    [State.IDLE]:       'Click the button to start',
    [State.CONNECTING]: 'Connecting…',
    [State.READY]:      'Connected — hold to speak',
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
let ws = null;
let captureCtx = null;
let workletNode = null;
let micStream = null;
let playbackCtx = null;
let playbackHead = 0;    // next scheduled start time in playback ctx
let sourceNodes = [];    // active AudioBufferSourceNodes

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

function startSession() {
  const clientId = new URLSearchParams(window.location.search).get('client_id');
  if (!clientId) {
    showError('Missing client_id in URL. Add ?client_id=YOUR_ID to the URL.');
    return;
  }

  setState(State.CONNECTING);
  ui.btn.textContent = 'Disconnect';
  ui.error.textContent = '';

  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}/agent?client_id=${encodeURIComponent(clientId)}`);

  ws.addEventListener('open', () => {});  // wait for 'ready' message
  ws.addEventListener('message', onMessage);
  ws.addEventListener('close', (e) => {
    if (state !== State.ERROR) {
      showError(e.reason || 'Connection closed');
    }
    teardown();
  });
  ws.addEventListener('error', () => showError('WebSocket connection failed'));
}

function stopSession() {
  ws?.close(1000, 'user disconnected');
  teardown();
}

// ---------------------------------------------------------------------------
// WebSocket message handler
// ---------------------------------------------------------------------------
function onMessage(event) {
  let msg;
  try { msg = JSON.parse(event.data); } catch { return; }

  switch (msg.type) {
    case 'ready':
      setState(State.READY);
      startCapture();
      break;

    case 'audio':
      setState(State.SPEAKING);
      schedulePlayback(msg.data);
      break;

    case 'transcript':
      appendTranscript(msg.role, msg.text);
      break;

    case 'interrupted':
      flushPlayback();
      setState(state === State.SPEAKING ? State.LISTENING : state);
      break;

    case 'turn_complete':
      // Transition back to listening once all queued audio drains
      waitForPlaybackEnd(() => setState(State.LISTENING));
      break;

    case 'error':
      showError(`[${msg.code}] ${msg.message}`);
      break;
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
      if (e.data.type === 'pcm' && ws?.readyState === WebSocket.OPEN) {
        const base64 = arrayBufferToBase64(e.data.buffer);
        ws.send(JSON.stringify({ type: 'audio', data: base64 }));
        if (state === State.READY || state === State.SPEAKING) setState(State.LISTENING);
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
  captureCtx = null;
  micStream = null;
}

// ---------------------------------------------------------------------------
// Audio playback scheduler
// ---------------------------------------------------------------------------
function getPlaybackCtx() {
  if (!playbackCtx || playbackCtx.state === 'closed') {
    playbackCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    playbackHead = playbackCtx.currentTime;
  }
  return playbackCtx;
}

function schedulePlayback(base64Pcm) {
  const ctx = getPlaybackCtx();
  const int16 = new Int16Array(base64ToArrayBuffer(base64Pcm));
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
  source.onended = () => {
    sourceNodes = sourceNodes.filter((n) => n !== source);
  };
}

function flushPlayback() {
  sourceNodes.forEach((n) => { try { n.stop(); } catch {} });
  sourceNodes = [];
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
  playbackCtx = null;
  ws = null;
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
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function int16ToFloat32(int16) {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}
