import * as fs from 'fs';
import * as path from 'path';
import { sqliteStorage } from './sqliteStorage';

const VOLUME_PATH = 'F:/Obsidian_Vaults/AntiPiry/CipherLink';
const stagesPath = path.join(VOLUME_PATH, 'stages');

interface ExportOptions {
  chatId: string;
  participant: string;
  outputDir?: string;
}

async function countStages(): Promise<{ done: number, pending: number }> {
  if (!fs.existsSync(stagesPath)) return { done: 0, pending: 0 };
  
  const files = fs.readdirSync(stagesPath).filter(f => path.extname(f) === '.md');
  let done = 0, pending = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(stagesPath, file), 'utf-8');
    const doneMatches = content.match(/- \[x\]/g) || [];
    const pendingMatches = content.match(/- \[ \]/g) || [];
    done += doneMatches.length;
    pending += pendingMatches.length;
  }
  
  return { done, pending };
}

async function getLogStats(): Promise<{ date: string, commits: string[] }> {
  const date = new Date().toISOString();
  const stats: string[] = [];
  
  const files = fs.readdirSync(VOLUME_PATH).filter(f => path.extname(f) === '.log');
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(VOLUME_PATH, file), 'utf-8');
    stats.push(`**${file}**: ${content.split('\n').length} lines`);
  }
  
  return { date, commits: stats };
}

async function exportChatToMarkdownImpl(options: ExportOptions): Promise<string> {
  const { chatId, participant, outputDir } = options;
  const outputDirectory = outputDir || path.join(VOLUME_PATH, 'Chats');
  
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  
  const messages = await sqliteStorage.loadMessages(chatId, 1000, 0);
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${participant}_${date}.md`;
  const filePath = path.join(outputDirectory, fileName);
  
  const content = `# 🧠 Экспорт чата: ${participant}

**Дата:** ${date}
**Чат ID:** ${chatId}
**Теги:** [cipherlink, chat, ${participant}]

---

# Chat with **[[${participant}]]**
`;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  
  return filePath;
}

async function updateMOCImpl(): Promise<void> {
  const { done, pending } = await countStages();
  const total = done + pending;
  const { date } = await getLogStats();
  
  const mocContent = `# CyPhErLiNk KnOwLedgE BaSe

## Current Status
> Total: ${total} items

## Active Stages
[[Stages/Stage-01-SQLITE]] [[Stages/Stage-02-E2EE]] [[Stages/Stage-03-WEBSOCKET]]
[[Stages/Stage-04-TESTING]] [[Stages/Stage-05-DOCKER]] [[Stages/Stage-06-ENCRYPTION]]
[[Stages/Stage-07-FILES]] [[Stages/Stage-08-TYPING]] [[Stages/Stage-09-PAGINATION]]
[[Stages/Stage-10-DOCKER]] [[Stages/Stage-11-OBSIDIAN-SYNC]]

# CHiPhErLiNK

## Stats
# = ${date} time: ${date}
# **${pending}** active items
# **${total}** total items commits: ${total} commits
`;

  const mocPath = path.join(VOLUME_PATH, 'MOC.md');
  fs.writeFileSync(mocPath, mocContent, 'utf-8');
  console.log(`MOC updated: ${date} done: ${done}`);
}

export const obsidianSync = {
  exportChatToMarkdown: exportChatToMarkdownImpl,
  updateMOC: updateMOCImpl
};

export { exportChatToMarkdownImpl as exportChatToMarkdown, updateMOCImpl as updateMOC };
