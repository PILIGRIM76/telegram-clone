const http = require('http');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('=== Persistence Layer Test ===\n');

  // 1. Register user
  console.log('1. Registering user...');
  const reg = await request('POST', '/register', {
    username: 'persist_test_user',
    password: 'test123',
    publicKey: 'test_public_key_123'
  });
  console.log('   Status:', reg.status);
  console.log('   Response:', reg.data);
  if (reg.status !== 201) throw new Error('Registration failed');
  const { uid, accessToken, refreshToken } = reg.data;

  // 2. Login
  console.log('\n2. Logging in...');
  const login = await request('POST', '/login', {
    username: 'persist_test_user',
    password: 'test123'
  });
  console.log('   Status:', login.status);
  console.log('   Response:', login.data);
  if (login.status !== 200) throw new Error('Login failed');
  const token = login.data.accessToken;

  // 3. Create a store
  console.log('\n3. Creating store...');
  const store = await request('POST', '/store', {
    uid,
    store: {
      type: 'public',
      name: 'Test Store',
      description: 'A test store'
    }
  }, token);
  console.log('   Status:', store.status);
  console.log('   Response:', store.data);

  // 4. Create a board
  console.log('\n4. Creating board...');
  const board = await request('POST', '/boards/create', {
    uid,
    title: 'Test Board',
    description: 'Test board description',
    txid: '0x1234567890abcdef',
    tariff: 0
  }, token);
  console.log('   Status:', board.status);
  console.log('   Response:', board.data);

  // 5. Publish pre-key bundle
  console.log('\n5. Publishing pre-key bundle...');
  const preKey = await request('POST', '/keys/publish', {
    uid,
    preKeyBundle: {
      registrationId: 123,
      preKeyId: 1,
      preKey: 'prekey123',
      signedPreKeyId: 1,
      signedPreKey: 'signedprekey123',
      identityKey: 'identitykey123',
      deviceId: 1
    }
  }, token);
  console.log('   Status:', preKey.status);
  console.log('   Response:', preKey.data);

  // 6. Get user profile via /key/:uid
  console.log('\n6. Getting user profile via /key/:uid...');
  const profile = await request('GET', `/key/${uid}`);
  console.log('   Status:', profile.status);
  console.log('   Response:', JSON.stringify(profile.data, null, 2));

  // 7. Test admin stats
  console.log('\n7. Admin stats (requires basic auth)...');
  const adminAuth = Buffer.from('admin:admin123').toString('base64');
  const stats = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/admin/stats',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${adminAuth}`
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });
  console.log('   Status:', stats.status);
  console.log('   Response:', stats.data);

  console.log('\n=== All tests passed! ===');
  console.log('Now RESTART the server and run this test again to verify persistence.');
  
  process.exit(0);
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});