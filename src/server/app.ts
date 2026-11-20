import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  checkSupabaseHealth,
  dbAddScheduleSlot,
  dbCreateAppointment,
  dbCreatePatient,
  dbDeleteScheduleSlot,
  dbGetAppointments,
  dbGetDoctorById,
  dbGetDoctorProfile,
  dbGetDoctors,
  dbGetNotifications,
  dbGetPatients,
  dbGetPrescriptions,
  dbGetSchedules,
  dbMarkAllNotificationsRead,
  dbRequestPrescriptionRefill,
  dbRescheduleAppointment,
  dbToggleAppointmentPreCheckIn,
  dbUpdateAppointmentStatus,
  dbUpdateNotification,
  dbUpdateScheduleSlotStatus,
  dbUpsertDoctorProfile,
} from './supabase.ts';

dotenv.config();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const app = express();
app.use(express.json({ limit: '2mb' }));

// ===========================================================================
// Health & Supabase Diagnostic Endpoints
// ===========================================================================

app.get('/api/health', async (_req, res) => {
  const supabaseHealth = await checkSupabaseHealth();
  res.json({
    status: 'ok',
    service: 'medislot-ai',
    timestamp: new Date().toISOString(),
    supabase: supabaseHealth,
  });
});

app.get('/api/supabase/status', async (_req, res) => {
  const health = await checkSupabaseHealth();
  res.json({
    ...health,
    timestamp: new Date().toISOString(),
  });
});

// ===========================================================================
// Doctor & Practice Profile API (Supabase Backend)
// ===========================================================================

