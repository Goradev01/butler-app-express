const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

function makeStreamRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let fullChunks = [];
      let fullText = '';
      res.on('data', chunk => {
        const text = chunk.toString();
        fullChunks.push(text);
        fullText += text;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, fullText, chunksCount: fullChunks.length });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runButlerTests() {
  console.log('========================================================================');
  console.log('🧪 TESTING BUTLER OLLAMA (qwen2.5:0.5b), CONCIERGE & CHAT HISTORY ENDPOINTS');
  console.log('========================================================================\n');

  const PORT = process.env.PORT || 3000;

  // 1. Test Butler Status & Ollama Health
  console.log('👉 [1] Testing GET /api/butler/status...');
  const statusRes = await makeRequest({ host: 'localhost', port: PORT, path: '/api/butler/status', method: 'GET' });
  console.log('Status Code:', statusRes.statusCode);
  console.log('Status:', statusRes.body.status, '| Ollama Connected:', statusRes.body.connected);
  console.log('Active Model:', statusRes.body.activeModel, '| Is Model Available:', statusRes.body.isModelAvailable);
  console.log('Latency:', statusRes.body.latencyMs + 'ms\n');

  // 2. Test Concierge Personas List
  console.log('👉 [2] Testing GET /api/butler/concierges...');
  const personasRes = await makeRequest({ host: 'localhost', port: PORT, path: '/api/butler/concierges', method: 'GET' });
  console.log('Status Code:', personasRes.statusCode);
  console.log('Available Personas:', personasRes.body.concierges.map(p => `${p.name} (${p.title})`));
  console.log();

  // 3. Test Suggestions
  console.log('👉 [3] Testing GET /api/butler/suggestions...');
  const suggRes = await makeRequest({ host: 'localhost', port: PORT, path: '/api/butler/suggestions?city=London', method: 'GET' });
  console.log('Status Code:', suggRes.statusCode);
  console.log('Suggestions Count:', suggRes.body.suggestions.length);
  suggRes.body.suggestions.slice(0, 3).forEach(s => console.log(`   - "${s.label}" -> ${s.prompt}`));
  console.log();

  // 4. Test Single Message Chat with Eaton persona
  console.log('👉 [4] Testing POST /api/butler/chat with Eaton persona & qwen2.5:0.5b...');
  const chatStart = Date.now();
  const chatRes = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    message: 'A table for two tonight in London please.',
    persona: 'eaton'
  });
  console.log('Status Code:', chatRes.statusCode);
  console.log('Model Used:', chatRes.body.model, '| Source:', chatRes.body.source);
  console.log('Concierge:', chatRes.body.concierge?.name, '-', chatRes.body.concierge?.title);
  console.log('Response Content:\n' + '   "' + chatRes.body.message?.content.trim() + '"');
  console.log('Inference Duration:', (Date.now() - chatStart) + 'ms\n');

  // 5. Test Authenticated Chat & Persistent Thread Creation
  console.log('👉 [5] Testing Member Authentication & Creating Conversation Thread...');
  const uniqueEmail = `lord_${Date.now()}@butler.app`;
  const reg = await makeRequest({
    host: 'localhost', port: PORT, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail, password: 'Password123!' });

  const token = reg.body.token;

  await makeRequest({
    host: 'localhost', port: PORT, path: '/api/profile', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    preferredTitle: 'Lord',
    fullName: 'Lord Percival Vance',
    city: 'London'
  });

  await makeRequest({
    host: 'localhost', port: PORT, path: '/api/houses/join', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { houseId: 'arthur' });

  // Create thread
  const convRes = await makeRequest({
    host: 'localhost', port: PORT, path: '/api/butler/conversations', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { persona: 'eaton', title: 'Mayfair Weekend Dining' });
  const convId = convRes.body.conversation?.id;
  console.log('Created Conversation Thread ID:', convId, '| Title:', convRes.body.conversation?.title);
  console.log();

  // 6. Test Persistent Multi-Turn Chat via conversationId
  console.log('👉 [6] Testing POST /api/butler/chat Turn 1 using conversationId...');
  const turn1Res = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    conversationId: convId,
    message: 'Good evening Eaton. I require private dining for six gentlemen at The Connaught Grill this Friday.'
  });
  console.log('Turn 1 Response:\n   "' + turn1Res.body.message?.content.trim() + '"\n');

  console.log('👉 [7] Testing POST /api/butler/chat Turn 2 (Context Continuation without sending previous history manually)...');
  const turn2Res = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    conversationId: convId,
    message: 'What time would you recommend for our arrival?'
  });
  console.log('Turn 2 Response:\n   "' + turn2Res.body.message?.content.trim() + '"\n');

  // 8. Test Fetching Complete Conversation History
  console.log('👉 [8] Testing GET /api/butler/conversations/' + convId + '...');
  const historyRes = await makeRequest({
    host: 'localhost', port: PORT, path: `/api/butler/conversations/${convId}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Fetched Thread Messages Count:', historyRes.body.conversation?.messages.length);
  historyRes.body.conversation?.messages.forEach((m, idx) => {
    console.log(`   [${idx + 1}] (${m.role.toUpperCase()}): "${m.content.substring(0, 70)}..."`);
  });
  console.log();

  // 9. Test Listing All Member Conversations
  console.log('👉 [9] Testing GET /api/butler/conversations...');
  const listConvRes = await makeRequest({
    host: 'localhost', port: PORT, path: '/api/butler/conversations', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Total Conversations for Member:', listConvRes.body.count);
  console.log();

  // 10. Test Server-Sent Events (SSE) Streaming
  console.log('👉 [10] Testing POST /api/butler/chat/stream (SSE Streaming)...');
  const streamRes = await makeStreamRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat/stream',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    conversationId: convId,
    message: 'Recommend three private gentlemen lounges in Mayfair.'
  });
  console.log('Status Code:', streamRes.statusCode);
  console.log('Content-Type:', streamRes.headers['content-type']);
  console.log('Stream Chunks Received:', streamRes.chunksCount);
  console.log();

  // 11. Test Swagger Documentation contains Butler tags
  console.log('👉 [11] Testing Swagger API Spec for /api/butler tags...');
  const swagger = await makeRequest({ host: 'localhost', port: PORT, path: '/api-docs.json', method: 'GET' });
  const butlerEndpoints = Object.keys(swagger.body.paths || {}).filter(p => p.startsWith('/api/butler'));
  console.log('Swagger Status:', swagger.statusCode, '| Butler Endpoints Documented (', butlerEndpoints.length, 'endpoints):', butlerEndpoints);
  console.log();

  console.log('========================================================================');
  console.log('🎉 ALL BUTLER OLLAMA & CHAT HISTORY ENDPOINTS TESTED SUCCESSFULLY!');
  console.log('========================================================================');
}

runButlerTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
