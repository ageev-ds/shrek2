// Контент из папки assets: конфиги, адреса медиафайлов, предупреждения.
import { create } from 'zustand';
import type { AllConfig, LoadedAssets } from '../shared/types';

export type MediaKind = 'character' | 'map' | 'ui' | 'video' | 'music' | 'voice' | 'sfx';
const FOLDERS: Record<MediaKind, string> = {
  character: 'images/characters',
  map: 'images/map',
  ui: 'images/ui',
  video: 'videos',
  music: 'audio/music',
  voice: 'audio/voice',
  sfx: 'audio/sfx',
};

interface ConfigState {
  assets: LoadedAssets | null;
  files: Set<string>;
  load: () => Promise<void>;
  /** Заменить конфиг в памяти (после сохранения в редакторе) */
  setConfig: (c: AllConfig) => void;
}

export const useConfig = create<ConfigState>((set) => ({
  assets: null,
  files: new Set(),
  load: async () => {
    const assets = await window.api.loadAssets();
    set({ assets, files: new Set(assets.files) });
  },
  setConfig: (config) => set((s) => (s.assets ? { assets: { ...s.assets, config } } : s)),
}));

export const useCfg = () => useConfig((s) => s.assets!.config);

/** Относительный путь медиафайла: имя без «/» ищется в стандартной папке, с «/» — от корня assets */
export function mediaPath(kind: MediaKind, name: string) {
  const clean = name.replace(/\\/g, '/').replace(/^\/+/, '');
  return clean.includes('/') ? clean : `${FOLDERS[kind]}/${clean}`;
}

export function hasMedia(kind: MediaKind, name: string | undefined | null) {
  if (!name) return false;
  return useConfig.getState().files.has(mediaPath(kind, name));
}

/** file:// URL медиафайла или null, если файла нет */
export function mediaUrl(kind: MediaKind, name: string | undefined | null): string | null {
  const s = useConfig.getState();
  if (!name || !s.assets || !hasMedia(kind, name)) return null;
  return s.assets.baseUrl + mediaPath(kind, name).split('/').map(encodeURIComponent).join('/');
}

/** Первый существующий файл из вариантов с разными расширениями (для sfx/voice) */
export function mediaUrlAny(kind: MediaKind, base: string, exts = ['mp3', 'ogg', 'wav', 'm4a']) {
  for (const e of exts) {
    const u = mediaUrl(kind, `${base}.${e}`);
    if (u) return u;
  }
  return null;
}
