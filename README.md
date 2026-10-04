# HealthLink

A small fictional patient portal built with Angular and a TypeScript Express API. The backend uses Prisma with a local SQLite database, seeded demo data, and a simple demo patient login.

## Requirements

- Node.js 20.11.1 or newer (Angular 19 requirement)
- npm

## Run locally

Open two terminals from the project root.

In the first terminal, start the API:

```powershell
cd backend
npm install
npm run db:setup
npm run dev
```

`db:setup` creates `backend/prisma/healthlink.db` and seeds Faker-generated doctor names, two doctors in each specialty, weekly availability, a Jordan Davis demo account, and consultations. Doctor IDs are integers starting at 1. Run the seed again to refresh the demo records without duplicating them. The API listens at `http://localhost:3000`.

Demo login: patient ID `jordan`, password `123`. The password is stored as a salted hash; bearer sessions are kept in memory and expire when the API restarts.

In the second terminal, start Angular:

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`. Angular's development server proxies `/api` requests to Express at port 3000. The backend also enables CORS for direct API access.

## API

- `GET /api/doctors` returns the seeded doctor list.
- `GET /api/consultations` returns seeded consultations and bookings created during this run.
- `POST /api/consultations` creates a scheduled consultation. Send JSON with `doctorId`, `consultationType` (`Chat` or `Video`), `preferredTime` (ISO date-time), and `reason`. The API rejects times outside the selected doctor's recurring weekday and working-hour schedule.
- `PATCH /api/consultations/:id/cancel` changes a Scheduled consultation to Cancelled. Completed consultations cannot be cancelled.

The backend separates Prisma models, Express routes, HTTP controllers, and database services. Controllers validate requests and format responses; services own database reads and writes. SQLite keeps bookings after an API restart; no separate database server is needed. Consultation statuses are `Scheduled`, `Completed`, or `Cancelled`.

With the backend running and seeded, run the API integration tests from `backend/` with `npm test`. They cover login, protected routes, seeded doctors and statuses, availability enforcement, booking persistence, and cancellation; test-created bookings are removed afterward.

## Build

```powershell
cd backend
npm run build

cd ../frontend
npm run build
```