import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface ElectronAPI {
  getVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;
  showNotification: (options: { title: string; body: string }) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onUpdateAvailable: (callback: (info: unknown) => void) => void;
  onUpdateDownloaded: (callback: (info: unknown) => void) => void;
  onUpdateProgress: (callback: (progress: unknown) => void) => void;
  onNewMessage: (callback: () => void) => void;
  onOpenSettings: (callback: () => void) => void;
  onShowAbout: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

const api: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_: IpcRendererEvent, info: unknown) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_: IpcRendererEvent, info: unknown) => callback(info));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_: IpcRendererEvent, progress: unknown) => callback(progress));
  },
  onNewMessage: (callback) => {
    ipcRenderer.on('new-message', () => callback());
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', () => callback());
  },
  onShowAbout: (callback) => {
    ipcRenderer.on('show-about', () => callback());
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electron', api);

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}