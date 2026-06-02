# SOP — GenAI Voice Assistant
### Standard Operating Procedure for Building & Deploying Client MVP Voice Agents
**Product:** GenAI Voice Assistant  
**Provider:** 360 .AI eMarketing SEO — Danny Lena  
**Tool:** Claude Code Desktop on Mac  
**Template Repo:** `/Users/dannysmacbookpro/ai-voice-agent`  
**Last Updated:** June 2026

---

## HOW TO USE THIS DOCUMENT

This SOP is used at the start of every new client GenAI Voice Assistant build.

1. **Complete Part 1** — gather everything from the client before opening Claude
2. **Open a new Claude Code Desktop session** in the client's local folder
3. **Paste Part 2** (filled in) as your first message to Claude
4. **Claude executes Part 3** — you assist when prompted
5. **Verify Part 4** — confirm the MVP is complete before client handoff

---

## PART 1 — YOUR PRE-SESSION CHECKLIST
### Everything you gather BEFORE opening Claude

Complete every item in this checklist. Do not open a new Claude session until all items marked **[REQUIRED]** are checked.

---

### 1.1 — Client Information

- [ ] **Client business name** (full legal/brand name) — `________________`  **[REQUIRED]**
- [ ] **Client ID** (short slug, lowercase, no spaces — e.g., `acme-corp`) — `________________`  **[REQUIRED]**
- [ ] **Website URL** — `________________`  **[REQUIRED]**
- [ ] **Business phone number** — `________________`  **[REQUIRED]**
- [ ] **Business hours** — `________________`  **[REQUIRED]**
- [ ] **Business address / location** — `________________`
- [ ] **Primary contact name & title** — `________________`
- [ ] **Email address** — `________________`
- [ ] **Industry / business type** — `________________`  **[REQUIRED]**

---

### 1.2 — Brand Assets

- [ ] **Primary brand color** (hex code, e.g., `#1B5EDB`) — `________________`  **[REQUIRED]**
- [ ] **Secondary / accent color** (hex code) — `________________`
- [ ] **Logo file** saved locally at path: `________________`  **[REQUIRED]**
- [ ] **Font name** (or "match website") — `________________`
- [ ] **Brand tone** (e.g., professional, friendly, bold, warm) — `________________`  **[REQUIRED]**
- [ ] **Background color preference** (dark/light/custom) — `________________`

---

### 1.3 — Voice Agent Persona

- [ ] **Agent name** (e.g., "Aria", "Max", "The [Brand] Assistant") — `________________`  **[REQUIRED]**
- [ ] **Voice selection** (circle one): **Kore** (female) · **Aoede** (female) · **Puck** (male) · **Charon** (male) · **Fenrir** (male)  **[REQUIRED]**
- [ ] **Agent tone / personality notes** — `________________`
- [ ] **Topics the agent should NEVER discuss** — `________________`
- [ ] **Human handoff phrase** (default: "Let me connect you with our team") — `________________`
- [ ] **Human handoff phone number** — `________________`  **[REQUIRED]**

---

### 1.4 — Knowledge Base Content

This is the most important item. The agent is only as good as the content you give it.

- [ ] **Knowledge base document** created and saved locally at path: `________________`  **[REQUIRED]**

The knowledge base document should be a plain `.txt` or `.md` file containing:

```
COMPANY OVERVIEW
- What the business does, founding story, years in business, mission

SERVICES / PRODUCTS
- One section per service or product
- What it is, who it's for, key benefits, differentiators

TEAM
- Key staff names, titles, brief bios

PRICING
- Philosophy (custom quotes, packages, free consultation, etc.)
- Never include specific dollar amounts unless client approves it

FAQS
- 10–20 most common customer questions with answers

LOCATION & CONTACT
- Address, phone, hours, email, social media

GUARDRAILS
- Topics to avoid, promises not to make, competitor policy

HUMAN HANDOFF TRIGGERS
- Phrases that should trigger transfer to a live person
```

---

### 1.5 — Technical Accounts to Create

Create all of these BEFORE the Claude session. Log in as the client (or as admin on their behalf).

