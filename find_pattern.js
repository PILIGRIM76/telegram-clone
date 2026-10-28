const fs = require('fs');

const content = fs.readFileSync('F:/AntiPiry/src/components/ContactList.tsx', 'utf8');

console.log('Total length:', content.length);

// Find all occurrences of });\n
let idx = 0;
while (true) {
  idx = content.indexOf('});\n', idx);
  if (idx === -1) break;
  const context = content.substring(idx, idx + 80);
  if (context.includes('})}')) {
    console.log('Found at index:', idx);
    console.log('Context:', JSON.stringify(context.substring(0, 100)));
  }
  idx += 4;
}