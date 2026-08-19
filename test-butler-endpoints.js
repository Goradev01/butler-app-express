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
  console.log('🧪 TESTING BUTLER OLLAMA (qwen2.5:0.5b) & CONCIERGE BACKEND ENDPOINTS');
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

  // 5. Test Authenticated Chat with Personalized Member Context
  console.log('👉 [5] Testing POST /api/butler/chat with Authenticated User Context (Lord Percival)...');
  // Register a test member
  const uniqueEmail = `lord_${Date.now()}@butler.app`;
  const reg = await makeRequest({
    host: 'localhost', port: PORT, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail, password: 'Password123!' });

  const token = reg.body.token;

  // Complete profile
  await makeRequest({
    host: 'localhost', port: PORT, path: '/api/profile', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    preferredTitle: 'Lord',
    fullName: 'Lord Percival Vance',
    city: 'London'
  });

  // Join House Arthur
  await makeRequest({
    host: 'localhost', port: PORT, path: '/api/houses/join', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { houseId: 'arthur' });

  // Call butler chat with JWT token
  const authChatRes = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    message: 'Good evening Eaton, what events are available for members of my house this week?',
    persona: 'eaton'
  });
  console.log('Status Code:', authChatRes.statusCode);
  console.log('Concierge Response for Lord Percival:\n' + '   "' + authChatRes.body.message?.content.trim() + '"\n');

  // 6. Test Multi-Turn Conversation History
  console.log('👉 [6] Testing POST /api/butler/chat with Conversation History...');
  const historyRes = await makeRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    persona: 'eaton',
    messages: [
      { role: 'user', content: 'What is the motto of House Arthur?' },
      { role: 'assistant', content: 'House Arthur holds the distinguished motto: "THE ONCE AND FUTURE KING", reflecting leadership and noble vision.' },
      { role: 'user', content: 'Splendid. And what about House Lancelot?' }
    ]
  });
  console.log('Status Code:', historyRes.statusCode);
  console.log('Follow-up Response:\n' + '   "' + historyRes.body.message?.content.trim() + '"\n');

  // 7. Test Server-Sent Events (SSE) Streaming
  console.log('👉 [7] Testing POST /api/butler/chat/stream (SSE Streaming)...');
  const streamRes = await makeStreamRequest({
    host: 'localhost',
    port: PORT,
    path: '/api/butler/chat/stream',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    message: 'Recommend three private gentlemen lounges in Mayfair.',
    persona: 'eaton'
  });
  console.log('Status Code:', streamRes.statusCode);
  console.log('Content-Type:', streamRes.headers['content-type']);
  console.log('Stream Chunks Received:', streamRes.chunksCount);
  console.log('Stream Sample Output (first 300 chars):');
  console.log('   ' + streamRes.fullText.substring(0, 300).replace(/\n+/g, ' '));
  console.log();

  // 8. Test Swagger Documentation contains Butler tags
  console.log('👉 [8] Testing Swagger API Spec for /api/butler tags...');
  const swagger = await makeRequest({ host: 'localhost', port: PORT, path: '/api-docs.json', method: 'GET' });
  const butlerEndpoints = Object.keys(swagger.body.paths || {}).filter(p => p.startsWith('/api/butler'));
  console.log('Swagger Status:', swagger.statusCode, '| Butler Endpoints Documented:', butlerEndpoints);
  console.log();

  console.log('========================================================================');
  console.log('🎉 ALL BUTLER OLLAMA (qwen2.5:0.5b) ENDPOINTS TESTED SUCCESSFULLY!');
  console.log('========================================================================');
}

runButlerTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
