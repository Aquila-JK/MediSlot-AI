# MediSlot AI — Supabase Integration & Configuration Guide

MediSlot AI utilizes Supabase (PostgreSQL, Auth, and Realtime) for enterprise clinical scheduling, EHR patient records, prescription tracking, and AI triage telemetry.

---

## 1. Quick Setup & Dashboard Steps

1. **Create a Supabase Project**:
   - Go to [database.new](https://database.new) or [supabase.com](https://supabase.com).
   - Create a new project named `medislot-ai`.
   - Copy your **Project URL** and **API Keys** (`anon public` and `service_role secret`) from **Project Settings > API**.

2. **Execute Database Schema & Seed Data**:
   - Open your project's **SQL Editor** in the Supabase Dashboard.
   - Run `supabase/schema.sql` to create all tables (`doctors`, `patients`, `appointments`, `schedules`, `notifications`, `prescriptions`, `ai_sessions`, `ai_messages`, etc.), indexes, triggers, and Row Level Security policies.
   - Run `supabase/seed.sql` to populate sample specialists, clinical schedules, telemetry alerts, and test patient EHR records.

---

## 2. Environment Variables (.env)

Add the following credentials to your `.env` file in the root directory:

```env
# Backend (server.ts) Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Frontend (Vite) Supabase Configuration
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

> **Note**: If Supabase credentials are left empty or placeholder, the MediSlot backend and frontend automatically operate in **Local Workspace Mode** with offline fallback so development is never blocked.

---

## 3. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 MediSlot AI Frontend (Vite/React)           │
│   Patient Portal  │  Clinical Suite  │  Dual-Portal Switch  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│ Express Backend (server.ts)  │  │ Direct Supabase Realtime  │
│ - /api/doctors               │  │ - Appointments sync       │
│ - /api/appointments          │  │ - Telemetry notifications │
│ - /api/patients              │  │ - Schedule updates        │
│ - /api/schedules             │  └─────────────┬─────────────┘
│ - /api/notifications         │                │
│ - /api/prescriptions         │                │
│ - /api/ai/* (Gemini + RAG)   │                │
└──────────────┬───────────────┘                │
               │                                │
               ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase Cloud Database (PostgreSQL)        │
│ doctors | doctor_profiles | patients | appointments         │
│ schedules | notifications | prescriptions | ai_sessions     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Backend Endpoints Available

- `GET /api/health` — System status + Supabase connectivity test
- `GET /api/supabase/status` — Real-time Supabase health check
- `GET /api/doctors` — List all active specialists
- `GET /api/doctors/:id` — Specialist details
- `GET /api/patients?clinicianUid=...` — Clinical EHR patient panel
- `POST /api/patients` — Register new clinical patient
- `GET /api/appointments?patientUid=...&clinicianUid=...` — Appointment roster
- `POST /api/appointments` — Book new appointment & trigger alert
- `PATCH /api/appointments/:id/status` — Confirm, cancel, or complete appointment
- `PATCH /api/appointments/:id/reschedule` — Reschedule visit slot & modality
- `PATCH /api/appointments/:id/pre-checkin` — Mark patient pre-checked in
- `GET /api/schedules?clinicianUid=...` — Clinician schedule blocks
- `POST /api/schedules` — Add clinic availability slot
- `PATCH /api/schedules/:id` — Update slot status
- `DELETE /api/schedules/:id` — Remove schedule block
- `GET /api/notifications?recipientUid=...` — Real-time triage notifications
- `PATCH /api/notifications/:id` — Mark notification read / action status
- `POST /api/notifications/mark-all-read` — Batch mark notifications read
- `GET /api/prescriptions?patientUid=...` — Patient active prescriptions
- `POST /api/prescriptions/:id/refill` — Submit refill authorization request
- `GET /api/doctor-profile/:uid` — Clinician preferences & practice settings
- `PUT /api/doctor-profile/:uid` — Update clinician profile & consultation fees
