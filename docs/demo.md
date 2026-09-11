# Judge Demonstration Workflow (5–10 Minutes)

Follow this structured workflow for evaluation:

## 1. Landing Page & Header Branding
- Open the application at `http://localhost:5173`.
- Verify the header contains **VIGNAN'S Foundation for Science, Technology & Research** branding on the left, centered **CSE PRESENTS** with title **AGENTIC AI HACKATHON**, subtitle **Conference Management Agent · Agent 26 (Group 4)**, and institutional accreditation badges (ABET, NAAC A+, NIRF 70th, NBA).
- Verify the entire "Highlights" section, video player, and competition cards have been removed as instructed.

## 2. Meet Bolt AI Assistant
- Locate the main hero area featuring **Bolt — Autonomous Conference Management Agent** with its 3D animated robotic avatar.
- Note Bolt's introduction: *"Hi, I'm Bolt, your Conference Management Assistant."*
- Click the quick action pill: **"Conference Status"**.
- Observe Bolt executing `conferenceConfigurationTool` against the backend database and summarizing dates and active tracks.

## 3. Submissions & Format Validation
- Navigate to the **Submissions** tab.
- Click the shield icon on Paper #102 to run automated page-limit and format validation.
- Click the eye icon on Paper #102 to execute the local n-gram similarity check against other stored papers.

## 4. Reviewer Matching & Conflict of Interest (COI)
- Switch to the **Reviewer Matching** tab.
- Observe the **"Agent 17 Mock Provider"** badge indicating faculty publication telemetry (18 faculty researchers, 104+ publications).
- Select **Paper #101** or **Paper #104**.
- Notice how faculty members with shared institutions or recent co-authorships (e.g. Dr. Kenji Sato, Dr. Aris Thorne) are automatically flagged with **"CONFLICT OF INTEREST"** in red callouts with detailed reasons.
- Select **Paper #102** and click **"Assign Reviewer"** on the top-ranked unconflicted faculty candidate.

## 5. Peer Reviews & Divergent Review Detection
- Switch to the **Reviews** tab.
- Observe the amber alert banner: **"Divergent Review Detection Alert (1 Case Flagged)"**.
- Notice Paper #105 exhibits significant reviewer polarization (one reviewer scored 9/10, another scored 3/10; score delta = 6 pts).
- Click **"Submit Peer Review"** to simulate submitting a new structured evaluation rubric.

## 6. AI Decision Support & Chair Arbitration
- Navigate to the **AI Decisions** tab.
- Select Paper #105 or Paper #103.
- Click **"Generate AI Synthesis"**.
- Review the AI verdict and reasoning. Notice how the AI recommendation is explicitly marked as non-binding, requiring the General Chair's confirmation.
- Select a verdict and click **"Confirm Decision & Dispatch Letter"**.

## 7. Registration & Sandbox Payment Flow
- Go to the **Registration & Pay** tab.
- View the 6 attendee categories (Student, Research Scholar, Faculty, Industry, Author, Participant).
- Click **"Pay Sandbox Fee"** on any pending attendee.
- Enter test card `4242 4242 4242 4242` and click **"Authorize (Sandbox)"**.
- Observe instant receipt generation with verified transaction ID.

## 8. Conflict-Free Programme Scheduler
- Go to the **Programme Scheduler** tab.
- Click **"Auto-Generate Schedule"**.
- Inspect the generated conflict-free timetable across Main Auditorium, Seminar Hall B, and Colloquium Room C with assigned session chairs.

## 9. Verifiable Certificates & Cryptographic Verification
- Navigate to the **Certificates** tab.
- Copy any certificate ID (e.g. `VIGNAN-CONF2026-CERT-88492`).
- Paste it into the **Public Authenticity Verification** input and click **"Verify Now"**.
- Inspect the verified SHA-256 hash and click the download icon to inspect the PDF certificate.

## 10. Proceedings & ISBN Management
- Open the **Proceedings** tab.
- Verify the ISBN status displays `"ISBN pending"`.
- Enter an ISBN manually and click **"Update ISBN"** to verify that ISBNs are only displayed when authorized organizers supply them.
- Inspect the compiled Table of Contents grouped by track.

## 11. Conference Intelligence Analytics & Integrations
- Switch to the **Analytics** tab to view submissions, acceptance rates, and revenue charts.
- Click the **"Integrations"** button in the header to inspect real-time connection telemetry for Groq, Supabase, Email, Payment Sandbox, and Agent 17.
