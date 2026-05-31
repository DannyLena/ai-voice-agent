# ARCHITECTURE_V5.md: Production Voice Agent Specification

## 1. Objective
To build a multi-tenant, real-time voice agent using the Google Gemini Multimodal Live API. The system is architected for scalability, allowing clients to provide their own API credentials while ensuring maximum security through dynamic credential injection and at-rest encryption.

## 2. Core Tech Stack
* **Frontend:** HTML5, JavaScript (ES6+), Web Audio API (`AudioWorklet`).
* **Backend:** Node.js + Fastify (high-performance WebSocket proxy).
* **Database:** Firestore (stores client configurations, system prompts, and encrypted credentials).
* **Security:** `crypto` module (for credential encryption/decryption), Environment Variables (for server identity).

## 3. Delegated Credential Model
Instead of using a global API key, the system operates on a per-session delegated model:
1.  **Storage:** Client-specific API credentials are encrypted at rest in Firestore using a server-side secret key.
2.  **Lookup:** Upon connection (via `client_id`), the backend fetches the client's record.
3.  **Decryption:** The backend decrypts the credentials in memory.
4.  **Initialization:** The backend initializes a dedicated `GenerativeLiveClient` instance using the client's own credentials.
5.  **Billing:** All usage is logged against the client's specific Google Cloud project/billing account.

## 4. Implementation Requirements for Claude
* **Encryption Utility:** Create a secure utility module (`utils/crypto.js`) to handle AES-256 encryption/decryption for credentials.
* **Fastify Integration:** Use Fastify to handle the WebSocket upgrade, ensuring low-latency communication with the Gemini Live API.
* **Audio Pipeline:** Implement the `AudioWorklet` processor for 16kHz PCM streaming.
* **Barge-in/Interrupts:** Native Live API interrupt handling must be mapped to the frontend `AudioBuffer` flush logic.
* **Error Handling:** Implement graceful degradation if a client's API key is invalid or reaches a quota limit.

## 5. Development Workflow
* **Step 1:** Setup Firestore collections (Client configurations + Encrypted Credentials).
* **Step 2:** Build the Encryption/Decryption utility.
* **Step 3:** Setup Fastify backend with WebSocket support.
* **Step 4:** Implement the frontend `AudioWorklet` and UI state manager.
* **Step 5:** Integrate the Gemini Live API with dynamic client-session initialization.
