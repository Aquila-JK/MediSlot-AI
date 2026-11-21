import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'knowledge-base.json');

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  embedding: number[];
  createdAt: string;
}

export interface IngestedDocument {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  chunkCount: number;
  uploadedAt: string;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface RagResponse {
  answer: string;
  sources: {
    type: 'document' | 'web';
    title: string;
    url?: string;
    excerpt?: string;
    similarity?: number;
  }[];
  urgencyLevel?: 'routine' | 'priority' | 'urgent_care';
  usedWebSearch: boolean;
  usedKnowledgeBase: boolean;
}

// ============================================================================
// Vector Database In-Memory State
// ============================================================================
let documents: IngestedDocument[] = [];
let chunks: DocumentChunk[] = [];

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

// Load persisted knowledge base from disk
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      documents = data.documents || [];
      chunks = data.chunks || [];
    }
  } catch (err) {
    console.warn('Failed to load persisted vector store, starting clean:', err);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ documents, chunks }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist vector store:', err);
  }
}

// Initialize and seed default hospital knowledge if empty
loadStore();

// Stopwords list to prevent artificial inflation of baseline vector similarity
export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// 256-dimensional dense semantic hashing vector with stopword suppression
export const DIM = 256;

// ============================================================================
// Semantic Embedding Engine
// ============================================================================
// Generates normalized dense vectors (768-dim simulation if Gemini offline, or Gemini API)
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text.slice(0, 2048),
      });
      if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
        return response.embeddings[0].values;
      }
    } catch {
      // Fallback to high-performance local dense semantic vector
    }
  }

  const vector = new Array(DIM).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  if (words.length === 0) {
    return vector;
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % DIM;
    vector[idx] += 1;

    // Subword character tri-grams (FastText style for typo & spelling tolerance)
    if (word.length >= 3) {
      for (let c = 0; c <= word.length - 3; c++) {
        const tri = word.slice(c, c + 3);
        let tHash = 0;
        for (let k = 0; k < tri.length; k++) {
          tHash = (tHash << 5) - tHash + tri.charCodeAt(k);
          tHash |= 0;
        }
        const tIdx = Math.abs(tHash) % DIM;
        vector[tIdx] += 1.0;
      }
    }

    // bigrams for contextual awareness
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let bHash = 0;
      for (let c = 0; c < bigram.length; c++) {
        bHash = (bHash << 5) - bHash + bigram.charCodeAt(c);
        bHash |= 0;
      }
      const bIdx = Math.abs(bHash) % DIM;
      vector[bIdx] += 1.5;
    }
  }

  // L2-normalize vector
  let norm = 0;
  for (let i = 0; i < DIM; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < DIM; i++) {
      vector[i] /= norm;
    }
  }
  return vector;
}

// Cosine similarity computation
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================================
// Text Chunking Engine (Sliding window with paragraph boundaries)
// ============================================================================
export function chunkText(fullText: string, maxChunkLength = 600, overlap = 100): string[] {
  const paragraphs = fullText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunksResult: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length <= maxChunkLength) {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    } else {
      if (currentChunk) {
        chunksResult.push(currentChunk);
      }
      if (para.length > maxChunkLength) {
        // Break long paragraph by sentences
        const sentences = para.split(/(?<=[.?!])\s+/);
        let subChunk = '';
        for (const sent of sentences) {
          if (subChunk.length + sent.length <= maxChunkLength) {
            subChunk += (subChunk ? ' ' : '') + sent;
          } else {
            if (subChunk) chunksResult.push(subChunk);
            subChunk = sent;
          }
        }
        currentChunk = subChunk;
      } else {
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = (overlapText ? overlapText + '\n' : '') + para;
      }
    }
  }

  if (currentChunk && !chunksResult.includes(currentChunk)) {
    chunksResult.push(currentChunk);
  }

  return chunksResult.length > 0 ? chunksResult : [fullText.slice(0, maxChunkLength)];
}

