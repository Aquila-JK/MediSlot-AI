-- =============================================================================
-- MediSlot AI - Supabase Seed Data
-- =============================================================================

-- 1. Profiles
insert into public.profiles (id, display_name, active_portal, email, phone, mrn, blood_type, address)
values
  ('medislot_workspace_user', 'Eleanor Vance', 'patient', 'eleanor.vance@example.com', '+1 (415) 555-0194', 'MRN-84920', 'O+', '450 Meridian Parkway, Suite 210')
on conflict (id) do update set
  display_name = excluded.display_name,
  active_portal = excluded.active_portal,
  email = excluded.email,
  phone = excluded.phone,
  mrn = excluded.mrn,
  blood_type = excluded.blood_type,
  address = excluded.address;

-- 2. Doctor Directory
insert into public.doctors (id, owner_id, name, title, specialty, location, rating, review_count, fee, avatar_url, bio, experience, education, tags, slots, is_active)
values
  (
    'dr_sarah_jenkins',
    'medislot_workspace_user',
    'Dr. Sarah Jenkins, MD, FACC',
    'Chief of Non-Invasive Cardiology',
    'Cardiology',
    'Pavilion B — Heart & Vascular Center',
    4.9,
    318,
    240,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBv76xK6VXMmn95uXvgSBak7zACatTp_3L8MxdPC_chY1y1Gv2IVQCNHf3wXDPTXn6X1WMjqArPYFSz_BhoY0GyRPrQpdmUfqf8JqB_NNCZD7i_dWdPueI3xfXsfBrlaSWpBf39Z_HHvXIs59DSfbnGPrEKkCHHYeZCRIOdPfCrNOqMWhAAL8rgfcHBE_h7bPZI963elvAh0N4UaqD-3RB2vFQodFf2-3qliuOZalk',
    'Board-certified cardiologist specializing in preventive cardiology, echocardiography, and complex arrhythmia management with 14 years at Meridian Academic Medical Center.',
    '14 yrs experience',
    'Johns Hopkins University School of Medicine • Harvard Cardiology Fellowship',
    array['Preventive Cardiology', 'Echocardiography', 'Telehealth Ready'],
    array['09:30 AM', '11:00 AM', '02:15 PM', '04:00 PM'],
    true
  ),
  (
    'dr_alistair_finch',
    'medislot_workspace_user',
    'Dr. Alistair Finch, MD',
    'Senior Attending Neurologist',
    'Neurology',
    'Midtown Medical Plaza — Suite 410',
    4.8,
    242,
    260,
    'https://lh3.googleusercontent.com/aida/ALJJyrAHkFIvn1L4jyuJQAmGY4Vlig0ExEzI-310cOz_MZj0Fnlr2_MuEgaGBu7s47vY-tlrodshUW6komOfd_Z9FI69GH67VDp0l94DdF-fZ7p35f6HlwAjvxUhlVZOwY4QE001-KXdugJYvxZLWELZG14Ul7c62uvZSFKODniJ5tIA4gboJ68zfzEPlnSq0ZrfdFOPWnSauTnNdTPk-hxt1uWlLMB734w5vU4wW5_Y8gH_',
    'Subspecialty focus in migraine therapeutics, neurovascular prevention, and autonomic disorders using integrated diagnostic telemetry.',
    '16 yrs experience',
    'Columbia University Vagelos College of Physicians and Surgeons',
    array['Migraine & Headache', 'Neurovascular', 'In-Person & Video'],
    array['10:00 AM', '01:30 PM', '03:45 PM'],
    true
  ),
  (
    'dr_elena_rostova',
    'medislot_workspace_user',
    'Dr. Elena Rostova, MD',
    'Director of Precision Dermatology',
    'Dermatology',
    'Harborview Medical Wing — 3rd Floor',
    4.9,
    289,
    195,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDROSyHKUy8O_Hgj1MQCzEyM_-CXTDAoCYDx8TIaEfxKUPzR668zwANEq85X4ErmlW0KCr8y9cSGyH1RB3xiFFY5wY93JDLyD-vQ1DrOxg0V3uZET0Utq-Dwubyj9NR63LPqC4vjDBSP5TP6lPb-G9SmMfR3pPhASkfz8s3qqGvaUiBEcOshhbOZHo2kYxa0ni_dh1OeuA7gNZ3kuB8u39u1f1k76XQZCgCrcHnTKU',
    'Clinical dermatologist combining dermoscopy imaging and personalized inflammatory skin protocols for acute and chronic conditions.',
    '11 yrs experience',
    'Stanford University School of Medicine',
    array['Dermoscopy', 'Eczema & Psoriasis', 'Same-Week Slots'],
    array['09:00 AM', '11:45 AM', '02:30 PM', '04:30 PM'],
    true
  ),
  (
    'dr_arthur_pendelton',
    'medislot_workspace_user',
    'Dr. Arthur Pendelton, MD',
    'Orthopedic & Sports Medicine Lead',
    'Orthopedics',
    'Westside Orthopedic Pavilion',
    4.8,
    194,
    250,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCpKcJAnodXPs_uEumh2zU3Uxf1rNwgs5OMspDozjXgXUWi9CUYa770NdT6jzHuFPA-Qme6yVaOIyqtc9Iy_w8CWBcnEh2E3p5BzJCY_RsP4neA3M5Ro0u_-ZiVqc2yfqw6rFJEq7weBSh8GXMZ0GMPXww0FohXQMG-8nICBuEvjaUa2I7vwSGsp9zfr2RW134LLEU7EKTtsPGE2VQR99IgL4IOuk_yG-cYZ8-qMgA',
    'Minimally invasive joint preservation, arthroscopic sports injury recovery, and regenerative musculoskeletal care.',
    '18 yrs experience',
    'University of Pennsylvania Perelman School of Medicine',
    array['Sports Medicine', 'Joint Preservation', 'MRI Review'],
    array['08:45 AM', '10:30 AM', '03:00 PM'],
    true
  ),
  (
    'dr_michael_oconnell',
    'medislot_workspace_user',
    'Dr. Michael O''Connell, MD',
    'Clinical Electrophysiologist',
    'Cardiology',
    'Pavilion B — Heart & Vascular Center',
    4.9,
    165,
    275,
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB8cTN-0_sFaYS07uUZpvsVxhZRHVKr-8WDcrSY7FOa0poFd9t7UbAjUcJn5zzc-R5i7l_HoKuI4zdIc7M0s49vc_KrLhS8s-zDyyV0j9g_pk2jO-HFvmk8kH-pJkZqrSTq2COZ5qD0TremEuMDFdjACGUTA7Nh3wYJYii5BZVYpD9gCrPRdxxuHF2g-qAQK4Zrb-ds5_DFs6uKMRINeilq1iYpd5quJHcQATSispc',
    'Focuses on atrial fibrillation ablation, Holter telemetry interpretation, and implantable rhythm diagnostics.',
    '15 yrs experience',
    'Mayo Clinic Alix School of Medicine',
    array['Holter ECG', 'Arrhythmia', 'Priority Consults'],
    array['10:15 AM', '01:00 PM', '03:30 PM'],
    true
  )
