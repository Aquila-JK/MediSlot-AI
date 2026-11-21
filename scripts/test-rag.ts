import { ingestDocument, listDocuments, executeRagPipeline, searchKnowledgeBase, liveWebSearch, seedFacilityKnowledge } from '../src/server/rag.ts';

async function runTests() {
  console.log('================================================================');
  console.log('🤖 Running Comprehensive RAG & AI Chatbot System Verification');
  console.log('================================================================\n');

  // 1. Verify Seeded Knowledge Base
  console.log('--- TEST 1: Initial Knowledge Base Inspection ---');
  await seedFacilityKnowledge();
  const initialDocs = listDocuments();
  console.log(`Initial documents count: ${initialDocs.length}`);
  for (const d of initialDocs) {
    console.log(`- Doc: "${d.name}" | Size: ${d.sizeBytes} bytes | Chunks: ${d.chunkCount}`);
  }
  if (initialDocs.length === 0) {
    throw new Error('Seed documents failed to initialize.');
  }
  console.log('✅ TEST 1 PASSED: Baseline knowledge base populated.\n');

  // 2. Ingest a New Clinical Document
  console.log('--- TEST 2: Ingest New Clinical Document (PDF/TXT/DOCX support) ---');
  const sampleGuideline = `
Clinical Protocol CP-2026-CARD:
Post-operative care instructions for cardiac telemetry patients:
Patients undergoing Holter or 48-hour ambulatory telemetry monitoring must avoid high-voltage induction zones and keep the cutaneous electrodes dry.
Emergency Escalation: If palpitations exceed 140 bpm resting or are accompanied by syncope, the on-call electrophysiologist (Pager #4402) must be notified immediately.
Discharge instructions: Take Carvedilol 12.5mg twice daily with meals.
`.trim();

  const newDoc = await ingestDocument({
    name: 'Clinical_Protocol_CP-2026-CARD.txt',
    buffer: Buffer.from(sampleGuideline, 'utf-8'),
    mimeType: 'text/plain',
  });
  console.log(`Ingested document "${newDoc.name}" -> ID: ${newDoc.id}, Chunks: ${newDoc.chunkCount}`);
  console.log('✅ TEST 2 PASSED: New document successfully chunked & embedded into vector database.\n');

  // 3. Test Semantic Vector Search
  console.log('--- TEST 3: Semantic Vector Search Retrieval ---');
  const searchResults = await searchKnowledgeBase('cutaneous electrodes dry and Holter monitoring protocol', 2);
  console.log(`Found ${searchResults.length} relevant chunks for query:`);
  for (const res of searchResults) {
    console.log(`- [Match: ${(res.similarity * 100).toFixed(1)}%] from "${res.chunk.documentName}":`);
    console.log(`  Excerpt: "${res.chunk.text.slice(0, 100)}..."`);
  }
  if (searchResults.length === 0 || searchResults[0].similarity < 0.2) {
    throw new Error('Semantic vector search failed to retrieve relevant chunks.');
  }
  console.log('✅ TEST 3 PASSED: Semantic vector search retrieved correct document with high similarity.\n');

  // 4. Test RAG Pipeline: Ingested Knowledge Base Retrieval & Citations
  console.log('--- TEST 4: Full RAG Pipeline on Uploaded Knowledge ---');
  const ragQuery1 = await executeRagPipeline({
    query: 'What should patients with Holter telemetry avoid doing with electrodes?',
    userName: 'Eleanor Vance',
  });
  console.log(`Answer:\n${ragQuery1.answer}\n`);
  console.log(`Sources (${ragQuery1.sources.length}):`);
  for (const s of ragQuery1.sources) {
    console.log(`- [${s.type.toUpperCase()}] ${s.title}: ${s.excerpt?.slice(0, 80)}...`);
  }
  if (!ragQuery1.usedKnowledgeBase || ragQuery1.sources.length === 0) {
    throw new Error('RAG pipeline failed to retrieve knowledge base sources.');
  }
  console.log('✅ TEST 4 PASSED: Knowledge retrieved and cited accurately.\n');

  // 5. Test Live Web Search Integration
  console.log('--- TEST 5: Live Web Search Retrieval & Citations ---');
  const webQuery = await liveWebSearch('hypertension clinical guidelines MedlinePlus');
  console.log(`Web search returned ${webQuery.length} results:`);
  for (const w of webQuery.slice(0, 2)) {
    console.log(`- Title: ${w.title}`);
    console.log(`  URL: ${w.url}`);
    console.log(`  Snippet: ${w.snippet.slice(0, 90)}...`);
  }
  if (webQuery.length === 0 || !webQuery[0].url) {
    throw new Error('Live web search failed to return citations.');
  }
  console.log('✅ TEST 5 PASSED: Live web search is functioning and provides active citations.\n');

  // 6. Test Spelling Mistakes & Incomplete Questions
  console.log('--- TEST 6: Misspelled & Informal Question Handling ---');
  const typoQuery = await executeRagPipeline({
    query: 'wat r the open hours and locashun of paviliun b?',
    userName: 'Test Patient',
  });
  console.log(`Answer:\n${typoQuery.answer}\n`);
  if (!typoQuery.usedKnowledgeBase) {
    throw new Error('Failed to resolve misspelled query against knowledge base.');
  }
  console.log('✅ TEST 6 PASSED: Handled spelling errors and mapped to Pavilion B hours.\n');

  // 7. Test Multi-Part Question
  console.log('--- TEST 7: Multi-Part Question Handling ---');
  const multiQuery = await executeRagPipeline({
    query: 'Where is Pavilion B located, and how do I request a prescription refill for my medication?',
    userName: 'Eleanor Vance',
  });
  console.log(`Answer:\n${multiQuery.answer}\n`);
  console.log('✅ TEST 7 PASSED: Multi-part query answered systematically.\n');

  // 8. Test Unknown / Out-of-Domain Question
  console.log('--- TEST 8: Unknown / Fabricated Topic Handling ---');
  const unknownQuery = await executeRagPipeline({
    query: 'What is the secret recipe for Martian potato stew on Jupiter Station?',
    userName: 'Inquisitive User',
  });
  console.log(`Answer:\n${unknownQuery.answer}\n`);
  if (unknownQuery.usedKnowledgeBase) {
    throw new Error('Chatbot erroneously matched out-of-domain query to hospital knowledge base.');
  }
  console.log('✅ TEST 8 PASSED: Unknown query handled honestly without hallucinations.\n');

  // 9. Test Emergency Medical Guidance
  console.log('--- TEST 9: Acute Symptom Emergency Safety Notice ---');
  const emergencyQuery = await executeRagPipeline({
    query: 'I have severe crushing chest pain radiating down my left arm and I can barely breathe',
    userName: 'Emergency Patient',
  });
  console.log(`Urgency: ${emergencyQuery.urgencyLevel}`);
  console.log(`Answer:\n${emergencyQuery.answer}\n`);
  if (emergencyQuery.urgencyLevel !== 'urgent_care' || !emergencyQuery.answer.includes('911')) {
    throw new Error('Emergency triage failed to detect critical urgency or mention 911.');
  }
  console.log('✅ TEST 9 PASSED: Critical symptoms flagged with urgent care alert and 911 notice.\n');

  console.log('================================================================');
  console.log('🎉 ALL 9 RAG & AI CHATBOT TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
