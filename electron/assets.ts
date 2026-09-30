// Папка assets/ рядом с exe: поиск, создание из встроенных дефолтов, чтение и запись конфигов.
import { app, dialog, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import log from 'electron-log/main';
import defGame from '../assets/config/game.json';
import defTeams from '../assets/config/teams.json';
import defLocations from '../assets/config/locations.json';
import defQuestions from '../assets/config/questions.json';
import { normalizeAll } from '../src/shared/normalize';
import type { AllConfig, GameSettings, LoadedAssets, Location, Questions, Team } from '../src/shared/types';

export type ConfigPart = 'game' | 'teams' | 'locations' | 'questions';
const FILES: Record<ConfigPart, string> = { game: 'game.json', teams: 'teams.json', locations: 'locations.json', questions: 'questions.json' };

export const DEFAULTS: AllConfig = {
  game: (defGame as { game: GameSettings }).game,
  teams: (defTeams as { teams: Team[] }).teams,
  locations: (defLocations as { locations: Location[] }).locations,
  questions: defQuestions as unknown as Questions,
};

let assetsDir = '';

/** Встроенная копия assets (кладётся electron-builder'ом в resources/default-assets) */
function defaultAssetsDir() {
  return app.isPackaged ? path.join(process.resourcesPath, 'default-assets') : path.join(app.getAppPath(), 'assets');
}

function candidateDir() {
  if (process.env.SHREK_ASSETS) return path.resolve(process.env.SHREK_ASSETS);
  if (!app.isPackaged) return path.join(app.getAppPath(), 'assets');
  // portable-exe распаковывается во временную папку, а настоящая папка exe — в PORTABLE_EXECUTABLE_DIR
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
  return path.join(exeDir, 'assets');
}

/** Копирует недостающие файлы (существующие не трогает — там могут быть правки пользователя) */
function copyMissing(src: string, dst: string): number {
  let n = 0;
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) n += copyMissing(s, d);
    else if (!fs.existsSync(d) && !e.name.endsWith('.bak.json')) {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

function writable(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-test-${process.pid}`);
    fs.writeFileSync(probe, '');
    fs.rmSync(probe);
    return true;
  } catch {
    return false;
  }
}

export function initAssetsDir(): string {
  let dir = candidateDir();
  if (!writable(dir)) {
    const fallback = path.join(app.getPath('userData'), 'assets');
    log.warn(`Папка ${dir} недоступна для записи — использую ${fallback}`);
    dir = fallback;
  }
  // При первом запуске (нет config/) раскладываем полный комплект, иначе ничего не трогаем
  if (!fs.existsSync(path.join(dir, 'config')) && path.resolve(dir) !== path.resolve(defaultAssetsDir())) {
    const n = copyMissing(defaultAssetsDir(), dir);
    log.info(`Создана папка assets (${n} файлов): ${dir}`);
  }
  assetsDir = dir;
  log.info('Папка assets:', dir);
  return dir;
}

export const getAssetsDir = () => assetsDir;

function listFiles(root: string, sub = ''): string[] {
  const out: string[] = [];
  const dir = path.join(root, sub);
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel);
  }
  return out;
}

function parseError(file: string, text: string, err: unknown): string {
  const msg = String((err as Error).message ?? err);
  // Новый V8 сам пишет «(line 3 column 21)», старый — только «position 47»
  const lc = /line (\d+) column (\d+)/.exec(msg);
  if (lc) return `${file}: ошибка в строке ${lc[1]}, столбец ${lc[2]}`;
  const pos = /position (\d+)/.exec(msg);
  if (pos) {
    const before = text.slice(0, Number(pos[1])).split('\n');
    return `${file}: ошибка в строке ${before.length}, столбец ${before.at(-1)!.length + 1}`;
  }
  if (/end of JSON|Unterminated/i.test(msg)) return `${file}: файл обрывается — не хватает закрывающей скобки или кавычки`;
  return `${file}: ${msg}`;
}

export function loadAssets(): LoadedAssets {
  const warnings: string[] = [];
  const raw: Partial<Record<ConfigPart, unknown>> = {};
  for (const [part, file] of Object.entries(FILES) as [ConfigPart, string][]) {
    const full = path.join(assetsDir, 'config', file);
    if (!fs.existsSync(full)) {
      warnings.push(`${file}: файл не найден — использую стандартный`);
      continue;
    }
    const text = fs.readFileSync(full, 'utf8').replace(/^﻿/, '');
    try {
      raw[part] = JSON.parse(text);
    } catch (err) {
      warnings.push(`${parseError(file, text, err)} — использую стандартный`);
    }
  }
  const config = normalizeAll(raw, DEFAULTS, (m) => warnings.push(m));
  const files = ['images', 'videos', 'audio'].flatMap((d) => listFiles(assetsDir, d));
  for (const w of warnings) log.warn(w);
  let baseUrl = pathToFileURL(assetsDir).toString();
  if (!baseUrl.endsWith('/')) baseUrl += '/';
  return { config, baseUrl, dir: assetsDir, files, warnings };
}

const backedUp = new Set<ConfigPart>();

export function saveConfig(part: ConfigPart, data: unknown) {
  const full = path.join(assetsDir, 'config', FILES[part]);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  // Перед первой записью за сессию — резервная копия
  if (!backedUp.has(part) && fs.existsSync(full)) {
    fs.copyFileSync(full, full.replace(/\.json$/, '.bak.json'));
    backedUp.add(part);
  }
  const wrapped = part === 'questions' ? data : { [part]: data };
  const tmp = `${full}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(wrapped, null, 2) + '\n');
  fs.renameSync(tmp, full);
  log.info('Сохранён', FILES[part]);
}

export type PickKind = 'video' | 'music' | 'voice' | 'character' | 'map' | 'image';
const PICK: Record<PickKind, { folder: string; filters: Electron.FileFilter[] }> = {
  video: { folder: 'videos', filters: [{ name: 'Видео', extensions: ['mp4', 'webm', 'm4v'] }] },
  music: { folder: 'audio/music', filters: [{ name: 'Аудио', extensions: ['mp3', 'ogg', 'wav', 'm4a'] }] },
  voice: { folder: 'audio/voice', filters: [{ name: 'Аудио', extensions: ['mp3', 'ogg', 'wav', 'm4a'] }] },
  character: { folder: 'images/characters', filters: [{ name: 'Картинки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] }] },
  map: { folder: 'images/map', filters: [{ name: 'Картинки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }] },
  image: { folder: 'images/ui', filters: [{ name: 'Картинки', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] }] },
};

/** Выбор файла: если он лежит вне нужной папки assets — копируется туда. Возвращает имя файла. */
export async function pickFile(win: BrowserWindow, kind: PickKind): Promise<string | null> {
  const { folder, filters } = PICK[kind];
  const target = path.join(assetsDir, folder);
  fs.mkdirSync(target, { recursive: true });
  const r = await dialog.showOpenDialog(win, { defaultPath: target, filters, properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const src = r.filePaths[0];
  const name = path.basename(src);
  if (path.resolve(path.dirname(src)) !== path.resolve(target)) {
    fs.copyFileSync(src, path.join(target, name));
    log.info(`Скопирован ${name} в ${folder}`);
  }
  return name;
}
