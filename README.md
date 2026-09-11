# Conference Management Agent (Agent 26)
### AGENTIC AI HACKATHON · Group 4: Extension and Outreach Agents
**Hosted by:** Vignan's Foundation for Science, Technology & Research (CSE Department)

---

## 📌 Executive Summary
The **Conference Management Agent (Agent 26)** is an enterprise-grade agentic AI application designed to run academic conferences end-to-end. Powered by **Bolt**, an autonomous assistant with actual backend tool dispatching, the platform coordinates all 46 critical stages of academic event operations:

- **Conference Configuration & Multi-Track Setup**
- **AI Call for Papers (CFP) Generator & Distribution**
- **Paper Submissions, Formatting Validation & Local Similarity Checks**
- **Agent 17 Integration (Faculty Research Publication Monitoring Agent)**
- **Weighted Reviewer Matching Engine (5-factor formula)**
- **Conflict of Interest (COI) Detection Engine**
- **Peer Review Management & Divergent Review Arbitration**
- **AI Decision Support & General Chair Binding Verdicts**
- **Author Decision Letters & Camera-Ready Tracking**
- **Category-Based Registrations & Sandbox Payment Gateway**
- **AI Conflict-Free Programme Scheduler & Session Allocations**
- **Tamper-Evident Academic Certificates with SHA-256 Verification**
- **Proceedings Compilation with Strict "ISBN Pending" Handling**
- **Post-Event Conference Intelligence & Live Analytics**

---

## 🤖 Bolt — Autonomous Conference Assistant
- **Identity**: *"Hi, I'm Bolt, your Conference Management Assistant."*
- **Visual Design**: 3D animated robotic character with ambient levitation and glowing reactive visor eyes.
- **Agent Tool Architecture**: Bolt invokes real backend tools (`conferenceConfigurationTool`, `reviewerMatchingTool`, `coiDetectionTool`, `decisionSupportTool`, `similarityTool`, `scheduleTool`, `certificateTool`, `proceedingsTool`, `analyticsTool`).

---

## 🔬 Agent 17 Integration (Faculty Publication Agent)
Agent 17 maintains verified faculty publications and research competencies.
- **Provider Pattern**: Implemented behind the strict `Agent17Provider` TypeScript interface.
- **Mock Implementation**: `Agent17MockProvider` is enabled via `AGENT17_PROVIDER=mock`, delivering synthetic records for **18 faculty researchers** with **104+ publications** across 15 domains (AI, ML, Deep Learning, Computer Vision, NLP, Cybersecurity, Data Science, Cloud, IoT, Distributed Systems, Software Engineering, Robotics, Blockchain, HCI, and Information Retrieval).
- **Live Upgrade**: Set `AGENT17_PROVIDER=live` with `AGENT17_API_URL` and `AGENT17_API_KEY` to connect to a live Agent 17 deployment without modifying reviewer matching or COI logic.

---

## 🛠️ Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, `pdf-lib`, `groq-sdk`, `@supabase/supabase-js`, `uuid`
- **Database**: Supabase PostgreSQL + Active Embedded Store
- **AI Inference**: Groq Cloud LPU (`llama-3.3-70b-versatile`) with offline deterministic fallback
- **Payments**: Academic Sandbox Payment Gateway Simulator (0 real-money risk)
- **Testing**: Jest, Supertest, TypeScript Compiler (`tsc`)

---

## 📂 Project Structure
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
│   │   │   ├── payment/                    # Sandbox payment simulator
│   │   │   ├── email/                      # Email dispatcher abstraction
│   │   │   └── supabase/                   # Supabase client wrapper
│   │   ├── database/db.ts                  # Central database store with seed data
│   │   ├── routes/api.ts                   # REST API routes
│   │   └── index.ts                        # Express server entry point
│   ├── tests/services.test.ts              # Automated Jest test suite
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/                     # Header (Vignan branding), BoltAvatar, BoltChat
│   │   ├── pages/                          # Overview, CFP, Submissions, Reviewers, etc.
│   │   ├── services/api.ts                 # Typed API client
│   │   ├── types/index.ts                  # Shared data models
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── database/
│   ├── migrations/001_initial_schema.sql   # Complete Supabase PostgreSQL schema
│   └── seed/seed.sql                       # Production seed dataset
├── docs/                                   # Architecture, Database, Integrations, Demo
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
# In backend
cd backend
npm install

# In frontend
cd ../frontend
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(All services run out of the box with embedded fallbacks if API keys are left blank)*

### 3. Run Backend Server
```bash
cd backend
npm run dev
# Server boots on http://localhost:5000
```

### 4. Run Frontend App
```bash
cd frontend
npm run dev
# Web application available on http://localhost:5173
```

### 5. Run Automated Tests
```bash
cd backend
npm test
```

---

## 🏆 Hackathon Demo Workflow
Please see [`docs/demo.md`](docs/demo.md) for the complete 5–10 minute judging script covering:
1. Vignan institutional branding & Bolt AI introduction.
2. Submission validation & local n-gram similarity checks.
3. Reviewer recommendation via Agent 17 Mock Provider.
4. Conflict of Interest (COI) flags & resolution.
5. Divergent review alert & AI decision synthesis.
6. Sandbox payment authorization & verified digital receipts.
7. Conflict-free programme timetable generation.
8. Cryptographic certificate verification & PDF download.
9. Proceedings compilation with `"ISBN pending"` compliance.
10. Live telemetry on `/integrations`.
