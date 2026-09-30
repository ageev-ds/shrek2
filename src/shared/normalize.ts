// Проверка и «починка» конфигов: всё, чего не хватает или что сломано, берётся из дефолтов,
// а в warnings пишется понятное человеку предупреждение. Игра при этом не падает.
import { GAME_TYPES, MOODS, type AllConfig, type GameSettings, type Location, type Questions, type Team } from './types';

type Warn = (msg: string) => void;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : d);
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const color = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : d);

export function normalizeGame(raw: unknown, def: GameSettings, warn: Warn): GameSettings {
  const r = isObj(raw) && isObj(raw.game) ? raw.game : isObj(raw) ? raw : null;
  if (!r) {
    warn('game.json: не найден объект "game" — использую стандартные настройки');
    return def;
  }
  return {
    title: str(r.title, def.title),
    subtitle: str(r.subtitle, def.subtitle),
    perfectBonus: num(r.perfectBonus, def.perfectBonus, 0, 10000),
    introVideo: str(r.introVideo, def.introVideo),
    victoryVideo: str(r.victoryVideo, def.victoryVideo),
    locationVideos: bool(r.locationVideos, def.locationVideos),
    music: str(r.music, def.music),
    musicVolume: num(r.musicVolume, def.musicVolume, 0, 1),
    sfxVolume: num(r.sfxVolume, def.sfxVolume, 0, 1),
    mapBackground: str(r.mapBackground, def.mapBackground),
    particles: bool(r.particles, def.particles),
    quickCount: num(r.quickCount, def.quickCount, 1, 20),
    trueFalseCount: num(r.trueFalseCount, def.trueFalseCount, 1, 20),
    finalCount: num(r.finalCount, def.finalCount, 1, 20),
  };
}

export function normalizeTeams(raw: unknown, def: Team[], warn: Warn): Team[] {
  const list = isObj(raw) && Array.isArray(raw.teams) ? raw.teams : Array.isArray(raw) ? raw : null;
  if (!list || list.length === 0) {
    warn('teams.json: список команд пуст или не найден — использую стандартные команды');
    return def;
  }
  const teams = list.slice(0, 6).map((t, i) => {
    const d = def[i % def.length];
    const o = isObj(t) ? t : {};
    return {
      id: str(o.id, d.id + (i >= def.length ? `_${i}` : '')),
      name: str(o.name, d.name),
      color: color(o.color, d.color),
      emoji: str(o.emoji, d.emoji),
      character: str(o.character, d.character),
    };
  });
  if (teams.length < 2) {
    warn('teams.json: нужно минимум 2 команды — добавил стандартную');
    teams.push(def[1]);
  }
  return teams;
}

export function normalizeLocations(raw: unknown, def: Location[], warn: Warn): Location[] {
  const list = isObj(raw) && Array.isArray(raw.locations) ? raw.locations : Array.isArray(raw) ? raw : null;
  if (!list || list.length === 0) {
    warn('locations.json: список локаций пуст или не найден — использую стандартную карту');
    return def;
  }
  const types = new Set(GAME_TYPES.map((g) => g.id));
  return list.map((l, i) => {
    const d = def[i % def.length];
    const o = isObj(l) ? l : {};
    let game = str(o.game, d.game) as Location['game'];
    if (!types.has(game)) {
      warn(`locations.json: у локации «${str(o.name, d.name)}» неизвестный тип игры "${game}" — ставлю "${d.game}"`);
      game = d.game;
    }
    return {
      id: str(o.id, `loc_${i + 1}`),
      name: str(o.name, d.name),
      icon: str(o.icon, d.icon),
      x: num(o.x, d.x, 2, 98),
      y: num(o.y, d.y, 2, 98),
      game,
      reward: num(o.reward, d.reward, 0, 100000),
      time: num(o.time, d.time, 3, 600),
      video: str(o.video, ''),
      description: str(o.description, d.description),
    };
  });
}

export function normalizeQuestions(raw: unknown, def: Questions, warn: Warn): Questions {
  const r = isObj(raw) ? raw : {};
  const out = {} as Questions;
  const take = <K extends keyof Questions>(key: K, fix: (item: Record<string, unknown>) => Questions[K][number] | null) => {
    const src = r[key];
    if (!Array.isArray(src) || src.length === 0) {
      if (src !== undefined) warn(`questions.json: раздел "${key}" пуст — использую стандартные вопросы`);
      out[key] = def[key];
      return;
    }
    const items: Questions[K][number][] = [];
    src.forEach((item, i) => {
      const fixed = isObj(item) ? fix(item) : null;
      if (fixed) items.push(fixed);
      else warn(`questions.json: в разделе "${key}" пропущен элемент №${i + 1} (не хватает полей)`);
    });
    out[key] = (items.length ? items : def[key]) as Questions[K];
  };

  take('guess_description', (o) => (o.text && o.answer ? { text: str(o.text, ''), answer: str(o.answer, '') } : null));
  take('quick_questions', (o) => {
    const options = Array.isArray(o.options) ? o.options.map((x) => str(x, '')).filter(Boolean) : [];
    if (!o.q || options.length < 2) return null;
    return { q: str(o.q, ''), options, correct: num(o.correct, 0, 0, options.length - 1) };
  });
  take('repeat_phrase', (o) => {
    if (!o.phrase) return null;
    const mood = (str(o.mood, 'happy') in MOODS ? str(o.mood, 'happy') : 'happy') as keyof typeof MOODS;
    return { phrase: str(o.phrase, ''), character: str(o.character, ''), mood, audio: str(o.audio, '') };
  });
  take('odd_one_out', (o) => {
    const items = Array.isArray(o.items) ? o.items.filter(isObj).map((x) => ({ image: str(x.image, ''), label: str(x.label, '') })) : [];
    if (items.length < 3) return null;
    return { title: str(o.title, 'Найдите лишнее'), items, odd: num(o.odd, 0, 0, items.length - 1), explanation: str(o.explanation, '') };
  });
  take('charades', (o) => (o.character ? { character: str(o.character, ''), hint: str(o.hint, '') } : null));
  take('true_false', (o) =>
    o.statement !== undefined && typeof o.answer === 'boolean' ? { statement: str(o.statement, ''), answer: o.answer, explanation: str(o.explanation, '') } : null,
  );
  take('word_builder', (o) => {
    const word = str(o.word, '').trim();
    return word.length >= 2 && word.length <= 16 ? { word, hint: str(o.hint, '') } : null;
  });
  take('shout', (o) => (o.phrase ? { phrase: str(o.phrase, '') } : null));
  take('final_quiz', (o) => (o.q && o.answer ? { q: str(o.q, ''), answer: str(o.answer, '') } : null));
  return out;
}

export function normalizeAll(raw: Partial<Record<keyof AllConfig, unknown>>, def: AllConfig, warn: Warn): AllConfig {
  return {
    game: normalizeGame(raw.game, def.game, warn),
    teams: normalizeTeams(raw.teams, def.teams, warn),
    locations: normalizeLocations(raw.locations, def.locations, warn),
    questions: normalizeQuestions(raw.questions, def.questions, warn),
  };
}
