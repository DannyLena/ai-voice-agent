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

const doc = {
  display_name:      'Test Client',
  encrypted_api_key,
  model:             'gemini-2.5-flash-native-audio-latest',
  voice:             'Puck',
  system_prompt:     'You are a helpful, concise voice assistant.',
  enabled:           true,
};

await db.collection('clients').doc(clientId).set(doc);

console.log(`✓ Firestore document written: clients/${clientId}`);
console.log(`  model: ${doc.model}`);
console.log(`  voice: ${doc.voice}`);
console.log(`  encrypted_api_key: ${encrypted_api_key.slice(0, 20)}…`);
