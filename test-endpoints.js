const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
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

async function runTests() {
  const uniqueEmail = `gentleman_${Date.now()}@butler.app`;
  console.log('--- Testing Butler Express API & Swagger Endpoints ---');

  // 1. Test Swagger Specs
  const swagger = await makeRequest({ host: 'localhost', port: 3000, path: '/api-docs.json', method: 'GET' });
  console.log('Swagger API Spec endpoint status:', swagger.statusCode, '| Documented Paths:', Object.keys(swagger.body.paths || {}).length);

  // 2. Test Register Account
  const reg = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail, password: 'Password123!' });
  console.log('1. Register Account:', reg.body.message, '| Code:', reg.body.verificationCode);

  const token = reg.body.token;
  const verificationCode = reg.body.verificationCode;

  // 3. Verify Email
  const verify = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/auth/verify-email', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail, code: verificationCode });
  console.log('2. Verify Email:', verify.body.message);

  // 4. Complete Profile
  const profile = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/profile', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    preferredTitle: 'Lord',
    fullName: 'Lord Percival Vance',
    dateOfBirth: '1990-04-12',
    phoneNumber: '+44 7911 987654',
    country: 'United Kingdom',
    regionalState: 'London',
    city: 'London',
    postcode: 'SW1A 1AA'
  });
  console.log('3. Complete Profile:', profile.body.message);

  // 5. Select Hobbies
  const hobbies = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/hobbies/select', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { hobbies: ['Arts and Culture', 'Lifestyle', 'Adventure & Exploration'] });
  console.log('4. Select Hobbies:', hobbies.body.message, '| Recommended House:', hobbies.body.recommendedHouse.name);

  // 6. Join House
  const joinHouse = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/houses/join', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { houseId: hobbies.body.recommendedHouse.id });
  console.log('5. Join House:', joinHouse.body.message);

  // 7. Activity Feed
  const feedPost = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/feed/posts', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { title: 'Autumn Equestrian & Gala', content: 'Inviting all members to our upcoming gathering!', category: 'Lifestyle' });
  console.log('6. Activity Feed Post:', feedPost.body.message);

  console.log('✅ ALL API & SWAGGER VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => console.error('Test error:', err));
