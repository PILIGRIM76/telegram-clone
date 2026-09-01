// Phase 9.5 fix: Obsidian sync использует Node.js модули (fs, path) —
// они не работают в Capacitor WebView. Этот файл — stub для browser build.
// Реальная синхронизация с Obsidian vault будет реализована в Phase 11
// через нативный Capacitor plugin или прямой HTTP API.

export const obsidianSync = {
  async exportChat(_options: { chatId: string; participant: string; outputDir?: string }): Promise<{ success: boolean; count: number }> {
    console.warn('[PILIGRIM] Obsidian sync is not yet implemented in browser build (Phase 11)');
    return { success: false, count: 0 };
  },
  async countStages(): Promise<{ done: number; pending: number }> {
    return { done: 0, pending: 0 };
  }
};
