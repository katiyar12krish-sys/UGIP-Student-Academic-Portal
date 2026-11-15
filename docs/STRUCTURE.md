# Project structure
```
gpt-portal/
├─ src/                    FRONTEND (React)
│  ├─ components/
│  │  ├─ student/  faculty/  admin/      role dashboards
│  │  ├─ common/                         shared modules (doubts, tests, attendance, materials...)
│  │  ├─ placement/  analytics/  auth/  landing/  layout/
│  ├─ context/CollegeContext.tsx         app state
│  ├─ data/                              mock data (replace with API calls step by step)
│  ├─ types.ts   utils/
├─ server/                 BACKEND (Express)
│  ├─ index.ts                           app start, AI routes, Vite/static serving
│  ├─ routes/students.ts                 REST API: students CRUD, status, class CSV export
│  └─ db/
│     ├─ connection.ts                   opens data/portal.db
│     ├─ schema.sql                      tables (SQLite)
│     ├─ studentsRepo.ts                 save/validate/read students
│     ├─ crypto.ts                       AES-256-GCM for Aadhaar
│     ├─ seed.ts + seed-data.json        first-run students
├─ data/portal.db          DATABASE FILE (created on first run, inside the project)
├─ database/mysql/         full MySQL schema + seed (for production server)
└─ docs/
```
## Run
`npm install` then `npm run dev`  -> DB file is created and 17 students seeded automatically.
## API (no login yet - do not expose publicly)
GET /api/students?branch=CSE&year=3&q=  |  GET/PUT/DELETE /api/students/:id  |  POST /api/students
POST /api/students/:id/status  |  GET /api/export/class.csv?branch=CSE&year=3
## Backup
Copy `data/portal.db`, `data/uploads/` (study material files) and `data/.secret` together (the secret decrypts Aadhaar numbers).
