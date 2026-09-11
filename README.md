# Conference Management Agent (Agent 26)
### AGENTIC AI HACKATHON · Group 4: Extension and Outreach Agents
**Host Institution:** Vignan's Foundation for Science, Technology & Research (CSE Department)  
**Repository:** `conference-management-agent`

---

## 📌 Executive Summary
The **Conference Management Agent (Agent 26)** is a production-quality, agentic AI platform designed to automate the entire academic conference lifecycle. Powered by **Bolt**, an autonomous assistant with real backend tool execution, the platform orchestrates all core operational stages:

- **Conference Configuration & Multi-Track Setup**
- **AI Call for Papers (CFP) Generation & Distribution**
- **Paper Submissions, Formatting Validation & Local Similarity Checks**
- **Agent 17 Integration (Faculty Research Publication Monitoring Agent)**
- **Weighted Reviewer Matching Engine (5-factor formula)**
- **Conflict of Interest (COI) Detection Engine**
- **Peer Review Management & Divergent Review Arbitration**
- **AI Decision Support & General Chair Verdict Confirmation**
- **Category-Based Registrations & Sandbox Payment Gateway**
- **AI Conflict-Free Programme Scheduler & Session Allocations**
- **Tamper-Evident Academic Certificates with SHA-256 Verification**
- **Proceedings Compilation with Strict "ISBN Pending" Compliance**
- **Live Telemetry & Post-Event Conference Intelligence**

---

## 🤖 Bolt — Autonomous Conference Assistant
- **Identity**: *"Hi, I'm Bolt, your Conference Management Assistant."*
- **Visual Design**: Clean, modern AI robot mascot with glowing cyan pill eyes, centered in a crisp light-blue gradient card.
- **Agent Tool Architecture**: Bolt invokes real backend tools (`conferenceConfigurationTool`, `reviewerMatchingTool`, `coiDetectionTool`, `decisionSupportTool`, `similarityTool`, `scheduleTool`, `certificateTool`, `proceedingsTool`, `analyticsTool`).

---

## 🔬 Agent 17 Integration (Faculty Publication Agent)
> [!IMPORTANT]
> **Agent 17 uses a Mock Provider because the official Agent 17 API endpoint was not provided.**

Agent 17 manages verified faculty researcher publications and departmental metadata:
- **Interface Abstraction**: Implemented behind the strict `Agent17Provider` TypeScript interface.
- **Mock Implementation**: `Agent17MockProvider` delivers synthetic records for **18 faculty researchers** and **104+ publications** across 15 computer science specializations (AI, ML, Deep Learning, Computer Vision, NLP, Cybersecurity, Data Science, Cloud, IoT, Distributed Systems, Software Engineering, Robotics, Blockchain, HCI, and Information Retrieval).
- **Live Upgrade**: Set `AGENT17_PROVIDER=live` with `AGENT17_API_URL` and `AGENT17_API_KEY` to connect to a live Agent 17 service without code modifications.

---

## 🏛️ Project Architecture
```
conference-management-agent/
├── backend/
│   ├── src/
│   │   ├── agents/boltAgent.ts             # Core assistant logic & intent router
│   │   ├── tools/agentTools.ts             # Backend tools invoked by Bolt
│   │   ├── services/                       # Matching, COI, Similarity, Scheduler, etc.
│   │   ├── integrations/
│   │   │   ├── agent17/                    # Agent 17 interface, mock & live providers
│   │   │   ├── groq/                       # Groq Cloud LPU integration
│   │   │   ├── payment/                    # Sandbox payment gateway simulator
│   │   │   ├── email/                      # Email dispatcher abstraction
│   │   │   └── supabase/                   # Supabase client wrapper
│   │   ├── database/db.ts                  # In-memory & SQLite database store with seed data
│   │   ├── routes/api.ts                   # REST API routes
│   │   └── index.ts                        # Express server entry point
│   ├── tests/services.test.ts              # Automated Jest test suite (8 tests)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── assets/                         # Sourced Bolt robot & VIGNAN'S logo assets
│   │   ├── components/                     # Header (Vignan branding), BoltAvatar, BoltChat
│   │   ├── pages/                          # Overview, CFP, Submissions, Reviewers, etc.
│   │   ├── services/api.ts                 # Typed API client
│   │   ├── types/index.ts                  # Shared data models
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── database/
│   ├── migrations/001_initial_schema.sql   # Supabase PostgreSQL schema
│   └── seed/seed.sql                       # Production seed dataset
├── docs/                                   # Architecture, Database, Integrations, Demo
├── .env.example                            # Safe environment variables template
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Runtime environment | `development` |
| `GROQ_API_KEY` | Groq Cloud LPU API key | *(Optional: Falls back to offline deterministic AI engine)* |
| `GROQ_MODEL` | Groq LLM model name | `llama-3.3-70b-versatile` |
| `SUPABASE_URL` | Supabase project URL | *(Optional: Embedded SQLite store active by default)* |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | *(Optional)* |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | *(Optional)* |
| `AGENT17_PROVIDER` | Agent 17 mode | `mock` (or `live`) |
| `AGENT17_API_URL` | Live Agent 17 URL | *(Optional)* |
| `AGENT17_API_KEY` | Live Agent 17 API key | *(Optional)* |
| `PAYMENT_PROVIDER` | Payment gateway mode | `sandbox` |
| `PAYMENT_PUBLIC_KEY` | Sandbox public key | `pk_test_sandbox_academic_conf_2026` |
| `PAYMENT_SECRET_KEY` | Sandbox secret key | `sk_test_sandbox_secret_conf_2026` |
| `EMAIL_PROVIDER` | Email dispatcher mode | `simulated` |
| `EMAIL_FROM` | Dispatcher sender address | `notifications@vignan-conference.edu` |

*(Note: Every service runs 100% locally out-of-the-box with built-in fallbacks when external API keys are omitted).*

---

## 🛠️ Setup & Integrations Guide

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm run dev
# Express API server starts on http://localhost:5000
# Health check available at: http://localhost:5000/health
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
# Vite dev server starts on http://localhost:5173
```

