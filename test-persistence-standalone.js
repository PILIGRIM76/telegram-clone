const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 4000;
const TEST_USER = {
  username: 'test_persist_' + Date.now(),
  password: 'testpass123',
  publicKey: 'test-public-key-hex-123456'
};

// Ждем, пока сервер запустится
function waitForServer(maxAttempts = 15) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      const req = http.get(`http://localhost:${PORT}`, (res) => {
        resolve();
      });

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Server did not start in time'));
        } else {
          setTimeout(check, 500);
        }
      });

      req.end();
    };

    check();
  });
}

// HTTP POST helper
function postRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Основной тест
async function runTest() {
  console.log('🚀 Starting server...');

  // Запускаем сервер как child process
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverOutput = '';
  server.stdout.on('data', data => {
    serverOutput += data.toString();
    process.stdout.write(`[SERVER] ${data}`);
  });

  server.stderr.on('data', data => {
    serverOutput += data.toString();
    process.stderr.write(`[SERVER ERROR] ${data}`);
  });

  try {
    // Ждем запуска сервера
    console.log('⏳ Waiting for server to start...');
    await waitForServer();
    console.log('✅ Server started\n');

    // ТЕСТ 1: Регистрация
    console.log('📝 Test 1: Register user');
    const regResult = await postRequest('/register', TEST_USER);

    if (regResult.status !== 201 && regResult.status !== 200) {
      throw new Error(`Registration failed: ${regResult.status} - ${JSON.stringify(regResult.data)}`);
    }

    const uid = regResult.data.uid || regResult.data.userId;
    console.log(`✅ User registered: ${uid}\n`);

    // ТЕСТ 2: Остановка сервера
    console.log('🛑 Stopping server...');
    server.kill('SIGTERM');

    await new Promise(resolve => {
      server.on('exit', resolve);
      setTimeout(resolve, 2000); // Force resolve after 2s
    });

    console.log('✅ Server stopped\n');

    // ТЕСТ 3: Перезапуск сервера
    console.log('🔄 Restarting server...');
    const server2 = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server2.stdout.on('data', data => process.stdout.write(`[SERVER] ${data}`));
    server2.stderr.on('data', data => process.stderr.write(`[SERVER ERROR] ${data}`));

    await waitForServer();
    console.log('✅ Server restarted\n');

    // ТЕСТ 4: Попытать войти с тем же пользователем
    console.log('🔐 Test 2: Login with same user (should exist in SQLite)');
    const loginResult = await postRequest('/login', {
      username: TEST_USER.username,
      password: TEST_USER.password
    });

    if (loginResult.status !== 200) {
      throw new Error(`Login failed after restart: ${loginResult.status} - ${JSON.stringify(loginResult.data)}`);
    }

    console.log(`✅ Login successful: ${JSON.stringify(loginResult.data)}\n`);

    // ТЕСТ 5: Проверка, что SQLite файл существует
    console.log('💾 Test 3: Check SQLite file exists');
    const dbPath = path.join(__dirname, 'data', 'cipherlink.db');
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`✅ SQLite file exists: ${dbPath} (${stats.size} bytes)\n`);
    } else {
      throw new Error(`SQLite file not found: ${dbPath}`);
    }

    console.log('🎉 ALL TESTS PASSED');
    console.log('✅ Persistence verified: user survived server restart');

    // Остановка второго сервера
    server2.kill('SIGTERM');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    server.kill('SIGTERM');
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});