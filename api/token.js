import { GoogleGenAI } from '@google/genai';
import { getClientConfig } from '../services/firestore.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = req.query.client_id;
  if (!clientId) {
    return res.status(400).json({ error: 'Missing client_id' });
  }

  let config;
  try {
    config = await getClientConfig(clientId);
  } catch (err) {
    const status = err.code === 'CLIENT_NOT_FOUND' ? 404
                 : err.code === 'CLIENT_DISABLED'  ? 403
                 : 500;
    return res.status(status).json({ error: err.message, code: err.code });
  }

  const ai = new GoogleGenAI({ apiKey: config.api_key });

  let token;
  try {
    token = await ai.authTokens.create({
      config: {
        uses: 1,
        liveConnectConstraints: {
          model: config.model ?? 'gemini-2.0-flash-live-001',
          config: {
            responseModalities: ['AUDIO'],
            systemInstruction: config.system_prompt
              ? { parts: [{ text: config.system_prompt }] }
              : undefined,
            speechConfig: config.voice
              ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } } }
              : undefined,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });
  } catch (err) {
    console.error('Failed to mint ephemeral token:', err);
    return res.status(502).json({ error: 'Failed to create session token' });
  }

  return res.status(200).json({
    token: token.name,
    model: config.model ?? 'gemini-2.0-flash-live-001',
    voice: config.voice,
  });
}
