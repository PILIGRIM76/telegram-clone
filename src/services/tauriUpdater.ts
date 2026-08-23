import { check } from '@tauri-apps/plugin-updater';
import { invoke } from '@tauri-apps/api';

export async function checkForUpdates(): Promise<boolean> {
  try {
    // Проверяем, запущено ли приложение в Tauri через invoke
    try {
      await invoke('is_tauri');
    } catch (e) {
      console.log('Not running in Tauri, skipping update check');
      return false;
    }

    const update = await check();
    if (update) {
      console.log(`Found update ${update.version}! Downloading...`);
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 0;
          console.log(`Starting download, total size: ${contentLength}`);
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          console.log(`Downloaded ${downloaded} from ${contentLength}`);
        } else if (event.event === 'Finished') {
          console.log('Download finished');
        }
      });

      console.log('Update installed successfully');
      // Перезапускаем приложение через Tauri
      try {
        await invoke('relaunch');
      } catch (e) {
        // fallback - reload
        window.location.reload();
      }
      return true;
    }
    console.log('No new updates available');
    return false;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return false;
  }
}