// ============================================================================
// Document Ingestion (PDF, DOCX, TXT, MD)
// ============================================================================
export async function ingestDocument(params: {
  name: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<IngestedDocument> {
  const { name, buffer, mimeType } = params;
  let extractedText = '';

  if (mimeType.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    extractedText = parsed.text || '';
  } else if (
    mimeType.includes('word') ||
    mimeType.includes('officedocument') ||
    name.toLowerCase().endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    extractedText = result.value;
  } else {
    // Plain text, markdown, CSV, JSON
    extractedText = buffer.toString('utf-8');
  }

  extractedText = extractedText.replace(/\r\n/g, '\n').trim();
  if (!extractedText) {
    throw new Error('No readable text could be extracted from this document.');
  }

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const textChunks = chunkText(extractedText);

  const newChunks: DocumentChunk[] = [];
  for (let i = 0; i < textChunks.length; i++) {
    const chunkTextContent = textChunks[i];
    const embedding = await generateEmbedding(chunkTextContent);
    newChunks.push({
      id: `${docId}_c${i + 1}`,
      documentId: docId,
      documentName: name,
      chunkIndex: i + 1,
      totalChunks: textChunks.length,
      text: chunkTextContent,
      embedding,
      createdAt: new Date().toISOString(),
    });
  }

  const docMeta: IngestedDocument = {
    id: docId,
    name,
    sizeBytes: buffer.length,
    mimeType,
    chunkCount: textChunks.length,
    uploadedAt: new Date().toISOString(),
  };

  documents.push(docMeta);
  chunks.push(...newChunks);
  saveStore();

  return docMeta;
}

export function listDocuments(): IngestedDocument[] {
  return documents;
}

export function deleteDocument(docId: string): boolean {
  const prevCount = documents.length;
  documents = documents.filter((d) => d.id !== docId);
  chunks = chunks.filter((c) => c.documentId !== docId);
  saveStore();
  return documents.length < prevCount;
}

// ============================================================================
// Semantic Vector Search in Knowledge Base
// ============================================================================
export async function searchKnowledgeBase(
  query: string,
  topK = 4,
  minSimilarity = 0.20
): Promise<{ chunk: DocumentChunk; similarity: number }[]> {
  if (chunks.length === 0) return [];

  const queryTokens = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const queryEmbedding = await generateEmbedding(query);
  const scored = chunks.map((chunk) => {
    const sim = cosineSimilarity(queryEmbedding, chunk.embedding);

    const chunkTokens = new Set(
      chunk.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    );

    let exactMatches = 0;
    let partialMatches = 0;
    for (const token of queryTokens) {
      if (chunkTokens.has(token)) {
        exactMatches++;
      } else if (token.length >= 6) {
        const prefix = token.slice(0, 5);
        for (const cToken of chunkTokens) {
          if (cToken.startsWith(prefix)) {
            partialMatches++;
            break;
          }
        }
      }
    }

    const hasMeaningfulOverlap = exactMatches > 0 || partialMatches >= 2;
    const effectiveSim = queryTokens.length > 0 && !hasMeaningfulOverlap ? sim * 0.15 : sim;

    return { chunk, similarity: effectiveSim };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.filter((item) => item.similarity >= minSimilarity).slice(0, topK);
}

// ============================================================================
// Live Web Search Engine
// ============================================================================
export async function liveWebSearch(query: string): Promise<WebSearchResult[]> {
  try {
    const cleanQuery = encodeURIComponent(query.trim().slice(0, 150));
    const url = `https://api.duckduckgo.com/?q=${cleanQuery}&format=json&no_html=1&skip_disambig=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MediSlot-AI-Clinical-Agent/1.0',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const results: WebSearchResult[] = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || 'https://duckduckgo.com/?q=' + cleanQuery,
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.slice(0, 60) + '...',
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
        }
      }

      if (results.length > 0) return results;
    }
  } catch {
    // live web search timeout or network block
  }

  // Fallback to trusted online clinical reference search link
  return [
    {
      title: 'PubMed & MedlinePlus Medical Search: ' + query.slice(0, 40),
      snippet: 'Search verified clinical trials, medical literature, and patient health guidelines.',
      url: `https://medlineplus.gov/search?q=${encodeURIComponent(query)}`,
    },
  ];
}

// Seed baseline facility knowledge if no documents exist yet
export async function seedFacilityKnowledge() {
  if (documents.length > 0) return;

  const facilityText = `
Meridian Medical Pavilion B — Comprehensive Clinical Guide:
Pavilion B Heart and Vascular Center is located at 450 Meridian Parkway, Pavilion B (Suite 204/300), Health Sciences Campus.
Clinic Hours: Monday through Friday from 8:00 AM to 6:00 PM; Saturday from 9:00 AM to 2:00 PM. Telehealth consultations operate 7 days a week.
Parking: Free covered patient parking is available in Parking Garage B, connected via an air-conditioned skybridge to the third-floor reception atrium.
Specialties Offered: Cardiology, Non-Invasive Cardiac Telemetry, Neurology & Headache Clinic, Dermatology & Dermoscopy, and Orthopedics.
Accepted Insurances: Aetna Premier, BlueCross BlueShield PPO, UnitedHealthcare, Cigna, Medicare Part B, and self-pay options.
Prescription Refill Policy: Active prescription refills can be requested 24/7 through the MediSlot Patient Dashboard. Physicians review telemetry and authorize within 24 hours.
Emergency Medical Protocol: For acute, crushing chest tightness, sudden arm weakness, face drooping, or severe shortness of breath, call 911 or report to the emergency center immediately.
Telehealth Requirements: Patient needs a smartphone or computer with camera/mic. Telehealth video links are accessible 15 minutes before the scheduled appointment slot.
`.trim();

  await ingestDocument({
    name: 'Meridian_Pavilion_B_Clinical_Guide.txt',
    buffer: Buffer.from(facilityText, 'utf-8'),
    mimeType: 'text/plain',
  });
}

// Run baseline seed
seedFacilityKnowledge().catch(() => {});

// ============================================================================
// Comprehensive RAG Execution Pipeline
// ============================================================================
export async function executeRagPipeline(params: {
  query: string;
  userName?: string;
  conversationHistory?: { sender: 'user' | 'bot' | 'assistant'; text: string }[];
  enableWebSearch?: boolean;
}): Promise<RagResponse> {
  const { query, userName = 'Patient', conversationHistory = [], enableWebSearch = true } = params;

  // 1. Vector Search across Ingested Documents
  const relevantChunks = await searchKnowledgeBase(query, 3, 0.20);
  const usedKnowledgeBase = relevantChunks.length > 0;

  // 2. Live Web Search (if enabled or if question asks for current/external info)
  let webResults: WebSearchResult[] = [];
  const queryLower = query.toLowerCase();
  const needsWeb =
    enableWebSearch ||
    queryLower.includes('recent') ||
    queryLower.includes('latest') ||
    queryLower.includes('current') ||
    queryLower.includes('who') ||
    queryLower.includes('what is') ||
    queryLower.includes('search');

  if (needsWeb) {
    webResults = await liveWebSearch(query);
  }
  const usedWebSearch = webResults.length > 0;

  // Determine urgency level
  let urgencyLevel: 'routine' | 'priority' | 'urgent_care' = 'routine';
  if (
    queryLower.includes('chest') ||
    queryLower.includes('heart') ||
    queryLower.includes('shortness of breath') ||
    queryLower.includes('palpitation')
  ) {
    urgencyLevel =
      queryLower.includes('crushing') || queryLower.includes('severe') || queryLower.includes('left arm')
        ? 'urgent_care'
        : 'priority';
  } else if (queryLower.includes('stroke') || queryLower.includes('worst headache') || queryLower.includes('unconscious')) {
    urgencyLevel = 'urgent_care';
  }

  // 3. Assemble Source Citations
  const sources: RagResponse['sources'] = [];

  for (const item of relevantChunks) {
    sources.push({
      type: 'document',
      title: `${item.chunk.documentName} (Section ${item.chunk.chunkIndex}/${item.chunk.totalChunks})`,
      excerpt: item.chunk.text.slice(0, 180) + '...',
      similarity: Math.round(item.similarity * 100) / 100,
    });
  }

  for (const item of webResults) {
    sources.push({
      type: 'web',
      title: item.title,
      url: item.url,
      excerpt: item.snippet.slice(0, 180) + '...',
    });
  }

  // 4. Synthesize with LLM or Intelligent RAG Generator
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const contextChunksText = relevantChunks
        .map((c) => `[Source Document: ${c.chunk.documentName}, Part ${c.chunk.chunkIndex}]:\n${c.chunk.text}`)
        .join('\n\n');

      const webContextText = webResults
        .map((w) => `[Web Source: ${w.title}] (${w.url}):\n${w.snippet}`)
        .join('\n\n');

      const recentHistory = conversationHistory
        .slice(-5)
        .map((h) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n');

      const prompt = `
You are the MediSlot AI Assistant, an advanced Retrieval-Augmented Generation (RAG) assistant for patients and healthcare inquiries.

User Name: ${userName}

Conversation Context:
${recentHistory || 'No previous context.'}

Retrieved Knowledge Base Documents:
${contextChunksText || 'No matching local documents found.'}

Live Web Search Context:
${webContextText || 'No live web context.'}

User Question:
${query}

Instructions:
1. Provide a comprehensive, articulate, and accurate answer based on the retrieved document context and live web search results.
2. If the user asks about specific hospital details, cite the relevant Document name.
3. If external or general knowledge is referenced, cite the Web source URL where appropriate.
4. If the question cannot be answered from the knowledge base or web search, state honestly what is known and what cannot be verified, without fabricating or hallucinating facts.
5. If the query indicates acute medical danger (crushing chest pain, severe shortness of breath, sudden numbness), clearly advise contacting 911 or seeking emergency medical care.
6. Handle spelling mistakes and multi-part queries naturally.
`.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const replyText = response.text?.trim();
      if (replyText) {
        return {
          answer: replyText,
          sources,
          urgencyLevel,
          usedWebSearch,
          usedKnowledgeBase,
        };
      }
    } catch {
      // Fallback to deterministic local RAG synthesis
    }
  }

  // Deterministic Local RAG Answer Synthesizer
  let synthesizedAnswer = '';

  if (relevantChunks.length > 0) {
    const topChunk = relevantChunks[0].chunk;
    synthesizedAnswer = `According to **${topChunk.documentName}**:\n\n${topChunk.text}\n\n`;
    if (relevantChunks.length > 1) {
      synthesizedAnswer += `*Additional Reference (${relevantChunks[1].chunk.documentName}):* ${relevantChunks[1].chunk.text.slice(0, 200)}...\n\n`;
    }
  } else if (webResults.length > 0 && webResults[0].snippet) {
    synthesizedAnswer = `Based on current online references:\n\n${webResults[0].snippet}\n\n`;
  } else {
    synthesizedAnswer = `Thank you for your question, ${userName}. We have searched our indexed clinical knowledge base and web references regarding "${query.slice(0, 60)}". While specific documentation on this exact inquiry is currently limited in our local library, you can consult a Pavilion B specialist or contact our care team for dedicated clinical guidance.`;
  }

  if (urgencyLevel === 'urgent_care') {
    synthesizedAnswer += `\n\n🚨 **Immediate Medical Notice:** If you are experiencing acute chest pain, severe breathing difficulty, or sudden neurological weakness, please dial **911** or visit an emergency department immediately.`;
  }

  return {
    answer: synthesizedAnswer.trim(),
    sources,
    urgencyLevel,
    usedWebSearch,
    usedKnowledgeBase,
  };
}
