import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { decrypt } from '../utils/crypto.js';

const CLIENTS_COLLECTION = 'clients';

function getDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  }
  return getFirestore();
}

/**
 * Fetches and returns a fully-decrypted client config from Firestore.
 *
 * Expected Firestore document shape (collection: "clients", doc ID: client_id):
 * {
 *   display_name:       string,
 *   encrypted_api_key:  string,   // AES-256-GCM base64 from utils/crypto.js
 *   model:              string,   // e.g. "gemini-2.0-flash-live-001"
 *   voice:              string,   // e.g. "Puck"
 *   system_prompt:      string,
 *   enabled:            boolean,
 * }
 *
 * Returns the same shape with `api_key` (plaintext) replacing `encrypted_api_key`.
 */
export async function getClientConfig(clientId) {
  if (!clientId) throw new Error('client_id is required');

  const doc = await getDb().collection(CLIENTS_COLLECTION).doc(clientId).get();

  if (!doc.exists) {
    const err = new Error(`No client config found for client_id: ${clientId}`);
    err.code = 'CLIENT_NOT_FOUND';
    throw err;
  }

  const data = doc.data();

  if (data.enabled === false) {
    const err = new Error(`Client ${clientId} is disabled`);
    err.code = 'CLIENT_DISABLED';
    throw err;
  }

  if (!data.encrypted_api_key) {
    const err = new Error(`Client ${clientId} has no API key configured`);
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  let api_key;
  try {
    api_key = decrypt(data.encrypted_api_key);
  } catch {
    const err = new Error(`Failed to decrypt API key for client ${clientId}`);
    err.code = 'DECRYPTION_FAILED';
    throw err;
  }

  const { encrypted_api_key: _removed, ...rest } = data;
  return { ...rest, api_key };
}
