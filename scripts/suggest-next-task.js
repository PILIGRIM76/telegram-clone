const fs = require('fs');
const path = require('path');

const vaultPath = 'F:/Obsidian_Vaults/AntiPiry/CipherLink';
const stagesPath = path.join(vaultPath, 'stages');
const mocPath = path.join(vaultPath, 'MOC.md');

const tasks = [];

// Читаем MOC.md
if (fs.existsSync(mocPath)) {
  const mocContent = fs.readFileSync(mocPath, 'utf8');
  mocContent.split('\n').forEach((line, index) => {
    if (line.trim().startsWith('- [ ]')) {
      tasks.push({
        stage: 'MOC.md',
        file: 'MOC.md',
        line: index + 1,
        task: line.trim().replace('- [ ] ', '')
      });
    }
  });
}

// Читаем файлы из stages/
if (fs.existsSync(stagesPath)) {
  fs.readdirSync(stagesPath).filter(f => f.endsWith('.md')).forEach(file => {
    const content = fs.readFileSync(path.join(stagesPath, file), 'utf8');
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : file;
    content.split('\n').forEach((line, index) => {
      if (line.trim().startsWith('- [ ]')) {
        tasks.push({
          stage: title,
          file: 'stages/' + file,
          line: index + 1,
          task: line.trim().replace('- [ ] ', '')
        });
      }
    });
  });
}

if (tasks.length === 0) {
  console.log('Нет активных задач.');
  process.exit(0);
}

console.log('Задачи из Obsidian vault:\n');
tasks.slice(0, 5).forEach((t, i) => {
  console.log((i+1) + '. [' + t.stage + '] ' + t.task);
  console.log('   Файл: ' + t.file + ':' + t.line + '\n');
});
console.log('Всего: ' + tasks.length);
