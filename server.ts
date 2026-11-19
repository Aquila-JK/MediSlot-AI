import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'medislot-ai' });
  });

  app.post('/api/ai/patient-concierge', async (req, res) => {
    try {
      const { message, history = [], doctors = [], userName = 'Patient' } = req.body ?? {};
      if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Message is required.' });
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
Available MediSlot Specialists:
${doctorContext || 'No specialist list provided.'}

Recent Conversation:
${historyText}

Current Patient Message:
${message.trim().slice(0, 1500)}
`.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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
      const { message, history = [], appointmentsSummary = '', patientsSummary = '', clinicianName = 'Dr. Sarah Jenkins' } = req.body ?? {};
      if (typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Prompt message is required.' });
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
Today's Schedule Context:
${String(appointmentsSummary).slice(0, 2000)}

Active Patient Panel Context:
${String(patientsSummary).slice(0, 2000)}

Recent Copilot Conversation:
${historyText}

Clinician Query:
${message.trim().slice(0, 1500)}
`.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
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

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediSlot AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