on conflict (id) do update set
  name = excluded.name,
  title = excluded.title,
  specialty = excluded.specialty,
  location = excluded.location,
  rating = excluded.rating,
  review_count = excluded.review_count,
  fee = excluded.fee,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  experience = excluded.experience,
  education = excluded.education,
  tags = excluded.tags,
  slots = excluded.slots,
  is_active = excluded.is_active;

-- 3. Doctor Profile Settings
insert into public.doctor_profiles (
  uid, full_name, credentials, specialty, npi_number, bio, practice_name, clinic_address,
  consultation_fee, video_fee, accepted_payers, buffer_minutes, max_daily_consults,
  accepting_new_patients, two_factor_enabled, sms_alerts, email_digest, avatar_url
)
values (
  'medislot_workspace_user',
  'Dr. Sarah Jenkins',
  'MD, FACC — Non-Invasive Cardiology',
  'Cardiology',
  '1497820341',
  'Chief of Non-Invasive Cardiology at Pavilion B Heart & Vascular Center. Focused on preventive diagnostics, ambulatory telemetry, and patient-centered care.',
  'Pavilion B — Heart & Vascular Center',
  '450 Meridian Parkway, Pavilion B, Suite 204',
  240,
  195,
  array['Aetna Premier', 'BlueCross PPO', 'UnitedHealthcare', 'Medicare Part B'],
  10,
  18,
  true,
  true,
  true,
  true,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBv76xK6VXMmn95uXvgSBak7zACatTp_3L8MxdPC_chY1y1Gv2IVQCNHf3wXDPTXn6X1WMjqArPYFSz_BhoY0GyRPrQpdmUfqf8JqB_NNCZD7i_dWdPueI3xfXsfBrlaSWpBf39Z_HHvXIs59DSfbnGPrEKkCHHYeZCRIOdPfCrNOqMWhAAL8rgfcHBE_h7bPZI963elvAh0N4UaqD-3RB2vFQodFf2-3qliuOZalk'
)
on conflict (uid) do update set
  full_name = excluded.full_name,
  credentials = excluded.credentials,
  specialty = excluded.specialty,
  npi_number = excluded.npi_number,
  bio = excluded.bio,
  practice_name = excluded.practice_name,
  clinic_address = excluded.clinic_address,
  consultation_fee = excluded.consultation_fee,
  video_fee = excluded.video_fee,
  accepted_payers = excluded.accepted_payers;

