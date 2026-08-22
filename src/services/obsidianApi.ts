import axios from 'axios';

const OBSIDIAN_API_URL = 'http://localhost:27123';
const OBSIDIAN_VAULT_NAME = 'AntiPiry/CipherLink';

export interface ObsidianNote {
  path: string;
  content: string;
  tags: string[];
}

export const obsidianApi = {
  async getNote(path: string): Promise<ObsidianNote> {
    try {
      const response = await axios.get(OBSIDIAN_API_URL + '/vault/' + encodeURIComponent(path), {
        headers: { 'Obsidian-URL': OBSIDIAN_API_URL }
      });
      return {
        path: path,
        content: response.data,
        tags: response.data.match(/#[\w-]+/g) || []
      };
    } catch (error) {
      console.error('Failed to fetch note from Obsidian:', error);
      throw error;
    }
  },

  async searchNotesByTag(tag: string): Promise<string[]> {
    try {
      const response = await axios.get(OBSIDIAN_API_URL + '/search?query=' + encodeURIComponent(tag), {
        headers: { 'Obsidian-URL': OBSIDIAN_API_URL }
      });
      return response.data.map(function(item: any) { return item.filename; });
    } catch (error) {
      console.error('Failed to search notes:', error);
      return [];
    }
  },

  async updateNote(path: string, content: string): Promise<void> {
    try {
      await axios.put(OBSIDIAN_API_URL + '/vault/' + encodeURIComponent(path), content, {
        headers: { 'Obsidian-URL': OBSIDIAN_API_URL }
      });
    } catch (error) {
      console.error('Failed to update note in Obsidian:', error);
      throw error;
    }
  }
};
