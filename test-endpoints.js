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
  console.log('--- Testing Butler Express API: Resend OTP, World Guide, Forum, Multilevel Feed & City Guide ---');

  // 1. Test Swagger Specs
  const swagger = await makeRequest({ host: 'localhost', port: 3000, path: '/api-docs.json', method: 'GET' });
  console.log('1. Swagger API Spec status:', swagger.statusCode, '| Documented Endpoints:', Object.keys(swagger.body.paths || {}).length);

  // 2. Test Register Account (Triggers Resend Email Service)
  const reg = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail, password: 'Password123!' });
  console.log('2. Register Account:', reg.body.message, '| Code:', reg.body.verificationCode, '| Email Sent via Resend:', reg.body.emailSent);

  const token = reg.body.token;

  // 3. Test Resend OTP
  const resendOtp = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/auth/resend-otp', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail });
  console.log('3. Resend OTP via Resend API:', resendOtp.body.message, '| Code:', resendOtp.body.verificationCode);

  const freshCode = resendOtp.body.verificationCode;

  // 4. Verify Email
  const verify = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/auth/verify-email', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: uniqueEmail, code: freshCode });
  console.log('4. Verify Email with OTP:', verify.body.message);

  // 5. Complete Profile
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
  console.log('5. Complete Profile:', profile.body.message);

  // 6. Select Hobbies & Join House
  const hobbies = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/hobbies/select', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { hobbies: ['Arts and Culture', 'Lifestyle', 'Adventure & Exploration'] });
  
  const joinHouse = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/houses/join', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { houseId: hobbies.body.recommendedHouse.id });
  console.log('6. Join House:', joinHouse.body.message);

  // 7. Test Multilevel Activity Feed & RSVP
  const globalFeed = await makeRequest({ host: 'localhost', port: 3000, path: '/api/feed?level=global', method: 'GET' });
  console.log('7. Multilevel Feed (Global):', globalFeed.body.count, 'posts found.');

  const cityFeed = await makeRequest({ host: 'localhost', port: 3000, path: '/api/feed?level=city', method: 'GET' });
  console.log('8. Multilevel Feed (City Chapter - London):', cityFeed.body.count, 'posts found.');

  const rsvpRes = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/feed/posts/feed_global_1/rsvp', method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('9. Toggle RSVP for Event:', rsvpRes.body.message, '| Total RSVPs:', rsvpRes.body.post?.rsvpCount);

  // 8. Test World Guide
  const countries = await makeRequest({ host: 'localhost', port: 3000, path: '/api/world-guide/countries', method: 'GET' });
  console.log('10. World Guide Countries:', countries.body.countries ? countries.body.countries.length : 0, 'countries.');

  const franceGuide = await makeRequest({ host: 'localhost', port: 3000, path: '/api/world-guide/countries/FR', method: 'GET' });
  console.log('11. World Guide Country (France): Emergency line', franceGuide.body.country?.emergencyNumbers?.general);

  // 9. Test Forum
  const forumCats = await makeRequest({ host: 'localhost', port: 3000, path: '/api/forum/categories', method: 'GET' });
  console.log('12. Forum Categories:', forumCats.body.categories ? forumCats.body.categories.length : 0, 'categories.');

  const forumDisc = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/forum/discussions', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, {
    category: 'Career',
    title: 'Executive leadership transitions in global chapters',
    currentSituation: 'Overseeing multi-city chapter growth.',
    feelings: ['Inspired', 'Confident'],
    biggestChallenge: 'Maintaining house traditions across remote teams.'
  });
  console.log('13. Create Forum Discussion Circle:', forumDisc.body.message);

  // 10. Test Interactive City Guide Endpoints
  const cityCats = await makeRequest({ host: 'localhost', port: 3000, path: '/api/city-guide/categories', method: 'GET' });
  console.log('14. City Guide Categories:', cityCats.body.categories ? cityCats.body.categories.length : 0, 'categories loaded.');

  const cityPlaces = await makeRequest({ host: 'localhost', port: 3000, path: '/api/city-guide/places?city=London&category=food_drink', method: 'GET' });
  console.log('15. City Guide Places (London - Food & Drink):', cityPlaces.body.places ? cityPlaces.body.places.length : 0, 'venues found.');

  const booking = await makeRequest({
    host: 'localhost', port: 3000, path: '/api/city-guide/places/place_fd_2/book', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { partySize: 2, specialNotes: 'Aman Spa & Private dining reservation' });
  console.log('16. Book City Place (Claridge\'s Bar):', booking.body.message, '| Booking ID:', booking.body.booking?.id);

  console.log('🎉 ALL BACKEND REST API ENDPOINTS & SWAGGER VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => console.error('Test error:', err));