-- 4. Patients
insert into public.patients (id, clinician_uid, mrn, name, age, gender, avatar_url, condition, risk_level, blood_pressure, heart_rate, spo2, temp, last_visit, encounters)
values
  (
    'pat_eleanor_vance',
    'medislot_workspace_user',
    'MRN-84920',
    'Eleanor Vance',
    64,
    'Female',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA-70o5wjbUf2WAcfntDyHQ7neIMkp-G3o77yZnY00yCTOZXdx_cIB2sTbw04jlXHAsXGGbaG_KmyXMm-yMcUxXJkyhZRZ6Lfi9WTWXzvsMFvBrN8I8Drwc7nI0Y40YMpsfBPLTf0zNpa-FftLTWevw5c6sX9BOHx23tGdQjDHvSf6frjHX3GgDru2aediGclXVW6K0Q3pYmKsA3BLDvB3f0GQxU_7G4alw9VzJtD4',
    'Paroxysmal Atrial Fibrillation • Mild Hypertension',
    'High Risk',
    '148/92',
    94,
    96,
    '98.4°F',
    'Nov 14, 2026',
    array[
      'Nov 14, 2026 — 48h Holter telemetry detected two brief AFib runs',
      'Oct 29, 2026 — Apixaban 5mg BID adherence verified',
      'Sep 18, 2026 — Echocardiogram EF 58%, no valvular regurgitation'
    ]
  ),
  (
    'pat_julian_thorne',
    'medislot_workspace_user',
    'MRN-73104',
    'Julian Thorne',
    52,
    'Male',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDLIhAnOejfUjAVwVHJlJsz6ZZNpFLpLwhgOX0gI7gddbnl64ZGuJvE42L33OqAZ9j1qWbt6AM77cGQmC-5vQIDpDzfxDsuDKXzxsLycrj_KFvshpm7O1ur6Qqz_kmqHwwCD-6nTn6RDhYPsFguav_-tM0yVoTcTbi7TQPLkYudfTHRJMC6nVsPWVFjXoyt6p8fTA0LmllJ5pbJMKme6-RFoFvdH93VWj5TGUzGgNk',
    'Stage 1 Essential Hypertension • Preventive Lipid Care',
    'Moderate',
    '134/84',
    72,
    98,
    '98.6°F',
    'Nov 10, 2026',
    array[
      'Nov 10, 2026 — Ambulatory BP diary improved after Lisinopril titration',
      'Sep 22, 2026 — Fasting lipid panel LDL 104 mg/dL'
    ]
  ),
  (
    'pat_marcus_sterling',
    'medislot_workspace_user',
    'MRN-61942',
    'Marcus Sterling',
    71,
    'Male',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD_tSMfNlnYdeqUf3CBtu_lbqWRSEF86GTHuTV-o-bRpQuAsqx5ZuM5mLeDU5o3NMmW1zYRyuLQD3Rdlo4_KI_z4HO8JeieePDzNKVa4a6v0nNlVBBvtfaOgmRbJWmhbrcbQkF0eA-yY_8gHxt3yKHt44nyZQaW-4uwbxj3tjVZfxFhD3_48q-k3_f010VhB3_-re4mY--tzG9Q0_3PW0lb3PAP0ojVqLy4_Cl8HPA',
    'Post-Stent Coronary Artery Disease • Routine Follow-Up',
    'Stable',
    '122/76',
    66,
    99,
    '98.2°F',
    'Nov 03, 2026',
    array[
      'Nov 03, 2026 — Asymptomatic, walking 30 mins daily without angina',
      'Aug 15, 2026 — Exercise stress test negative for ischemia'
    ]
  ),
  (
    'pat_clara_higgins',
    'medislot_workspace_user',
    'MRN-55811',
    'Clara Higgins',
    46,
    'Female',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDROSyHKUy8O_Hgj1MQCzEyM_-CXTDAoCYDx8TIaEfxKUPzR668zwANEq85X4ErmlW0KCr8y9cSGyH1RB3xiFFY5wY93JDLyD-vQ1DrOxg0V3uZET0Utq-Dwubyj9NR63LPqC4vjDBSP5TP6lPb-G9SmMfR3pPhASkfz8s3qqGvaUiBEcOshhbOZHo2kYxa0ni_dh1OeuA7gNZ3kuB8u39u1f1k76XQZCgCrcHnTKU',
    'Palpitations & Orthostatic Tachycardia Evaluation',
    'Moderate',
    '116/74',
    88,
    99,
    '98.5°F',
    'Nov 12, 2026',
    array[
      'Nov 12, 2026 — Baseline 12-lead ECG normal sinus rhythm'
    ]
  )
