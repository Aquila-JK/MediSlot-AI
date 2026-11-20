-- =============================================================================
-- MediSlot AI - Supabase Database Schema
-- Multi-Tenant Clinical Practice & Patient Portal with Real-Time Scheduling
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES / USERS
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id text primary key,
  display_name text not null,
  photo_url text,
  active_portal text not null default 'patient' check (active_portal in ('patient', 'clinical')),
  email text,
  phone text,
  mrn text,
  blood_type text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 2. DOCTOR DIRECTORY
-- -----------------------------------------------------------------------------
create table if not exists public.doctors (
  id text primary key,
  owner_id text not null,
  name text not null,
  title text,
  specialty text not null,
  location text not null,
  rating numeric(3, 2) default 5.00 not null,
  review_count integer default 0 not null,
  fee numeric(10, 2) default 0.00 not null,
  avatar_url text,
  bio text,
  experience text,
  education text,
  tags text[] default '{}'::text[] not null,
  slots text[] default '{}'::text[] not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 3. DOCTOR PROFILE & CLINICAL SETTINGS
-- -----------------------------------------------------------------------------
create table if not exists public.doctor_profiles (
  uid text primary key,
  full_name text not null,
  credentials text,
  specialty text not null default 'Cardiology',
  npi_number text,
  bio text,
  practice_name text,
  clinic_address text,
  consultation_fee numeric(10, 2) default 240.00 not null,
  video_fee numeric(10, 2) default 195.00 not null,
  accepted_payers text[] default '{}'::text[] not null,
  buffer_minutes integer default 10 not null,
  max_daily_consults integer default 18 not null,
  accepting_new_patients boolean default true not null,
  two_factor_enabled boolean default true not null,
  sms_alerts boolean default true not null,
  email_digest boolean default true not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 4. PATIENT RECORDS (EHR)
-- -----------------------------------------------------------------------------
create table if not exists public.patients (
  id text primary key,
  clinician_uid text not null,
  mrn text not null,
  name text not null,
  age integer default 0 not null,
  gender text default 'Unspecified',
  avatar_url text,
  condition text,
  risk_level text not null default 'Stable' check (risk_level in ('High Risk', 'Moderate', 'Stable')),
  blood_pressure text default '120/80',
  heart_rate integer default 72,
  spo2 integer default 98,
  temp text default '98.6°F',
  last_visit text,
  encounters text[] default '{}'::text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 5. APPOINTMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id text primary key,
  booking_code text not null,
  patient_uid text not null,
  clinician_uid text not null,
  patient_name text not null,
  doctor_id text not null,
  doctor_name text not null,
  doctor_specialty text,
  doctor_avatar text,
  clinic_location text,
  date_label text not null,
  time_slot text not null,
  modality text not null check (modality in ('in-person', 'video')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  reason text,
  fee numeric(10, 2) default 0.00 not null,
  pre_checked_in boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 6. SCHEDULE SLOTS
-- -----------------------------------------------------------------------------
create table if not exists public.schedules (
  id text primary key,
  clinician_uid text not null,
  day_of_week text not null check (day_of_week in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')),
  start_time text not null,
  end_time text not null,
  modality text not null check (modality in ('in-person', 'video', 'hybrid')),
  status text not null default 'available' check (status in ('available', 'booked', 'blocked')),
  patient_name text default '',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 7. NOTIFICATIONS & CLINICAL TRIAGE ALERTS
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  recipient_uid text not null,
  category text not null check (category in ('request', 'cancellation', 'reminder', 'lab')),
  title text not null,
  description text,
  patient_name text,
  related_appointment_id text,
  is_read boolean default false not null,
  action_status text not null default 'pending' check (action_status in ('pending', 'accepted', 'declined', 'reviewed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 8. PRESCRIPTIONS
-- -----------------------------------------------------------------------------
create table if not exists public.prescriptions (
  id text primary key,
  patient_uid text not null,
  medication text not null,
  dosage text not null,
  doctor_name text,
  refills_left integer default 0 not null,
  refill_status text not null default 'active' check (refill_status in ('active', 'requested', 'approved')),
  last_filled text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 9. AI SESSIONS & TELEMETRY
-- -----------------------------------------------------------------------------
create table if not exists public.ai_sessions (
  id text primary key,
  owner_uid text not null,
  portal text not null check (portal in ('patient', 'clinical')),
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 10. AI MESSAGES
-- -----------------------------------------------------------------------------
create table if not exists public.ai_messages (
  id text primary key,
  session_id text not null references public.ai_sessions(id) on delete cascade,
  owner_uid text not null,
  sender text not null check (sender in ('user', 'assistant')),
  text text not null,
  recommended_doctor_ids text[] default '{}'::text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- AUTOMATIC UPDATED_AT TRIGGER
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Apply triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();

drop trigger if exists set_doctors_updated_at on public.doctors;
create trigger set_doctors_updated_at before update on public.doctors for each row execute function public.handle_updated_at();

drop trigger if exists set_doctor_profiles_updated_at on public.doctor_profiles;
create trigger set_doctor_profiles_updated_at before update on public.doctor_profiles for each row execute function public.handle_updated_at();

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at before update on public.patients for each row execute function public.handle_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at before update on public.appointments for each row execute function public.handle_updated_at();

drop trigger if exists set_schedules_updated_at on public.schedules;
create trigger set_schedules_updated_at before update on public.schedules for each row execute function public.handle_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at before update on public.notifications for each row execute function public.handle_updated_at();

drop trigger if exists set_prescriptions_updated_at on public.prescriptions;
create trigger set_prescriptions_updated_at before update on public.prescriptions for each row execute function public.handle_updated_at();

drop trigger if exists set_ai_sessions_updated_at on public.ai_sessions;
create trigger set_ai_sessions_updated_at before update on public.ai_sessions for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- -----------------------------------------------------------------------------
create index if not exists idx_doctors_specialty on public.doctors(specialty);
create index if not exists idx_doctors_is_active on public.doctors(is_active);
create index if not exists idx_patients_clinician on public.patients(clinician_uid);
create index if not exists idx_appointments_patient on public.appointments(patient_uid);
create index if not exists idx_appointments_clinician on public.appointments(clinician_uid);
create index if not exists idx_schedules_clinician on public.schedules(clinician_uid);
create index if not exists idx_notifications_recipient on public.notifications(recipient_uid);
create index if not exists idx_prescriptions_patient on public.prescriptions(patient_uid);
create index if not exists idx_ai_messages_session on public.ai_messages(session_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.schedules enable row level security;
alter table public.notifications enable row level security;
alter table public.prescriptions enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.ai_messages enable row level security;

-- Drop existing policies if any to ensure clean, repeatable execution
drop policy if exists "Public doctors read" on public.doctors;
create policy "Public doctors read" on public.doctors for select using (true);

drop policy if exists "Allow all operations for service role on doctors" on public.doctors;
create policy "Allow all operations for service role on doctors" on public.doctors for all using (true);

drop policy if exists "Allow all operations on profiles" on public.profiles;
create policy "Allow all operations on profiles" on public.profiles for all using (true);

drop policy if exists "Allow all operations on doctor_profiles" on public.doctor_profiles;
create policy "Allow all operations on doctor_profiles" on public.doctor_profiles for all using (true);

drop policy if exists "Allow all operations on patients" on public.patients;
create policy "Allow all operations on patients" on public.patients for all using (true);

drop policy if exists "Allow all operations on appointments" on public.appointments;
create policy "Allow all operations on appointments" on public.appointments for all using (true);

drop policy if exists "Allow all operations on schedules" on public.schedules;
create policy "Allow all operations on schedules" on public.schedules for all using (true);

drop policy if exists "Allow all operations on notifications" on public.notifications;
create policy "Allow all operations on notifications" on public.notifications for all using (true);

drop policy if exists "Allow all operations on prescriptions" on public.prescriptions;
create policy "Allow all operations on prescriptions" on public.prescriptions for all using (true);

drop policy if exists "Allow all operations on ai_sessions" on public.ai_sessions;
create policy "Allow all operations on ai_sessions" on public.ai_sessions for all using (true);

drop policy if exists "Allow all operations on ai_messages" on public.ai_messages;
create policy "Allow all operations on ai_messages" on public.ai_messages for all using (true);

-- Enable real-time for key clinical event tables safely and idempotently
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments') then
      alter publication supabase_realtime add table public.appointments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedules') then
      alter publication supabase_realtime add table public.schedules;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'prescriptions') then
      alter publication supabase_realtime add table public.prescriptions;
    end if;
  end if;
end $$;
