# Conference Management Agent (Agent 26) — Architecture Guide

## 1. System Overview
The **Conference Management Agent (Agent 26)** is an autonomous agentic system engineered for academic institutions to coordinate the entire lifecycle of international peer-reviewed academic conferences.

Developed for the **AGENTIC AI HACKATHON** under **Group 4 (Extension & Outreach Agents)**, the system is anchored by **Bolt**, an intelligent autonomous assistant that executes real backend tools rather than returning static boilerplate text.

```
+-----------------------------------------------------------------------------------+
|                            VIGNAN'S UNIVERSITY PORTAL                             |
|       CSE PRESENTS: AGENTIC AI HACKATHON (AGENT 26 - CONFERENCE MANAGEMENT)       |
+-----------------------------------------------------------------------------------+
                                          |
                         +---------------------------------+
                         |      React 18 + Vite UI         |
                         |   (Tailwind CSS + Lucide Icons) |
                         +---------------------------------+
                                          |
                                    REST API /api
                                          |
                         +---------------------------------+
                         |    Node.js + Express Backend    |
                         +---------------------------------+
                           /       |             \        \
                          /        |              \        \
        +----------------+  +--------------+  +----------+  +------------------+
        |   Bolt Agent   |  |   Agent 17   |  | Payment  |  |  Dual Database   |
        | & Tool Dispatch|  | Provider Int.|  | Sandbox  |  | (Supabase Postgre|
        |  (Groq/Local)  |  |  (Mock/Live) |  | Gateway  |  |   + Local Store) |
        +----------------+  +--------------+  +----------+  +------------------+
```

---

## 2. Agent 17 Provider Abstraction
**Agent 17** represents the *Faculty Research Publication Monitoring Agent*. The system does not hardcode fake profiles into business logic; instead, it interfaces through the `Agent17Provider` contract:

```typescript
export interface Agent17Provider {
  getResearchers(domain?: string): Promise<Agent17Researcher[]>;
  getResearcherById(researcherId: string): Promise<Agent17Researcher | null>;
  searchExpertise(keywords: string[]): Promise<Agent17Researcher[]>;
  getPublicationHistory(researcherId: string): Promise<Agent17Publication[]>;
  getCoauthors(researcherId: string): Promise<string[]>;
  getProviderStatus(): { ... };
}
```

### Implementations:
1. `Agent17MockProvider`: Loaded by default (`AGENT17_PROVIDER=mock`). Populated with 18 faculty researchers and 104+ publication records across 15 subfields (AI, ML, Deep Learning, Computer Vision, NLP, Cybersecurity, Data Science, Cloud, IoT, Distributed Systems, Software Engineering, Robotics, Blockchain, HCI, and Information Retrieval).
2. `Agent17LiveProvider`: Enabled when `AGENT17_PROVIDER=live`, dispatching authenticated HTTPS requests to `AGENT17_API_URL`.

---

## 3. Reviewer Matching Engine
Matching calculates a weighted score for every non-conflicted candidate:

$$\text{Total Score} = 0.50 \times \text{Expertise} + 0.20 \times \text{Keywords} + 0.15 \times \text{Track} + 0.10 \times \text{Workload} + 0.05 \times \text{Signals}$$

- **Expertise (50%)**: n-gram token overlap across published paper titles and research keywords.
- **Keywords (20%)**: Paper keywords matched against faculty declared competencies.
- **Track (15%)**: Departmental and track alignment.
- **Workload & Availability (10%)**: Active assignments vs maximum capacity.
- **Suitability Signals (5%)**: Citation count and h-index scaling.

---

## 4. Conflict of Interest (COI) Engine
Automated filters prevent peer-review breaches based on:
1. **Self-Authorship**: Reviewer is an author of the manuscript.
2. **Same Institution**: Reviewer shares an institutional affiliation with any paper author.
3. **Same Department**: Specific departmental overlap.
4. **Recent Co-authorship**: Reviewer co-authored a publication with any author in the preceding 36-month window.

---

## 5. Constraint-Satisfaction Programme Scheduler
The scheduler resolves scheduling constraints:
- **No Concurrent Speaker Conflicts**: Same author cannot be placed in two rooms in the same time slot.
- **Track Grouping**: Papers in the same track are clustered in consistent halls (Main Auditorium, Seminar Hall B, Colloquium Room C).
- **Session Chair Integrity**: Faculty cannot chair a session featuring their own papers.
