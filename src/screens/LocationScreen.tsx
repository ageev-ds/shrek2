import { motion } from 'framer-motion';
import { useState } from 'react';
import { MediaImage, VideoPlayer } from '../components/common';
import { hasMedia, useCfg } from '../store/config';
import { activeTeam, useGame } from '../store/game';
import { play } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import { GAME_TYPES } from '../shared/types';
import { bg } from './StartScreen';
import './screens.css';

/** Заставка локации: (видео, если есть) → название, задание, награда → «Начать задание» */
export function LocationScreen() {
  const cfg = useCfg();
  const go = useGame((s) => s.go);
  const locId = useGame((s) => s.currentLocation);
  const team = useGame(activeTeam);
  const loc = cfg.locations.find((l) => l.id === locId);
  const [video, setVideo] = useState(() => !!(loc && cfg.game.locationVideos && hasMedia('video', loc.video)));
  const start = () => {
    play('click');
    go('minigame');
  };
  useHotkey('enter', start, !video);
  useHotkey('space', start, !video);
  if (!loc || !team) return null;
  const type = GAME_TYPES.find((g) => g.id === loc.game)!;
  return (
    <div className="screen location">
      <div className="map-bg dim strong" style={{ backgroundImage: bg(cfg.game.mapBackground) }} />
      <motion.div className="loc-card panel" initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
        <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: 'spring' }}>
          <MediaImage kind="map" name={loc.icon} className="loc-icon" alt={loc.name} />
        </motion.div>
        <h1 className="title-gold loc-name" data-testid="loc-name">
          {loc.name}
        </h1>
        <div className="loc-type">
          {type.icon} {type.title}
        </div>
        <p className="loc-desc">{loc.description}</p>
        <div className="loc-meta">
          <span className="chip" style={{ ['--tc' as string]: team.color }}>
            Играет: <b>{team.name}</b>
          </span>
          <span className="chip">⏱ {loc.game === 'shout' ? `${loc.time} с на крик` : loc.game === 'final_quiz' ? `${loc.time} с на вопрос` : `${loc.time} с`}</span>
          <span className="chip">🧅 {loc.reward}{cfg.game.perfectBonus ? ` (+${cfg.game.perfectBonus} без ошибок)` : ''}</span>
        </div>
        <button className="btn big" onClick={start} data-testid="btn-begin">
          ▶ Начать задание
        </button>
      </motion.div>
      {video && <VideoPlayer name={loc.video} caption={loc.name} onEnd={() => setVideo(false)} />}
    </div>
  );
}