on conflict (id) do update set
  condition = excluded.condition,
  risk_level = excluded.risk_level,
  blood_pressure = excluded.blood_pressure,
  heart_rate = excluded.heart_rate,
  spo2 = excluded.spo2;

-- 5. Initial Appointments
insert into public.appointments (
  id, booking_code, patient_uid, clinician_uid, patient_name, doctor_id, doctor_name,
  doctor_specialty, doctor_avatar, clinic_location, date_label, time_slot, modality,
  status, reason, fee, pre_checked_in
)
values
  (
    'appt_seed_1',
    '#MS-94821',
    'medislot_workspace_user',
    'medislot_workspace_user',
    'Eleanor Vance',
    'dr_sarah_jenkins',
    'Dr. Sarah Jenkins, MD, FACC',
    'Cardiology',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBv76xK6VXMmn95uXvgSBak7zACatTp_3L8MxdPC_chY1y1Gv2IVQCNHf3wXDPTXn6X1WMjqArPYFSz_BhoY0GyRPrQpdmUfqf8JqB_NNCZD7i_dWdPueI3xfXsfBrlaSWpBf39Z_HHvXIs59DSfbnGPrEKkCHHYeZCRIOdPfCrNOqMWhAAL8rgfcHBE_h7bPZI963elvAh0N4UaqD-3RB2vFQodFf2-3qliuOZalk',
    'Pavilion B — Heart & Vascular Center',
    'Tomorrow, Nov 19',
    '09:30 AM',
    'in-person',
    'confirmed',
    'Annual preventive echocardiogram & blood pressure telemetry review',
    240,
    false
  ),
  (
    'appt_seed_2',
    '#MS-94855',
    'medislot_workspace_user',
    'medislot_workspace_user',
    'Julian Thorne',
    'dr_alistair_finch',
    'Dr. Alistair Finch, MD',
    'Neurology',
    'https://lh3.googleusercontent.com/aida/ALJJyrAHkFIvn1L4jyuJQAmGY4Vlig0ExEzI-310cOz_MZj0Fnlr2_MuEgaGBu7s47vY-tlrodshUW6komOfd_Z9FI69GH67VDp0l94DdF-fZ7p35f6HlwAjvxUhlVZOwY4QE001-KXdugJYvxZLWELZG14Ul7c62uvZSFKODniJ5tIA4gboJ68zfzEPlnSq0ZrfdFOPWnSauTnNdTPk-hxt1uWlLMB734w5vU4wW5_Y8gH_',
    'Midtown Medical Plaza — Suite 410',
    'Nov 20, 2026',
    '11:00 AM',
    'video',
    'pending',
    'Migraine frequency evaluation & preventive titration',
    260,
    false
  ),
  (
    'appt_seed_3',
    '#MS-94710',
    'medislot_workspace_user',
    'medislot_workspace_user',
    'Marcus Sterling',
    'dr_sarah_jenkins',
    'Dr. Sarah Jenkins, MD, FACC',
    'Cardiology',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBv76xK6VXMmn95uXvgSBak7zACatTp_3L8MxdPC_chY1y1Gv2IVQCNHf3wXDPTXn6X1WMjqArPYFSz_BhoY0GyRPrQpdmUfqf8JqB_NNCZD7i_dWdPueI3xfXsfBrlaSWpBf39Z_HHvXIs59DSfbnGPrEKkCHHYeZCRIOdPfCrNOqMWhAAL8rgfcHBE_h7bPZI963elvAh0N4UaqD-3RB2vFQodFf2-3qliuOZalk',
    'Pavilion B — Heart & Vascular Center',
    'Nov 14, 2026',
    '02:30 PM',
    'in-person',
    'completed',
    'Post-stent routine follow-up & ECG clearance',
    240,
    true
  )
