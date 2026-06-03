import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { encrypt } from '../utils/crypto.js';

const [,, clientId, geminiApiKey] = process.argv;

if (!clientId || !geminiApiKey) {
  console.error('Usage: node scripts/seed-test-client.js <client_id> <gemini_api_key>');
  process.exit(1);
}

initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
const db = getFirestore();

const encrypted_api_key = encrypt(geminiApiKey);

// update() preserves all other fields (system_prompt, voice, model, display_name, etc.)
await db.collection('clients').doc(clientId).update({ encrypted_api_key });

console.log(`✓ encrypted_api_key updated on clients/${clientId}`);
console.log(`  encrypted_api_key: ${encrypted_api_key.slice(0, 20)}…`);
