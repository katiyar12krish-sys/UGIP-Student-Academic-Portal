<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9fa2d739-a5dc-409e-a433-abc466efd903

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Login & roles

Login is verified by the server. First run, credentials and permissions: see [docs/AUTH.md](docs/AUTH.md).

Marks, attendance and the faculty-subject rule: see [docs/ACADEMIC.md](docs/ACADEMIC.md).

Authenticator-app login, privacy consent (DPDP), photo upload and SMS OTP status: see [docs/STEP3.md](docs/STEP3.md).

Assignments / online tests (questions + answers, subject-wise permission) and their deadline reminders: see [docs/STEP7.md](docs/STEP7.md).

Class dispatch and student submissions: see [docs/STEP10.md](docs/STEP10.md).

Placement drives, applications and job listings: see [docs/STEP11.md](docs/STEP11.md).

Logins, passwords and parent login (privacy): see [docs/STEP12.md](docs/STEP12.md).

Messages (chat with text + voice for parents, students, teachers, admin): see [docs/STEP13.md](docs/STEP13.md).

Parent read-only extras, start-up warnings, backup: [docs/STEP14.md](docs/STEP14.md). Going live: [docs/DEPLOY.md](docs/DEPLOY.md).

**Step 18 – real data, sample data, edit/delete everywhere, automatic class promotion, years of history: see [docs/STEP18.md](docs/STEP18.md).**

Question papers (2 sample papers per subject + answer keys, old board papers, upload / download): see [docs/QUESTION_PAPERS.md](docs/QUESTION_PAPERS.md).