on conflict (id) do nothing;

-- 6. Schedules
insert into public.schedules (id, clinician_uid, day_of_week, start_time, end_time, modality, status, patient_name, notes)
values
  ('slot_mon_1', 'medislot_workspace_user', 'Mon', '09:00 AM', '11:30 AM', 'in-person', 'booked', 'Eleanor Vance', 'Pavilion B Room 204'),
  ('slot_mon_2', 'medislot_workspace_user', 'Mon', '01:30 PM', '04:00 PM', 'video', 'available', '', 'HD Telehealth Block'),
  ('slot_tue_1', 'medislot_workspace_user', 'Tue', '09:30 AM', '12:00 PM', 'in-person', 'booked', 'Julian Thorne', 'Echocardiogram Review'),
  ('slot_tue_2', 'medislot_workspace_user', 'Tue', '02:00 PM', '04:30 PM', 'hybrid', 'available', '', 'Open Consults'),
  ('slot_wed_1', 'medislot_workspace_user', 'Wed', '10:00 AM', '12:30 PM', 'video', 'booked', 'Clara Higgins', 'Telehealth Triage'),
  ('slot_wed_2', 'medislot_workspace_user', 'Wed', '01:00 PM', '02:00 PM', 'in-person', 'blocked', '', 'Cardiology Board Rounds'),
  ('slot_thu_1', 'medislot_workspace_user', 'Thu', '09:00 AM', '12:00 PM', 'in-person', 'available', '', 'New Patient Intakes'),
  ('slot_fri_1', 'medislot_workspace_user', 'Fri', '09:30 AM', '01:00 PM', 'hybrid', 'booked', 'Marcus Sterling', 'Follow-up Rounds'),
  ('slot_sat_1', 'medislot_workspace_user', 'Sat', '10:00 AM', '12:30 PM', 'video', 'available', '', 'Priority Telehealth')
on conflict (id) do nothing;

-- 7. Notifications
insert into public.notifications (id, recipient_uid, category, title, description, patient_name, is_read, action_status)
values
  ('notif_holter_vance', 'medislot_workspace_user', 'lab', 'Abnormal 48h Holter Telemetry — Eleanor Vance', 'Two nocturnal atrial fibrillation episodes (HR peak 138 bpm) flagged for immediate cardiologist review.', 'Eleanor Vance', false, 'pending'),
  ('notif_req_thorne', 'medislot_workspace_user', 'request', 'Priority Reschedule Request — Julian Thorne', 'Requested shift from Thursday 03:00 PM to Tomorrow 11:00 AM (HD Video Visit) for BP diary review.', 'Julian Thorne', false, 'pending'),
  ('notif_cancel_gap', 'medislot_workspace_user', 'cancellation', 'Afternoon Slot Opened (02:15 PM Today)', 'Waitlist candidate Clara Higgins matches 98% specialty urgency for this 30-minute window.', 'Clara Higgins', false, 'pending'),
  ('notif_reminder_rounds', 'medislot_workspace_user', 'reminder', 'Midday Cardiology Tumor & Echo Board at 12:30 PM', 'Pavilion B Conference Suite 302 • 4 diagnostic studies queued for sign-off.', 'Cardiology Pod B', true, 'reviewed')
on conflict (id) do nothing;

-- 8. Prescriptions
insert into public.prescriptions (id, patient_uid, medication, dosage, doctor_name, refills_left, refill_status, last_filled)
values
  ('rx_atorvastatin', 'medislot_workspace_user', 'Atorvastatin Calcium', '20 mg • Once daily at bedtime', 'Dr. Sarah Jenkins, MD', 3, 'active', 'Oct 28, 2026'),
  ('rx_lisinopril', 'medislot_workspace_user', 'Lisinopril', '10 mg • Once daily every morning', 'Dr. Sarah Jenkins, MD', 2, 'active', 'Nov 02, 2026')
on conflict (id) do nothing;
