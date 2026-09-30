import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MediaImage, Modal, Particles } from '../components/common';
import { mediaUrl, useCfg } from '../store/config';
import { useGame, type Snapshot } from '../store/game';
import { play, setVolumes } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';

export function StartScreen() {
  const cfg = useCfg();
  const go = useGame((s) => s.go);
  const resume = useGame((s) => s.resume);
  const [saved, setSaved] = useState<Snapshot | null>(null);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    void window.api.loadSession().then((s) => {
      const snap = s as Snapshot | null;
      if (snap?.teams?.length && Object.keys(snap.completed ?? {}).length < cfg.locations.length) setSaved(snap);
    });
  }, [cfg.locations.length]);
  useHotkey('ctrl+shift+e', () => go('editor'));

  const letters = [...cfg.game.title];
  return (
    <div className="screen start">
      <div className="map-bg dim" style={{ backgroundImage: bg(cfg.game.mapBackground) }} />
      {cfg.game.particles && <Particles />}
      <div className="start-heroes" aria-hidden>
        {['shrek.svg', 'donkey.svg', 'puss.svg'].map((c, i) => (
          <motion.div key={c} className="start-hero" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}>
            <MediaImage kind="character" name={c} />
          </motion.div>
        ))}
      </div>
      <div className="start-center">
        <h1 className="start-title title-gold" aria-label={cfg.game.title}>
          {letters.map((ch, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.045, type: 'spring', stiffness: 400, damping: 16 }}>
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h1>
        <motion.p className="start-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          {cfg.game.subtitle}
        </motion.p>
        <motion.div className="start-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          <button className="btn big" onClick={() => (play('click'), go('teams'))} data-testid="btn-start">
            ▶ Начать игру
          </button>
          {saved && (
            <button
              className="btn green"
              onClick={() => {
                play('click');
                resume(saved);
                go('map');
              }}
              data-testid="btn-resume"
            >
              ⟲ Продолжить ({Object.keys(saved.completed).length} из {cfg.locations.length} локаций)
            </button>
          )}
          <div className="row">
            <button className="btn wood" onClick={() => (play('click'), setSettings(true))}>
              ⚙ Настройки
            </button>
            <button className="btn wood" onClick={() => (play('click'), go('editor'))} data-testid="btn-editor">
              ✏ Режим редактирования
            </button>
            <button className="btn wood" onClick={() => window.api.quit()}>
              ⏻ Выход
            </button>
          </div>
        </motion.div>
      </div>
      <div className="start-hint muted">
        <kbd>F11</kbd> полный экран · <kbd>M</kbd> звук · <kbd>Пробел</kbd> бросить кубик
      </div>
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}

export const bg = (name: string) => {
  const u = mediaUrl('map', name);
  return u ? `url("${u}")` : undefined;
};

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cfg = useCfg();
  const [sfx, setSfx] = useState(cfg.game.sfxVolume);
  const [music, setMusic] = useState(cfg.game.musicVolume);
  useEffect(() => setVolumes(sfx, music), [sfx, music]);
  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div className="col" style={{ gap: '1.1rem' }}>
        <h2 className="title-gold" style={{ fontSize: '2.2rem', textAlign: 'center' }}>
          Настройки
        </h2>
        <label className="field">
          <span>Громкость звуков: {Math.round(sfx * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={sfx} onChange={(e) => setSfx(Number(e.target.value))} onMouseUp={() => play('correct')} />
        </label>
        <label className="field">
          <span>Громкость музыки: {Math.round(music * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={music} onChange={(e) => setMusic(Number(e.target.value))} />
        </label>
        <button className="btn wood" onClick={() => void window.api.toggleFullscreen()}>
          🖥 Полный экран / окно (F11)
        </button>
        <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Чтобы сохранить громкость насовсем — измените её в «Режиме редактирования» → «Настройки».
        </p>
        <button className="btn" onClick={onClose}>
          Готово
        </button>
      </div>
    </Modal>
  );
}
