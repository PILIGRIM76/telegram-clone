// CipherLink Asset Pipeline — генерация иконок для всех платформ
// Использует SVG из public/icons/ как источник и sharp для конвертации
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ANDROID_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const TAURI_DIR = path.join(ROOT, 'src-tauri', 'icons');

// Создаём директории, если их нет
[PUBLIC_DIR, ANDROID_DIR, TAURI_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function generateIcons() {
  console.log('🚀 Начинаем генерацию иконок CipherLink...');

  // 1. PWA (используется manifest.webmanifest)
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(192, 192).toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  console.log('✅ PWA иконки созданы (192x192, 512x512)');

  // 2. Favicon
  await sharp(path.join(ICONS_DIR, 'favicon.svg')).resize(16, 16).toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  await sharp(path.join(ICONS_DIR, 'favicon.svg')).resize(32, 32).toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  await sharp(path.join(ICONS_DIR, 'favicon.svg')).resize(48, 48).toFile(path.join(PUBLIC_DIR, 'favicon-48x48.png'));
  console.log('✅ Favicon иконки созданы (16, 32, 48)');

  // 3. Android (mipmap)
  const androidSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };
  for (const [folder, size] of Object.entries(androidSizes)) {
    const targetDir = path.join(ANDROID_DIR, folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    await sharp(path.join(ICONS_DIR, 'main.svg')).resize(size, size).toFile(path.join(targetDir, 'ic_launcher.png'));
    // Round (для старых Android < O)
    await sharp(path.join(ICONS_DIR, 'main.svg')).resize(size, size).toFile(path.join(targetDir, 'ic_launcher_round.png'));
  }
  // Адаптивные иконки (Android 8+): foreground + background
  const anydpiDir = path.join(ANDROID_DIR, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });
  await sharp(path.join(ICONS_DIR, 'android-fg.svg')).resize(108, 108).toFile(path.join(anydpiDir, 'ic_launcher_foreground.png'));
  await sharp(path.join(ICONS_DIR, 'android-bg.svg')).resize(108, 108).toFile(path.join(anydpiDir, 'ic_launcher_background.png'));
  console.log('✅ Android иконки созданы (mdpi-hdpi-xhdpi-xxhdpi-xxxhdpi + adaptive)');

  // 4. Tauri (Windows / macOS / Linux)
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(32, 32).toFile(path.join(TAURI_DIR, '32x32.png'));
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(128, 128).toFile(path.join(TAURI_DIR, '128x128.png'));
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(256, 256).toFile(path.join(TAURI_DIR, '128x128@2x.png'));
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(256, 256).toFile(path.join(TAURI_DIR, 'icon.png'));
  // .ico для Windows (sharp поддерживает .ico)
  await sharp(path.join(ICONS_DIR, 'main.svg')).resize(256, 256).toFile(path.join(TAURI_DIR, 'icon.ico'));
  console.log('✅ Tauri иконки созданы (32, 128, 256, .ico)');

  console.log('🎉 Все иконки успешно сгенерированы!');
}

generateIcons().catch(err => {
  console.error('❌ Ошибка генерации иконок:', err);
  process.exit(1);
});