### 3. Supabase Setup
- Run `database/migrations/001_initial_schema.sql` in the Supabase SQL editor to create all required tables (`conferences`, `tracks`, `papers`, `authors`, `reviewers`, `assignments`, `reviews`, `registrations`, `payments`, `sessions`, `certificates`).
- Run `database/seed/seed.sql` to populate sample academic records.
- Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`.
- *Fallback:* If Supabase is omitted, the backend uses its active internal embedded data store with pre-seeded data.

### 4. Groq Cloud Setup
- Create a free API key at [console.groq.com](https://console.groq.com).
- Add `GROQ_API_KEY=gsk_...` to `.env`.
- Powers Bolt's natural language comprehension, CFP drafting, and reviewer synthesis via `llama-3.3-70b-versatile`.
- *Fallback:* If omitted, the system executes deterministic academic reasoning rules without failing.

### 5. Email Dispatcher Setup
- By default, `EMAIL_PROVIDER=simulated` logs all dispatched notifications (acceptance, reviewer invitations, payment receipts) to the console and in-app event log.
- Set `EMAIL_PROVIDER=smtp` or `sendgrid` with valid credentials for live production delivery.

### 6. Sandbox Payment Setup
- `PAYMENT_PROVIDER=sandbox` provides a complete PCI-compliant academic registration payment simulator.
- Use test card `4242 4242 4242 4242`, any future expiration date (e.g. `12/28`), and any 3-digit CVC (e.g. `123`).
- Simulates bank order generation, 3D secure verification, instant digital receipt generation, and status webhooks with zero real-money risk.

---

## 🧪 Testing

Run the automated Jest test suite covering all 8 backend service modules:
```bash
cd backend
npm test
```
Tests verify:
1. Agent 17 Mock Provider dataset integrity (18 researchers, 104+ papers).
2. COI detection engine for institutional and co-author conflicts.
3. Local n-gram similarity engine and duplicate text detection.
4. 5-factor weighted reviewer matching algorithm.
5. Conflict-free multi-track session scheduling.
6. Cryptographic SHA-256 certificate issuance and verification.
7. Proceedings table of contents compilation with "ISBN pending" enforcement.
8. Bolt AI Agent backend tool dispatching.

---

## 💻 Local Development Workflow

Run both services concurrently:
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Frontend Client
cd frontend && npm run dev
```

---

## 🚢 Deployment

### Frontend (Vercel / Netlify / Cloudflare Pages)
```bash
cd frontend
npm run build
# Deploy the generated dist/ folder
```
Set `VITE_API_URL=https://your-backend-api.com/api` in your frontend environment.

### Backend (Render / Railway / Fly.io / AWS ECS)
```bash
cd backend
npm run build
# Start command: node dist/index.js
```
Set environment variables matching `.env.example`.

---

## 🏆 Hackathon Demo Flow (5–10 Minutes)
1. **Academic Branding & Mascot**: View the VIGNAN'S header crest and the Bolt robot avatar.
2. **Call for Papers**: Generate or inspect conference tracks and deadlines under CFP.
3. **Paper Submissions**: Review submitted papers and run local similarity validation.
4. **Reviewer Matching**: Review the 5-factor recommendation matrix powered by the **Agent 17 Mock Provider**.
5. **Conflict of Interest (COI)**: Observe automated institutional and co-authorship conflict prevention.
6. **Divergent Review Alert**: View flagged reviews where score delta $\ge 4$ points for Chair arbitration.
7. **AI Decision Support**: View AI verdict synthesis and record Chair confirmed decisions.
8. **Sandbox Registrations & Payments**: Test an attendee checkout with the sandbox payment gateway.
9. **Conflict-Free Scheduler**: Generate and view the multi-track room timetable.
10. **Certificates & Proceedings**: Verify a digital SHA-256 certificate hash and view compiled proceedings.
11. **Telemetry**: Check real-time service health on `/integrations`.

