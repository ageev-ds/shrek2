// Звук: SFX (свои файлы из assets/audio/sfx или синтез), фоновая музыка, mute.
import { ALL_SOUNDS, renderMusicLoop, renderSound, type SoundId } from './synth';

let ctx: AudioContext | null = null;
let sfxGain: GainNode;
let musicGain: GainNode;
const buffers = new Map<SoundId, AudioBuffer>();
const customSfx = new Map<SoundId, string>();
let musicSource: AudioBufferSourceNode | null = null;
let musicEl: HTMLAudioElement | null = null;
let muted = false;
let volumes = { sfx: 0.8, music: 0.35 };
const listeners = new Set<(m: boolean) => void>();

function ensureCtx() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain.connect(ctx.destination);
    musicGain.connect(ctx.destination);
    applyVolumes();
  }
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = muted ? 0 : volumes.sfx;
  musicGain.gain.value = muted ? 0 : volumes.music;
  if (musicEl) musicEl.volume = muted ? 0 : volumes.music;
}

/** Готовит все звуки. Файл assets/audio/sfx/<id>.(mp3|ogg|wav) заменяет синтезированный звук. */
export async function initAudio(sfxUrl: (id: string) => string | null) {
  const c = ensureCtx();
  void c;
  await Promise.all(
    ALL_SOUNDS.map(async (id) => {
      const url = sfxUrl(id);
      if (url) {
        // fetch() не умеет file:// — свои звуки играем через <audio>
        customSfx.set(id, url);
        return;
      }
      buffers.set(id, await renderSound(id));
    }),
  );
}

export function play(id: SoundId) {
  const custom = customSfx.get(id);
  if (custom && !muted) {
    const a = new Audio(custom);
    a.volume = volumes.sfx;
    void a.play().catch(() => undefined);
    return;
  }
  const buf = buffers.get(id);
  if (!ctx || !buf || muted) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(sfxGain);
  src.start();
}

export function setVolumes(sfx: number, music: number) {
  volumes = { sfx, music };
  applyVolumes();
}

/** Музыка: файл из assets (url) или встроенная мелодия. Повторный вызов с тем же url ничего не делает. */
let currentMusic: string | null | undefined;
export async function startMusic(url: string | null) {
  if (currentMusic === url && (musicEl || musicSource)) return;
  stopMusic();
  currentMusic = url;
  const c = ensureCtx();
  if (url) {
    musicEl = new Audio(url);
    musicEl.loop = true;
    musicEl.volume = muted ? 0 : volumes.music;
    musicEl.onerror = () => window.api.log('warn', `Не удалось проиграть музыку ${url}`);
    void musicEl.play().catch(() => undefined);
  } else {
    const buf = await renderMusicLoop();
    if (currentMusic !== url) return;
    musicSource = c.createBufferSource();
    musicSource.buffer = buf;
    musicSource.loop = true;
    musicSource.connect(musicGain);
    musicSource.start();
  }
}

export function stopMusic() {
  musicSource?.stop();
  musicSource = null;
  if (musicEl) {
    musicEl.pause();
    musicEl.src = '';
    musicEl = null;
  }
  currentMusic = undefined;
}

/** Приглушить музыку (например, на время видео или крика в микрофон) */
export function duckMusic(on: boolean) {
  if (!ctx) return;
  const v = muted ? 0 : on ? volumes.music * 0.15 : volumes.music;
  musicGain.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
  if (musicEl) musicEl.volume = v;
}

export function isMuted() {
  return muted;
}
export function setMuted(m: boolean) {
  muted = m;
  applyVolumes();
  listeners.forEach((l) => l(m));
}
export function onMuteChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Озвучка фразы голосом Windows (если нет аудиофайла-примера) */
export function speak(text: string, rate = 1, pitch = 1) {
  if (muted || !('speechSynthesis' in window)) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ru-RU';
  const ru = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ru'));
  if (ru) u.voice = ru;
  u.rate = rate;
  u.pitch = pitch;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}
