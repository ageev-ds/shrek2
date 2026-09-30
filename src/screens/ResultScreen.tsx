import { motion } from 'framer-motion';
import { MediaImage, Scoreboard } from '../components/common';
import { useCfg } from '../store/config';
import { activeTeam, useGame } from '../store/game';
import { play } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import { bg } from './StartScreen';
import './screens.css';

export function ResultScreen() {
  const cfg = useCfg();
  const r = useGame((s) => s.lastResult);
  const teams = useGame((s) => s.teams);
  const team = useGame(activeTeam);
  const cont = useGame((s) => s.continueAfterResult);
  const next = () => {
    play('click');
    cont(cfg.locations.length);
  };
  useHotkey('enter', next);
  useHotkey('space', next);
  if (!r) return null;
  const awarded = teams.filter((t) => (r.awards[t.id] ?? 0) !== 0);
  return (
    <div className="screen result">
      <div className="map-bg dim strong" style={{ backgroundImage: bg(cfg.game.mapBackground) }} />
      <motion.div className={`res-card panel ${r.success ? 'ok' : 'fail'}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 18 }} data-testid="result">
        <div className="res-emoji">{r.success ? (r.perfect ? '🏆' : '🎉') : '😿'}</div>
        <h1 className="title-gold">{r.success ? (r.perfect ? 'Блестяще!' : 'Задание выполнено!') : 'Не в этот раз…'}</h1>
        <p className="res-summary">{r.summary}</p>
        <div className="res-awards">
          {awarded.length === 0 && <span className="muted">Луковицы никто не получил</span>}
          {awarded.map((t, i) => (
            <motion.div key={t.id} className="res-award" style={{ ['--tc' as string]: t.color }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.12 }}>
              <MediaImage kind="character" name={t.character} className="res-avatar" />
              <b>{t.name}</b>
              <span className="res-points">+{r.awards[t.id]} 🧅</span>
            </motion.div>
          ))}
        </div>
        {r.perfect && <div className="res-bonus">✨ Бонус +{cfg.game.perfectBonus} за прохождение без ошибок!</div>}
        <button className="btn big" onClick={next} data-testid="btn-continue">
          Продолжить →
        </button>
      </motion.div>
      <div className="res-scores">
        <Scoreboard activeId={team?.id} />
      </div>
    </div>
  );
}
