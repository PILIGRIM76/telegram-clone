// scripts/migrate-logs.js
// Безопасная миграция console.* -> logger.* во всём src.
// В отличие от наивного regex-варианта, здесь заменяется только токен
// вызова (console.<method>() -> logger.<method>()), поэтому аргументы
// (включая многострочные) сохраняются нетронутыми. Импорт logger
// добавляется в начало файла с корректным относительным путём.

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');
const LOGGER_PATH = path.join(SRC, 'services', 'logger.ts');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

// Порядок важен только для читаемости; методы не пересекаются.
const REPLACEMENTS = [
  [/console\.debug\(/g, 'logger.debug('],
  [/console\.info\(/g, 'logger.info('],
  [/console\.log\(/g, 'logger.info('],
  [/console\.warn\(/g, 'logger.warn('],
  [/console\.error\(/g, 'logger.error('],
];

let migrated = 0;
let touched = 0;

for (const file of walk(SRC)) {
  if (file === LOGGER_PATH) continue; // сам logger не трогаем

  const before = fs.readFileSync(file, 'utf8');
  let content = before;

  for (const [re, rep] of REPLACEMENTS) {
    content = content.replace(re, rep);
  }

  const usesLogger = /logger\.(debug|info|warn|error)\(/.test(content);
  const alreadyImports = /services\/logger/.test(content);

  if (usesLogger && !alreadyImports) {
    let rel = path
      .relative(path.dirname(file), LOGGER_PATH)
      .split(path.sep)
      .join('/');
    if (!rel.startsWith('.')) rel = './' + rel;
    rel = rel.replace(/\.ts$/, ''); // TS запрещает импорт с расширением .ts
    const importLine = `import { logger } from '${rel}';\n`;
    content = importLine + content;
  }

  if (content !== before) {
    fs.writeFileSync(file, content, 'utf8');
    migrated++;
    if (usesLogger) touched++;
  }
}

console.log(`Migrated ${migrated} file(s); ${touched} now import logger.`);
