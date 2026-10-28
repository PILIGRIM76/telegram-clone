const fs = require('fs');

const content = fs.readFileSync('F:/AntiPiry/src/components/ContactList.tsx', 'utf8');

console.log('Total length:', content.length);

// Find the area around line 480
const lines = content.split('\n');
for (let i = 475; i < 490; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}