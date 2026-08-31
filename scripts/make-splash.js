// Phase 9.5: generate splash.png from main app icon
const sharp = require('sharp');

async function makeSplash() {
  // Create 1242x2208 splash with brand purple background
  const svg = `
    <svg width="1242" height="2208" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect width="1242" height="2208" fill="url(#bg)"/>
      <g transform="translate(621, 1104)">
        <!-- Wi-Fi waves left -->
        <path d="M -290,0 A 290,290 0 0,1 -193,-213" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-opacity="0.25"/>
        <path d="M -240,0 A 240,240 0 0,1 -168,-170" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-opacity="0.4"/>
        <path d="M -190,0 A 190,190 0 0,1 -134,-134" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-opacity="0.7"/>
        <!-- Wi-Fi waves right -->
        <path d="M 290,0 A 290,290 0 0,0 193,-213" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-opacity="0.25"/>
        <path d="M 240,0 A 240,240 0 0,0 168,-170" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-opacity="0.4"/>
        <path d="M 190,0 A 190,190 0 0,0 134,-134" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-opacity="0.7"/>
        <!-- Key head -->
        <circle cx="0" cy="-77" r="67" fill="none" stroke="#ffffff" stroke-width="38"/>
        <!-- Key body -->
        <rect x="-19" y="-10" width="38" height="240" rx="19" fill="#ffffff"/>
        <!-- Key teeth -->
        <rect x="-19" y="144" width="58" height="29" rx="10" fill="#ffffff"/>
        <rect x="-19" y="192" width="43" height="29" rx="10" fill="#ffffff"/>
      </g>
      <text x="621" y="1450" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="120" font-weight="bold">PILIGRIM</text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile('f:/AntiPiry/android/app/src/main/res/drawable/splash.png');
  console.log('[OK] splash.png created');
}

makeSplash().catch(e => { console.error(e.message); process.exit(1); });