#### Google Account & Gemini API Key
- [ ] Log into or create the **client's Google account**
- [ ] Go to [aistudio.google.com](https://aistudio.google.com) → API Keys → Create API Key
- [ ] Name it: `[client-name]-voice-agent`
- [ ] **Copy and save the API key** — `________________`  **[REQUIRED]**
- [ ] Confirm billing is enabled on the associated Google Cloud project

#### GitHub
- [ ] Create or log into the **client's GitHub account**
- [ ] Note the GitHub username: `________________`  **[REQUIRED]**
- [ ] Have login credentials accessible during the session

#### Firebase
- [ ] Go to [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Create a **new Firebase project** named: `[client-name]-voice-agent`
- [ ] Enable **Firestore Database** (start in production mode)
- [ ] Go to Project Settings → Service Accounts → **Generate new private key**
- [ ] Save the downloaded JSON file locally at path: `________________`  **[REQUIRED]**
- [ ] Note the Firebase project ID: `________________`  **[REQUIRED]**

#### Vercel
- [ ] Create or log into the **client's Vercel account**
- [ ] Have login credentials accessible during the session
- [ ] Note the Vercel account/team name: `________________`

---

### 1.6 — Local Folder Setup

- [ ] Create a new local folder on your Mac: `/Users/dannysmacbookpro/[client-id]-voice-agent/`
- [ ] Copy the contents of `/Users/dannysmacbookpro/ai-voice-agent/` into the new folder
- [ ] Confirm the folder path: `________________`  **[REQUIRED]**

---

## PART 2 — SESSION OPENER TEMPLATE
### Copy this, fill in every `[BRACKET]`, paste as your first message to Claude

---

```
I am Danny Lena of 360 .AI eMarketing SEO. I build and sell a product called the 
GenAI Voice Assistant — a real-time AI voice agent embedded on client websites. 
I am the technical service provider. Each client gets their own infrastructure.

We are starting a new client build. Please follow the GenAI Voice Assistant SOP 
located at /Users/dannysmacbookpro/ai-voice-agent/SOP-GenAI-Voice-Assistant.md
and execute Part 3 (Claude's Execution Playbook) for this client.

The reference/template codebase is at: /Users/dannysmacbookpro/ai-voice-agent/
The client working folder is: /Users/dannysmacbookpro/[CLIENT-ID]-voice-agent/

--- CLIENT INFORMATION ---
Business Name:        [FULL BUSINESS NAME]
Client ID (slug):     [client-id]
Website URL:          [https://clientwebsite.com]
Industry:             [INDUSTRY]
Phone:                [PHONE NUMBER]
Hours:                [BUSINESS HOURS]
Location:             [CITY, STATE]

--- BRAND ---
Primary Color:        [#HEX]
Secondary Color:      [#HEX]
Background:           [dark / light / custom]
Font:                 [FONT NAME or "match website"]
Logo file path:       [/Users/dannysmacbookpro/path/to/logo.png]
Brand tone:           [professional / friendly / bold / warm / etc.]

--- VOICE AGENT PERSONA ---
Agent Name:           [AGENT NAME]
Voice:                [Kore / Aoede / Puck / Charon / Fenrir]
Handoff Number:       [+1XXXXXXXXXX]
Handoff Phrase:       [PHRASE or "use default"]

--- KNOWLEDGE BASE ---
File path:            [/Users/dannysmacbookpro/path/to/knowledge-base.txt]

--- TECHNICAL ---
Gemini API Key:       [API KEY]
Firebase Project ID:  [project-id]
Firebase JSON path:   [/Users/dannysmacbookpro/path/to/serviceAccountKey.json]
GitHub Username:      [username]
Vercel Account:       [account name]

--- ENCRYPTION KEY ---
Generate a new one for this client (do not reuse from other clients).
Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## PART 3 — CLAUDE'S EXECUTION PLAYBOOK
### What Claude does once briefed — step by step

*This section is written for Claude to follow in a new session.*

---

### STEP 1 — Read the SOP and confirm client brief

1. Read this SOP from the template repo
2. Confirm all required fields are present in the session opener
3. If anything is missing, ask Danny before proceeding
4. Confirm the client working folder exists and contains the template code

---

### STEP 2 — Configure the working folder

1. Open the client working folder
2. Update `package.json`:
   - Change `"name"` to `"[client-id]-voice-agent"`
   - Confirm dependencies are correct
3. Create `.env` in the client folder:
```
CREDENTIAL_ENCRYPTION_KEY=[generate new 64-char hex key]
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
PORT=3000
HOST=0.0.0.0
```
4. Copy the client's Firebase service account JSON into the folder as `serviceAccountKey.json`
5. Update `api/token.js` default model if needed

---

### STEP 3 — Initialize GitHub repository

1. Confirm GitHub CLI (`gh`) is available or use git commands
2. Create a new private repository named `[client-id]-voice-agent` on the client's GitHub account
3. Initialize git in the working folder
4. Add `.gitignore` to exclude: `.env`, `serviceAccountKey.json`, `*.json` (service account), `node_modules`
5. Make initial commit and push to the new repo

---

### STEP 4 — Deploy to Vercel

1. Run `vercel --prod` from the client working folder (using `~/.npm-global/bin/vercel`)
2. When prompted:
   - Team: client's Vercel account
   - Link to existing: No
   - Name: `[client-id]-voice-agent`
   - Directory: `./`
   - Customize settings: No
3. Add environment variables via Vercel CLI:
   - `CREDENTIAL_ENCRYPTION_KEY` → the generated hex key
   - `GOOGLE_SERVICE_ACCOUNT_JSON` → contents of serviceAccountKey.json (pipe from file)
4. Redeploy: `vercel --prod`
5. Note the production URL: `https://[client-id]-voice-agent-[hash].vercel.app`
6. Note the aliased URL

---

### STEP 5 — Seed Firestore

1. Build the full system prompt from the knowledge base file
2. Structure it as:
```
You are [AGENT NAME] — the AI voice assistant for [BUSINESS NAME]...
[ROLE]
[COMPANY FACTS]
[SERVICES — detailed]
[TONE & STYLE]
[GUARDRAILS]
[HUMAN HANDOFF instructions]
[OPENING GREETING]
```
3. Run the seed script:
```bash
node scripts/seed-test-client.js [client-id] [GEMINI_API_KEY]
```
4. Verify in Firebase console: `clients/[client-id]` document exists with correct fields:
   - `display_name`
   - `encrypted_api_key`
   - `model: gemini-2.5-flash-native-audio-latest`
   - `voice: [selected voice]`
   - `system_prompt: [full prompt]`
   - `enabled: true`

---

### STEP 6 — Test the voice agent

1. Open: `https://[client-vercel-url]?client_id=[client-id]`
2. Click Start — confirm mic permission prompt appears
3. Confirm connection to Gemini (status turns green / "Listening")
4. Speak a test question — confirm voice response in the correct voice
5. Check transcript appears correctly
6. Confirm the agent stays on-brand and answers from the knowledge base
7. Test the handoff button — confirm it shows the correct phone number

---

### STEP 7 — Build the client HTML widget page

1. Read the client's website to understand design patterns, colors, and layout
2. Create `[client-name]-Voice-Agent.html` in the client working folder
3. Build the page using:
   - Client's brand colors (`--primary`, `--accent`, etc.)
   - Client's logo
   - Client's fonts
   - The voice panel widget wired to their Vercel URL and client ID
   - The same JavaScript pattern from `GenAI-Voice-Tool.html` with `API_BASE` and `CLIENT_ID` updated
4. Key variables to update in the HTML:
```javascript
const CLIENT_ID      = '[client-id]';
const API_BASE       = 'https://[client-vercel-url].vercel.app';
const HANDOFF_NUMBER = '[+1XXXXXXXXXX]';
```
5. Update the audio worklet URL:
```javascript
await captureCtx.audioWorklet.addModule(`${API_BASE}/audio-processor.worklet.js`);
```

---

### STEP 8 — Final commit and push

1. Commit all changes to the client's GitHub repo
2. Push to main
3. Confirm Vercel auto-deploys from GitHub (connect repo in Vercel dashboard if not already)

---

## PART 4 — MVP DELIVERY CHECKLIST
### Confirm every item before client handoff

#### Infrastructure
- [ ] GitHub repo created and code pushed: `github.com/[client-github]/[client-id]-voice-agent`
- [ ] Firebase project live with Firestore `clients/[client-id]` document
- [ ] Vercel project deployed at: `https://________________`
- [ ] All 3 env vars set in Vercel (CREDENTIAL_ENCRYPTION_KEY, GOOGLE_SERVICE_ACCOUNT_JSON)
- [ ] `.env` and `serviceAccountKey.json` are in `.gitignore` — never committed

#### Voice Agent
- [ ] Agent connects and responds at the Vercel URL
- [ ] Correct voice (Kore / Aoede / Puck / etc.) confirmed
- [ ] Agent answers questions accurately from the knowledge base
- [ ] Agent stays on-brand — no hallucinations on company facts
- [ ] Mic permission error gives helpful message (not a raw error)
- [ ] Handoff button shows correct phone number

#### HTML Widget Page
- [ ] `[client-name]-Voice-Agent.html` built and tested locally
- [ ] Client brand colors, logo, and fonts applied correctly
- [ ] `CLIENT_ID` and `API_BASE` point to correct values
- [ ] Page tested in Chrome desktop ✓
- [ ] Page tested in Safari desktop ✓
- [ ] Page tested on iPhone (Safari) ✓
- [ ] Page tested on Android (Chrome) ✓
- [ ] `<meta name="robots" content="noindex, nofollow">` in `<head>`
- [ ] HTML file ready to upload to client's web server

#### Handoff to Client
- [ ] Vercel URL shared with client for internal testing
- [ ] Instructions provided for uploading HTML to their server
- [ ] Firebase console access given to client (or retained as admin)
- [ ] Note made of how to update the system prompt in Firestore for future KB updates

---

## QUICK REFERENCE — Key URLs & Values Per Client

Fill this in at project completion:

```
CLIENT:                [Business Name]
CLIENT ID:             [client-id]
LOCAL FOLDER:          /Users/dannysmacbookpro/[client-id]-voice-agent/
GITHUB REPO:           https://github.com/[github-username]/[client-id]-voice-agent
FIREBASE PROJECT:      https://console.firebase.google.com/project/[project-id]
FIRESTORE DOCUMENT:    clients/[client-id]
VERCEL URL:            https://[client-id]-voice-agent-[hash].vercel.app
VERCEL ALIAS:          https://[client-id]-voice-agent.vercel.app
HTML FILE:             [client-name]-Voice-Agent.html
HANDOFF NUMBER:        [phone]
VOICE:                 [Kore / Aoede / Puck / etc.]
GEMINI MODEL:          gemini-2.5-flash-native-audio-latest
```

---

## KNOWN ISSUES & SOLUTIONS

| Issue | Cause | Fix |
|---|---|---|
| "model not found" error | Model name outdated | Query available models: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=[API_KEY]"` — find model with `bidiGenerateContent` support |
| "Invalid JSON" on token endpoint | GOOGLE_SERVICE_ACCOUNT_JSON was set to literal text instead of JSON | Use: `cat serviceAccountKey.json \| vercel env add GOOGLE_SERVICE_ACCOUNT_JSON production` |
| Mic denied on iPhone | Safari requires explicit permission | Settings → Safari → Microphone → Allow. Then AA button in address bar → Microphone → Allow |
| Mic denied on Chrome | Permission was blocked | Click 🔒 in address bar → Site Settings → Microphone → Allow → Reload |
| CORS error on token fetch | Token API missing CORS headers | Confirm `api/token.js` has `Access-Control-Allow-Origin: *` header |
| Vercel CLI not found | PATH not set | Run: `export PATH="$HOME/.npm-global/bin:$PATH"` |

---

*SOP created: June 2026 — Danny Lena / 360 .AI eMarketing SEO*  
*Built with Claude Code Desktop*
