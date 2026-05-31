import { GoogleGenAI, Modality } from '@google/genai';

const INPUT_MIME = 'audio/pcm;rate=16000';

/**
 * Opens a Gemini Live session scoped to a single client's credentials.
 *
 * @param {object} config   - Decrypted client record from Firestore
 * @param {object} handlers - Callbacks wired to the WebSocket in server.js
 * @returns {{ sendAudio, endTurn, close }}
 */
export async function createGeminiSession(config, handlers) {
  const { api_key, model, voice, system_prompt } = config;
  const { onAudio, onTranscript, onInterrupted, onTurnComplete, onError } = handlers;

  // One GoogleGenAI instance per session — billing hits the client's own project.
  const ai = new GoogleGenAI({ apiKey: api_key });

  let session;

  // connect() resolves once the underlying WebSocket is open.
  session = await ai.live.connect({
    model: model ?? 'gemini-2.0-flash-live-001',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: system_prompt
        ? { parts: [{ text: system_prompt }] }
        : undefined,
      speechConfig: voice
        ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        : undefined,
      // Ask Gemini to emit transcriptions for both sides
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen() {
        // Session is open — server.js sends 'ready' after this resolves.
      },

      onmessage(msg) {
        try {
          handleMessage(msg, { onAudio, onTranscript, onInterrupted, onTurnComplete });
        } catch (err) {
          onError(err);
        }
      },

      onerror(err) {
        console.error('[Gemini] session error:', err);
        onError(err instanceof Error ? err : new Error(String(err)));
      },

      onclose(e) {
        console.warn('[Gemini] session closed — code:', e?.code, 'reason:', e?.reason);
      },
    },
  });

  return {
    /**
     * Send a base64-encoded Int16 PCM chunk (16 kHz mono) to Gemini.
     */
    async sendAudio(base64Pcm) {
      await session.sendRealtimeInput({
        audio: { data: base64Pcm, mimeType: INPUT_MIME },
      });
    },

    /**
     * Signal the end of the user's audio turn.
     */
    async endTurn() {
      await session.sendRealtimeInput({ audioStreamEnd: true });
    },

    /**
     * Gracefully close the session.
     */
    async close() {
      try { session.close(); } catch { /* already closed */ }
    },
  };
}

// ---------------------------------------------------------------------------
// Internal message router
// ---------------------------------------------------------------------------
function handleMessage(msg, { onAudio, onTranscript, onInterrupted, onTurnComplete }) {
  const sc = msg.serverContent;
  if (!sc) return;

  // ── Barge-in / interrupt ─────────────────────────────────────────────────
  if (sc.interrupted) {
    onInterrupted();
    return;
  }

  // ── Model turn: audio + text parts ──────────────────────────────────────
  const parts = sc.modelTurn?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      onAudio(part.inlineData.data);
    }
    if (part.text) {
      onTranscript('model', part.text);
    }
  }

  // ── Transcriptions (separate from model turn parts) ─────────────────────
  if (sc.inputTranscription?.text) {
    onTranscript('user', sc.inputTranscription.text);
  }
  if (sc.outputTranscription?.text) {
    onTranscript('model', sc.outputTranscription.text);
  }

  // ── Turn complete ────────────────────────────────────────────────────────
  if (sc.turnComplete) {
    onTurnComplete();
  }
}
