// Схема конфигов из assets/config/*.json. Общая для main и renderer.

export type GameType =
  | 'guess_description'
  | 'quick_questions'
  | 'repeat_phrase'
  | 'odd_one_out'
  | 'charades'
  | 'true_false'
  | 'word_builder'
  | 'shout'
  | 'final_quiz';

export const GAME_TYPES: { id: GameType; title: string; icon: string }[] = [
  { id: 'guess_description', title: 'Угадай по описанию', icon: '🔎' },
  { id: 'quick_questions', title: 'Быстрые вопросы', icon: '⚡' },
  { id: 'repeat_phrase', title: 'Повтори фразу с интонацией', icon: '🎭' },
  { id: 'odd_one_out', title: 'Найди лишнее', icon: '🧩' },
  { id: 'charades', title: 'Изобрази персонажа', icon: '🤫' },
  { id: 'true_false', title: 'Правда или ложь', icon: '⚖️' },
  { id: 'word_builder', title: 'Собери слово', icon: '🔤' },
  { id: 'shout', title: 'Кричи громче', icon: '📣' },
  { id: 'final_quiz', title: 'Финальный квиз', icon: '👑' },
];

export interface Team {
  id: string;
  name: string;
  color: string;
  emoji: string;
  /** Картинка фишки из images/characters/ */
  character: string;
}

export interface TeamsConfig {
  teams: Team[];
}

export interface Location {
  id: string;
  name: string;
  /** Иконка из images/map/ */
  icon: string;
  /** Позиция центра на карте, в процентах */
  x: number;
  y: number;
  game: GameType;
  reward: number;
  /** Секунды на задание (для shout — на крик одной команды, для final_quiz — на один вопрос) */
  time: number;
  /** Заставка из videos/ (пусто — без заставки) */
  video: string;
  description: string;
}

export interface LocationsConfig {
  locations: Location[];
}

export interface GameSettings {
  title: string;
  subtitle: string;
  perfectBonus: number;
  /** Файлы из videos/ ('' — не показывать) */
  introVideo: string;
  victoryVideo: string;
  /** Показывать заставки локаций */
  locationVideos: boolean;
  /** Фоновая музыка из audio/music/ ('' — встроенная мелодия) */
  music: string;
  musicVolume: number;
  sfxVolume: number;
  /** Фон карты из images/map/ */
  mapBackground: string;
  /** Лёгкие частицы на фоне (можно выключить на слабом ПК) */
  particles: boolean;
  /** Сколько вопросов в «Быстрых вопросах», «Правде или лжи» и «Финальном квизе» */
  quickCount: number;
  trueFalseCount: number;
  finalCount: number;
}

export interface GameConfig {
  game: GameSettings;
}

export type Mood = 'angry' | 'happy' | 'scared' | 'sad' | 'romantic' | 'proud';

export const MOODS: Record<Mood, { emoji: string; label: string; rate: number; pitch: number }> = {
  angry: { emoji: '😡', label: 'сердито', rate: 1.05, pitch: 0.7 },
  happy: { emoji: '😂', label: 'радостно', rate: 1.15, pitch: 1.3 },
  scared: { emoji: '😱', label: 'испуганно', rate: 1.3, pitch: 1.5 },
  sad: { emoji: '😢', label: 'грустно', rate: 0.8, pitch: 0.8 },
  romantic: { emoji: '😍', label: 'романтично', rate: 0.85, pitch: 1.1 },
  proud: { emoji: '😎', label: 'гордо', rate: 0.95, pitch: 0.9 },
};

export interface Questions {
  guess_description: { text: string; answer: string }[];
  quick_questions: { q: string; options: string[]; correct: number }[];
  repeat_phrase: { phrase: string; character: string; mood: Mood; audio: string }[];
  odd_one_out: { title: string; items: { image: string; label: string }[]; odd: number; explanation: string }[];
  charades: { character: string; hint: string }[];
  true_false: { statement: string; answer: boolean; explanation: string }[];
  word_builder: { word: string; hint: string }[];
  shout: { phrase: string }[];
  final_quiz: { q: string; answer: string }[];
}

export interface AllConfig {
  game: GameSettings;
  locations: Location[];
  teams: Team[];
  questions: Questions;
}

export interface LoadedAssets {
  config: AllConfig;
  /** file:// URL папки assets со слэшем на конце */
  baseUrl: string;
  dir: string;
  /** Относительные пути существующих медиафайлов (с прямыми слэшами) */
  files: string[];
  warnings: string[];
}

export interface MinigameResult {
  /** Кому начислить очки: teamId → луковицы */
  awards: Record<string, number>;
  success: boolean;
  perfect: boolean;
  summary: string;
}
