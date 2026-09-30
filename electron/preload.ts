// Безопасный мост между интерфейсом и main-процессом.
import { contextBridge, ipcRenderer } from 'electron';
import type { LoadedAssets } from '../src/shared/types';

const api = {
  loadAssets: (): Promise<LoadedAssets> => ipcRenderer.invoke('assets:load'),
  saveConfig: (part: 'game' | 'teams' | 'locations' | 'questions', data: unknown): Promise<boolean> => ipcRenderer.invoke('assets:save', part, data),
  pickFile: (kind: 'video' | 'music' | 'voice' | 'character' | 'map' | 'image'): Promise<string | null> => ipcRenderer.invoke('assets:pick', kind),
  openAssetsFolder: (): Promise<string> => ipcRenderer.invoke('assets:openFolder'),
  loadSession: (): Promise<unknown> => ipcRenderer.invoke('session:load'),
  saveSession: (data: unknown): Promise<void> => ipcRenderer.invoke('session:save', data),
  clearSession: (): Promise<void> => ipcRenderer.invoke('session:clear'),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
  info: (): Promise<{ version: string; assetsDir: string; startupMs: number }> => ipcRenderer.invoke('app:info'),
  log: (level: 'info' | 'warn' | 'error', msg: string) => ipcRenderer.send('log', level, msg),
};

export type ShrekApi = typeof api;
contextBridge.exposeInMainWorld('api', api);
