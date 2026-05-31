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

  return res.status(200).json({
    token: config.api_key,
    model: config.model ?? 'gemini-2.5-flash-native-audio-latest',
    voice: config.voice,
    system_prompt: config.system_prompt,
  });
}
