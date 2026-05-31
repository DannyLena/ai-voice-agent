import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { getClientConfig } from './services/firestore.js';
import { createGeminiSession } from './services/gemini.js'; // built in Step 6

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
});

await fastify.register(fastifyStatic, {
  root: join(__dirname, 'public'),
  prefix: '/',
});

await fastify.register(fastifyWebsocket);

// ---------------------------------------------------------------------------
// Health check (used by Railway)
// ---------------------------------------------------------------------------
fastify.get('/health', async () => ({ status: 'ok' }));

// ---------------------------------------------------------------------------
// WebSocket route: /agent?client_id=<id>
// ---------------------------------------------------------------------------
fastify.register(async (app) => {
  app.get('/agent', { websocket: true }, async (socket, req) => {
    const clientId = req.query.client_id;

    // ── 1. Validate client_id ──────────────────────────────────────────────
    if (!clientId) {
      sendJson(socket, { type: 'error', code: 'MISSING_CLIENT_ID', message: 'client_id query param is required' });
      socket.close(1008, 'missing client_id');
      return;
    }

    fastify.log.info({ clientId }, 'WebSocket connection received');

    // ── 2. Fetch + decrypt client config ──────────────────────────────────
    let config;
    try {
      config = await getClientConfig(clientId);
    } catch (err) {
      fastify.log.warn({ clientId, code: err.code }, 'Client config error: %s', err.message);
      const userMessage = userFacingError(err.code);
      sendJson(socket, { type: 'error', code: err.code, message: userMessage });
      socket.close(1008, userMessage);
      return;
    }

    fastify.log.info({ clientId, model: config.model }, 'Client config loaded');

    // ── 3. Open Gemini Live session ────────────────────────────────────────
    let gemini;
    try {
      gemini = await createGeminiSession(config, {
        onAudio: (base64Pcm) => sendJson(socket, { type: 'audio', data: base64Pcm }),
        onTranscript: (role, text) => sendJson(socket, { type: 'transcript', role, text }),
        onInterrupted: () => sendJson(socket, { type: 'interrupted' }),
        onTurnComplete: () => sendJson(socket, { type: 'turn_complete' }),
        onError: (err) => {
          fastify.log.error({ clientId }, 'Gemini session error: %s', err.message);
          sendJson(socket, { type: 'error', code: 'GEMINI_ERROR', message: err.message });
        },
      });
    } catch (err) {
      fastify.log.error({ clientId }, 'Failed to open Gemini session: %s', err.message);
      sendJson(socket, { type: 'error', code: 'SESSION_INIT_FAILED', message: 'Failed to start voice session' });
      socket.close(1011, 'session init failed');
      return;
    }

    // Signal frontend that the session is ready
    sendJson(socket, { type: 'ready', config: { voice: config.voice, model: config.model } });

    // ── 4. Frontend → Gemini message routing ──────────────────────────────
    socket.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        sendJson(socket, { type: 'error', code: 'INVALID_MESSAGE', message: 'Message must be JSON' });
        return;
      }

      switch (msg.type) {
        case 'audio':
          if (!msg.data) return;
          gemini.sendAudio(msg.data).catch((err) => {
            fastify.log.error({ clientId }, 'sendAudio error: %s', err.message);
          });
          break;

        case 'end_turn':
          gemini.endTurn().catch((err) => {
            fastify.log.error({ clientId }, 'endTurn error: %s', err.message);
          });
          break;

        default:
          sendJson(socket, { type: 'error', code: 'UNKNOWN_TYPE', message: `Unknown message type: ${msg.type}` });
      }
    });

    // ── 5. Cleanup ─────────────────────────────────────────────────────────
    socket.on('close', () => {
      fastify.log.info({ clientId }, 'WebSocket closed — tearing down Gemini session');
      gemini.close().catch(() => {});
    });

    socket.on('error', (err) => {
      fastify.log.error({ clientId }, 'WebSocket error: %s', err.message);
      gemini.close().catch(() => {});
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sendJson(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function userFacingError(code) {
  const messages = {
    CLIENT_NOT_FOUND: 'Unknown client',
    CLIENT_DISABLED: 'This client account is disabled',
    MISSING_API_KEY: 'Client has no API key configured',
    DECRYPTION_FAILED: 'Internal configuration error',
  };
  return messages[code] ?? 'Internal server error';
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
try {
  await fastify.listen({
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '0.0.0.0',
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