app.get('/api/doctors', async (_req, res) => {
  try {
    const doctors = await dbGetDoctors();
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctors.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await dbGetDoctorById(req.params.id);
    if (!doctor) {
      res.status(404).json({ success: false, error: 'Doctor not found.' });
      return;
    }
    res.json({ success: true, data: doctor });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.get('/api/doctor-profile/:uid', async (req, res) => {
  try {
    const profile = await dbGetDoctorProfile(req.params.uid);
    res.json({ success: true, data: profile });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to get doctor profile.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.put('/api/doctor-profile/:uid', async (req, res) => {
  try {
    const updated = await dbUpsertDoctorProfile(req.params.uid, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update doctor profile.';
    res.status(500).json({ success: false, error: msg });
  }
});

// ===========================================================================
// Patient EHR Panel API (Supabase Backend)
// ===========================================================================

app.get('/api/patients', async (req, res) => {
  try {
    const clinicianUid = String(req.query.clinicianUid || 'medislot_workspace_user');
    const patients = await dbGetPatients(clinicianUid);
    res.json({ success: true, count: patients.length, data: patients });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch patients.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const { clinicianUid = 'medislot_workspace_user', name, age, gender, condition, riskLevel, bloodPressure, heartRate, spo2 } = req.body || {};
    if (!name || typeof age !== 'number') {
      res.status(400).json({ success: false, error: 'Patient name and numeric age are required.' });
      return;
    }
    const record = await dbCreatePatient(clinicianUid, {
      name,
      age,
      gender,
      condition,
      riskLevel,
      bloodPressure,
      heartRate,
      spo2,
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to register patient.';
    res.status(500).json({ success: false, error: msg });
  }
});

// ===========================================================================
// Appointment Management API (Supabase Backend)
// ===========================================================================

app.get('/api/appointments', async (req, res) => {
  try {
    const patientUid = req.query.patientUid ? String(req.query.patientUid) : undefined;
    const clinicianUid = req.query.clinicianUid ? String(req.query.clinicianUid) : undefined;
    const appointments = await dbGetAppointments({ patientUid, clinicianUid });
    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch appointments.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { patientUid, patientName, doctor, dateLabel, timeSlot, modality, reason } = req.body || {};
    if (!patientUid || !doctor || !dateLabel || !timeSlot || !modality) {
      res.status(400).json({ success: false, error: 'Missing required appointment parameters.' });
      return;
    }
    const created = await dbCreateAppointment({
      patientUid,
      patientName,
      doctor,
      dateLabel,
      timeSlot,
      modality,
      reason,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create appointment.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid appointment status.' });
      return;
    }
    await dbUpdateAppointmentStatus(req.params.id, status);
    res.json({ success: true, message: `Appointment status updated to ${status}.` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update appointment status.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.patch('/api/appointments/:id/reschedule', async (req, res) => {
  try {
    const { dateLabel, timeSlot, modality } = req.body || {};
    if (!dateLabel || !timeSlot || !modality) {
      res.status(400).json({ success: false, error: 'dateLabel, timeSlot, and modality are required.' });
      return;
    }
    await dbRescheduleAppointment(req.params.id, dateLabel, timeSlot, modality);
    res.json({ success: true, message: 'Appointment rescheduled successfully.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to reschedule appointment.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.patch('/api/appointments/:id/pre-checkin', async (req, res) => {
  try {
    await dbToggleAppointmentPreCheckIn(req.params.id);
    res.json({ success: true, message: 'Appointment marked as pre-checked in.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update check-in status.';
    res.status(500).json({ success: false, error: msg });
  }
});

// ===========================================================================
// Schedule Management API (Supabase Backend)
// ===========================================================================

app.get('/api/schedules', async (req, res) => {
  try {
    const clinicianUid = String(req.query.clinicianUid || 'medislot_workspace_user');
    const slots = await dbGetSchedules(clinicianUid);
    res.json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch schedule slots.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const { clinicianUid = 'medislot_workspace_user', dayOfWeek, startTime, endTime, modality, notes } = req.body || {};
    if (!dayOfWeek || !startTime || !endTime || !modality) {
      res.status(400).json({ success: false, error: 'dayOfWeek, startTime, endTime, and modality are required.' });
      return;
    }
    const slot = await dbAddScheduleSlot(clinicianUid, { dayOfWeek, startTime, endTime, modality, notes });
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to add schedule slot.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.patch('/api/schedules/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['available', 'booked', 'blocked'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid slot status.' });
      return;
    }
    await dbUpdateScheduleSlotStatus(req.params.id, status);
    res.json({ success: true, message: `Schedule slot updated to ${status}.` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update schedule slot.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await dbDeleteScheduleSlot(req.params.id);
    res.json({ success: true, message: 'Schedule slot removed.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete schedule slot.';
    res.status(500).json({ success: false, error: msg });
  }
});

// ===========================================================================
// Real-time Notifications & Triage Alerts API (Supabase Backend)
// ===========================================================================

app.get('/api/notifications', async (req, res) => {
  try {
    const recipientUid = String(req.query.recipientUid || 'medislot_workspace_user');
    const notifs = await dbGetNotifications(recipientUid);
    res.json({ success: true, count: notifs.length, data: notifs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch notifications.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const { actionStatus = 'reviewed', isRead = true } = req.body || {};
    await dbUpdateNotification(req.params.id, actionStatus, isRead);
    res.json({ success: true, message: 'Notification updated.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update notification.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
  try {
    const recipientUid = String(req.body?.recipientUid || 'medislot_workspace_user');
    await dbMarkAllNotificationsRead(recipientUid);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to mark notifications read.';
    res.status(500).json({ success: false, error: msg });
  }
});

// ===========================================================================
// Prescriptions API (Supabase Backend)
// ===========================================================================

app.get('/api/prescriptions', async (req, res) => {
  try {
    const patientUid = String(req.query.patientUid || 'medislot_workspace_user');
    const prescriptions = await dbGetPrescriptions(patientUid);
    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch prescriptions.';
    res.status(500).json({ success: false, error: msg });
  }
});

app.post('/api/prescriptions/:id/refill', async (req, res) => {
  try {
    await dbRequestPrescriptionRefill(req.params.id);
    res.json({ success: true, message: 'Prescription refill requested.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to request refill.';
    res.status(500).json({ success: false, error: msg });
  }
});

// ===========================================================================
// AI Clinical Intelligence Endpoints (Powered by Gemini + Supabase Data)
// ===========================================================================

app.post('/api/ai/patient-concierge', async (req, res) => {
  try {
    const { message, history = [], userName = 'Patient' } = req.body ?? {};
    let doctors = req.body?.doctors;

    // If doctors list was not supplied by client, fetch active specialists from Supabase!
    if (!Array.isArray(doctors) || doctors.length === 0) {
      doctors = await dbGetDoctors();
    }

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const matchingDocs = Array.isArray(doctors) && doctors.length > 0 ? doctors.slice(0, 2) : [];
      res.json({
        reply: `Thank you for sharing your symptoms. Based on your description, we recommend a routine diagnostic evaluation with ${matchingDocs[0]?.name || 'a MediSlot cardiologist'}. Please monitor your vitals and seek immediate emergency care (call 911) if you experience severe chest tightness, acute shortness of breath, or emergency symptoms.`,
        urgencyLevel: 'routine',
        recommendedSpecialty: matchingDocs[0]?.specialty || 'Cardiology',
        recommendedDoctorIds: matchingDocs.map((d: { id: string }) => d.id),
        checklist: [
          'Record daily symptom onset and severity log',
          'Bring current prescription medications',
          'Have your insurance ID card ready for check-in',
        ],
      });
      return;
    }

    const ai = getGeminiClient();
    const doctorContext = Array.isArray(doctors)
      ? doctors
          .slice(0, 10)
          .map(
            (d: { id?: string; name?: string; specialty?: string; location?: string; fee?: number; slots?: string[] }) =>
              `- ID: ${d.id ?? ''} | ${d.name ?? ''} (${d.specialty ?? ''}) at ${d.location ?? ''}, Fee $${d.fee ?? 0}, Open Slots: ${(d.slots ?? []).join(', ')}`
          )
          .join('\n')
      : '';

    const historyText = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: { sender?: string; text?: string }) => `${h.sender === 'user' ? 'Patient' : 'Concierge'}: ${h.text ?? ''}`)
          .join('\n')
      : '';

    const prompt = `
Patient Name: ${String(userName).slice(0, 80)}
Available MediSlot Specialists (from Supabase directory):
${doctorContext || 'No specialist list provided.'}

Recent Conversation:
${historyText}

Current Patient Message:
${message.trim().slice(0, 1500)}
`.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are MediSlot AI Clinical Concierge, a calm, authoritative medical triage and appointment routing assistant. Analyze symptoms or scheduling requests, provide concise clinical guidance (without diagnosing definitively), recommend 1 to 2 matching specialist IDs strictly from the provided Available MediSlot Specialists list when appropriate, suggest a short preparation checklist, and remind patients to call 911 for severe chest pain, breathing difficulty, or emergencies. Keep the reply under 160 words.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Concise, helpful clinical triage and scheduling guidance.',
            },
            urgencyLevel: {
              type: Type.STRING,
              description: 'One of: routine, priority, urgent_care',
            },
            recommendedSpecialty: {
              type: Type.STRING,
              description: 'Most relevant medical specialty name.',
            },
            recommendedDoctorIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 2 matching doctor IDs strictly chosen from the Available MediSlot Specialists list.',
            },
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 brief visit preparation items.',
            },
          },
          required: ['reply', 'urgencyLevel', 'recommendedSpecialty', 'recommendedDoctorIds', 'checklist'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to reach Gemini AI service.';
    console.error('Patient Concierge AI error:', msg);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/ai/doctor-assistant', async (req, res) => {
  try {
    const { message, history = [], clinicianName = 'Dr. Sarah Jenkins' } = req.body ?? {};
    let { appointmentsSummary = '', patientsSummary = '' } = req.body ?? {};

    // If context was not provided, automatically pull today's appointments & patients from Supabase!
    if (!appointmentsSummary) {
      const appts = await dbGetAppointments({ clinicianUid: 'medislot_workspace_user' });
      appointmentsSummary = appts
        .slice(0, 5)
        .map((a) => `${a.timeSlot}: ${a.patientName} (${a.modality}) - ${a.reason} [${a.status}]`)
        .join('\n');
    }

    if (!patientsSummary) {
      const pats = await dbGetPatients('medislot_workspace_user');
      patientsSummary = pats
        .slice(0, 5)
        .map((p) => `${p.name} (${p.mrn}), ${p.age}yo: ${p.condition} [${p.riskLevel}, BP ${p.bloodPressure}, HR ${p.heartRate}]`)
        .join('\n');
    }

    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Prompt message is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json({
        reply: `Good day, ${clinicianName}. Schedule overview indicates 3 scheduled consultations today. High priority item: Eleanor Vance (Holter telemetry Afib review at 09:30 AM). All patient diagnostic metrics are synchronized in the EHR panel.`,
        clinicalHighlight: 'Review Eleanor Vance 48h telemetry Afib episodes prior to 09:30 AM consult.',
        suggestedActions: [
          'Open Eleanor Vance EHR',
          'Review Telemetry Tracing',
          'Confirm 11:00 AM Slot',
        ],
      });
      return;
    }

    const ai = getGeminiClient();
    const historyText = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: { sender?: string; text?: string }) => `${h.sender === 'user' ? 'Clinician' : 'Copilot'}: ${h.text ?? ''}`)
          .join('\n')
      : '';

    const prompt = `
Clinician: ${String(clinicianName).slice(0, 80)}
Today's Schedule Context (from Supabase):
${String(appointmentsSummary).slice(0, 2000)}

Active Patient Panel Context (from Supabase EHR):
${String(patientsSummary).slice(0, 2000)}

Recent Copilot Conversation:
${historyText}

Clinician Query:
${message.trim().slice(0, 1500)}
`.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are MediSlot Doctor AI Copilot, an enterprise clinical workflow & EHR briefing assistant for physicians. Provide crisp, high-signal briefings referencing the clinician schedule, patient vitals/risks, waitlist optimization, or draft clinical follow-up plans. Keep reply concise (under 180 words) and structured.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Concise clinical briefing or workflow answer.',
            },
            clinicalHighlight: {
              type: Type.STRING,
              description: 'Single-sentence priority clinical takeaway or alert.',
            },
            suggestedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 3 actionable next-step button labels.',
            },
          },
          required: ['reply', 'clinicalHighlight', 'suggestedActions'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to reach Gemini AI service.';
    console.error('Doctor Copilot AI error:', msg);
    res.status(500).json({ error: msg });
  }
});

export default app;
