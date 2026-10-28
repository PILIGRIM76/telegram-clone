// CipherLink Build Verification Script
// Запускает собранный EXE и проверяет успешность запуска по ключевым маркерам в stdout

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findExe() {
  const possiblePaths = [
    path.join(__dirname, '..', 'release', 'win-unpacked', 'CipherLink.exe'),
    path.join(__dirname, '..', 'release_new', 'win-unpacked', 'CipherLink.exe'),
    path.join(__dirname, '..', 'release_final', 'win-unpacked', 'CipherLink.exe'),
    path.join(__dirname, '..', 'release', 'CipherLink 1.0.0.exe'),
    path.join(__dirname, '..', 'release_new', 'CipherLink 1.0.0.exe'),
    path.join(__dirname, '..', 'release_final', 'CipherLink 1.0.0.exe'),
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`[Verify] Found EXE: ${p}`);
      return p;
    }
  }
  return null;
}

async function verifyBuild() {
  const exePath = findExe();
  
  if (!exePath) {
    console.error('❌ EXE not found in any expected location');
    console.log('Searched paths:');
    possiblePaths.forEach(p => console.log(`  - ${p} (${fs.existsSync(p) ? 'EXISTS' : 'missing'})`));
    process.exit(1);
  }

  console.log(`[Verify] Launching: ${exePath}`);
  
  const proc = spawn(exePath, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  const timeout = 15000; // 15 секунд
  const startTime = Date.now();
  
  let success = false;
  let output = '';

  const checkOutput = (data) => {
    const text = data.toString();
    output += text;
    
    // Ключевые маркеры успешного запуска
    if (text.includes('Сервер на порту') || 
        text.includes('Server listening') ||
        text.includes('✅ Page loaded successfully') ||
        text.includes('Backend ready, creating window')) {
      success = true;
      console.log(`\n[Verify] ✅ SUCCESS MARKER FOUND: ${text.trim()}`);
      proc.kill();
    }
  };

  proc.stdout.on('data', checkOutput);
  proc.stderr.on('data', checkOutput);

  proc.on('close', (code) => {
    if (success) {
      console.log('\n[Verify] ✅ BUILD VERIFIED SUCCESSFULLY');
      console.log(`[Verify] Exit code: ${code}`);
      process.exit(0);
    } else {
      console.log('\n[Verify] ❌ BUILD VERIFICATION FAILED');
      console.log(`[Verify] Exit code: ${code}`);
      console.log(`[Verify] Output captured: ${output.substring(0, 500)}...`);
      process.exit(1);
    }
  });

  proc.on('error', (err) => {
    console.error('[Verify] Spawn error:', err.message);
    process.exit(1);
  });

  // Таймаут
  setTimeout(() => {
    if (!success) {
      console.log('\n[Verify] ❌ BUILD VERIFICATION FAILED - TIMEOUT');
      console.log(`[Verify] No success markers in ${timeout/1000}s`);
      console.log(`[Verify] Last output: ${output.substring(0, 300)}...`);
      proc.kill();
      process.exit(1);
    }
  }, 15000);
}

verifyBuild();