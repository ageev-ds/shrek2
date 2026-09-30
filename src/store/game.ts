// Партия: команды, счёт, позиции фишек, пройденные локации, очередь ходов, текущий экран.
import { create } from 'zustand';
import type { GameType, Location, MinigameResult, Team } from '../shared/types';

export type Screen = 'start' | 'teams' | 'intro' | 'map' | 'location' | 'minigame' | 'result' | 'finale' | 'editor';

export interface PlayTeam extends Team {
  score: number;
  /** Индекс локации в кольце или -1 — на старте */
  pos: number;
}

export interface Move {
  teamId: string;
  roll: number;
  /** Последовательность индексов локаций, через которые прыгает фишка (последний — цель) */
  path: number[];
}

interface GameState {
  screen: Screen;
  teams: PlayTeam[];
  turn: number;
  /** id локации → id команды, которая её прошла */
  completed: Record<string, string>;
  /** Какие элементы вопросов уже использованы (чтобы не повторялись) */
  used: Partial<Record<GameType, number[]>>;
  move: Move | null;
  currentLocation: string | null;
  lastResult: MinigameResult | null;
  /** Громкость криков по командам (для «Кричи громче») */
  shoutLevels: Record<string, number>;

  go: (s: Screen) => void;
  newGame: (teams: Team[]) => void;
  restart: () => void;
  resume: (snap: Snapshot) => void;
  planMove: (roll: number, locations: Location[]) => Move;
  finishMove: () => void;
  finishMinigame: (result: MinigameResult) => void;
  continueAfterResult: (locationsCount: number) => void;
  takeItems: (type: GameType, poolSize: number, count: number) => number[];
  setShoutLevel: (teamId: string, level: number) => void;
}

export type Snapshot = Pick<GameState, 'teams' | 'turn' | 'completed' | 'used' | 'shoutLevels'>;

const snapshot = (s: GameState): Snapshot => ({ teams: s.teams, turn: s.turn, completed: s.completed, used: s.used, shoutLevels: s.shoutLevels });

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export const useGame = create<GameState>((set, get) => {
  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const s = get();
      if (s.teams.length && Object.keys(s.completed).length < 999) void window.api.saveSession(snapshot(s));
    }, 200);
  };

  return {
    screen: 'start',
    teams: [],
    turn: 0,
    completed: {},
    used: {},
    move: null,
    currentLocation: null,
    lastResult: null,
    shoutLevels: {},

    go: (screen) => set({ screen }),

    newGame: (teams) => {
      set({
        teams: teams.map((t) => ({ ...t, score: 0, pos: -1 })),
        turn: 0,
        completed: {},
        used: {},
        move: null,
        currentLocation: null,
        lastResult: null,
        shoutLevels: {},
      });
      persist();
    },
    restart: () => {
      const s = get();
      get().newGame(s.teams);
    },
    resume: (snap) => set({ ...snap, move: null, currentLocation: null, lastResult: null }),

    planMove: (roll, locations) => {
      const s = get();
      const team = s.teams[s.turn % s.teams.length];
      const n = locations.length;
      const open = (i: number) => !s.completed[locations[i].id];
      const path: number[] = [];
      let idx = team.pos;
      let counted = 0;
      const remaining = locations.filter((_, i) => open(i)).length;
      // Считаем шаги только по непройденным локациям: команда всегда попадает на новую.
      // Больше одного круга не ходим — иначе при 1–2 оставшихся локациях фишка кружит по карте десятки прыжков.
      const steps = remaining > 0 ? ((roll - 1) % remaining) + 1 : 0;
      while (counted < steps) {
        idx = (idx + 1 + n) % n;
        path.push(idx);
        if (open(idx)) counted++;
      }
      const move = { teamId: team.id, roll, path };
      set({ move });
      return move;
    },
    finishMove: () => {
      const s = get();
      if (!s.move) return;
      const target = s.move.path.at(-1)!;
      set({
        teams: s.teams.map((t) => (t.id === s.move!.teamId ? { ...t, pos: target } : t)),
        move: null,
      });
      persist();
    },

    finishMinigame: (result) => {
      const s = get();
      set({
        teams: s.teams.map((t) => ({ ...t, score: t.score + (result.awards[t.id] ?? 0) })),
        completed: s.currentLocation ? { ...s.completed, [s.currentLocation]: s.teams[s.turn % s.teams.length].id } : s.completed,
        lastResult: result,
        screen: 'result',
      });
      persist();
    },
    continueAfterResult: (locationsCount) => {
      const s = get();
      const done = Object.keys(s.completed).length >= locationsCount;
      set({ turn: s.turn + 1, currentLocation: null, screen: done ? 'finale' : 'map' });
      persist();
    },

    takeItems: (type, poolSize, count) => {
      const s = get();
      let used = (s.used[type] ?? []).filter((i) => i < poolSize);
      if (poolSize - used.length < count) used = []; // всё использовано — начинаем пул заново
      const free = Array.from({ length: poolSize }, (_, i) => i).filter((i) => !used.includes(i));
      for (let i = free.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [free[i], free[j]] = [free[j], free[i]];
      }
      const picked = free.slice(0, Math.min(count, poolSize));
      set({ used: { ...s.used, [type]: [...used, ...picked] } });
      return picked;
    },
    setShoutLevel: (teamId, level) => set((s) => ({ shoutLevels: { ...s.shoutLevels, [teamId]: level } })),
  };
});

export const activeTeam = (s: GameState) => s.teams[s.turn % Math.max(1, s.teams.length)];
