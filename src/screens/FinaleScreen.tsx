import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { MediaImage, VideoPlayer } from '../components/common';
import { hasMedia, useCfg } from '../store/config';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { bg } from './StartScreen';
import './screens.css';

const HEIGHTS = [230, 170, 120];

export default function FinaleScreen() {
  const cfg = useCfg();
  const teams = useGame((s) => s.teams);
  const restart = useGame((s) => s.restart);
  const go = useGame((s) => s.go);
  const [video, setVideo] = useState(() => hasMedia('video', cfg.game.victoryVideo));
  const ranked = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);
  const winners = ranked.filter((t) => t.score === ranked[0]?.score);

  useEffect(() => {
    void window.api.clearSession();
  }, []);
  useEffect(() => {
    if (video) return;
    play('fanfare');
    const colors = [...teams.map((t) => t.color), '#f1c94b', '#f5e6c8'];
    // Конфетти на отдельном canvas в воркере: пара залпов, без бесконечного цикла
    const shots = [0, 700, 1500, 2600].map((d, i) =>
      setTimeout(() => confetti({ particleCount: 90, spread: 70 + i * 15, startVelocity: 45, origin: { y: 0.65, x: 0.3 + (i % 3) * 0.2 }, colors, disableForReducedMotion: true }), d),
    );
    return () => {
      shots.forEach(clearTimeout);
      confetti.reset();
    };
  }, [video, teams]);

  const podium = [ranked[1], ranked[0], ranked[2]];
  return (
    <div className="screen finale" data-testid="finale">
      <div className="map-bg dim" style={{ backgroundImage: bg(cfg.game.mapBackground) }} />
      {!video && (
        <>
          <motion.h1 className="title-gold fin-title" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {winners.length > 1 ? 'Ничья! Победители:' : 'Победитель:'} {winners.map((w) => w.name).join(', ')}
          </motion.h1>
          <div className="podium">
            {podium.map((t, i) => {
              if (!t) return <div key={i} className="pod-slot" />;
              const place = ranked.indexOf(t);
              return (
                <div key={t.id} className="pod-slot">
                  <motion.div className="pod-team" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + (2 - place) * 0.35, type: 'spring', stiffness: 110, damping: 14 }}>
                    {place === 0 && (
                      <motion.span className="pod-crown" initial={{ y: -200, rotate: -30 }} animate={{ y: 0, rotate: 0 }} transition={{ delay: 1.4, type: 'spring', stiffness: 140, damping: 10 }}>
                        👑
                      </motion.span>
                    )}
                    <MediaImage kind="character" name={t.character} className="pod-avatar" />
                    <b>{t.name}</b>
                    <span className="pod-score">🧅 {t.score}</span>
                  </motion.div>
                  <motion.div className="pod-block" style={{ ['--tc' as string]: t.color }} initial={{ height: 0 }} animate={{ height: HEIGHTS[place] }} transition={{ delay: 0.2 + (2 - place) * 0.35, duration: 0.5 }}>
                    {place + 1}
                  </motion.div>
                </div>
              );
            })}
          </div>
          {ranked.length > 3 && (
            <div className="fin-rest">
              {ranked.slice(3).map((t, i) => (
                <span key={t.id}>
                  {i + 4}. {t.name} — 🧅 {t.score}
                </span>
              ))}
            </div>
          )}
          <motion.div className="row fin-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
            <button className="btn big" onClick={() => (play('click'), restart(), go('map'))} data-testid="btn-again">
              ↻ Играть снова
            </button>
            <button className="btn wood" onClick={() => (play('click'), go('start'))}>
              ⌂ В меню
            </button>
          </motion.div>
        </>
      )}
      {video && <VideoPlayer name={cfg.game.victoryVideo} onEnd={() => setVideo(false)} />}
    </div>
  );
}
