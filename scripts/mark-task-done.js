const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const file = args[0];
const lineNum = parseInt(args[1]);

if (!file || isNaN(lineNum)) {
  console.error('Usage: node mark-task-done.js <file> <line>');
  process.exit(1);
}

const vaultPath = 'F:/Obsidian_Vaults/AntiPiry/CipherLink';
const filePath = path.join(vaultPath, file);

if (!fs.existsSync(filePath)) {
  console.error('File not found: ' + filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

if (lines[lineNum - 1] && lines[lineNum - 1].trim().startsWith('- [ ]')) {
  lines[lineNum - 1] = lines[lineNum - 1].replace('- [ ]', '- [x]');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Task marked done: ' + file + ':' + lineNum);
} else {
  console.error('Line ' + lineNum + ' does not contain an unchecked task);
}
