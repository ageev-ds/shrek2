import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { GameMap } from '../components/Map';
import { Dice } from '../components/Dice';
import { Confirm, MediaImage, Particles, Scoreboard } from '../components/common';
import { useCfg } from '../store/config';
import { activeTeam, useGame } from '../store/game';
import { play } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import { bg } from './StartScreen';
import './screens.css';

export const START = { x: 40, y: 66 };
type Phase = 'idle' | 'rolling' | 'rolled' | 'moving' | 'arrived';

export function MapScreen() {
  const cfg = useCfg();
  const { teams, completed, planMove, finishMove, go } = useGame();
  const team = useGame(activeTeam);
  const [phase, setPhase] = useState<Phase>('idle');
  const [roll, setRoll] = useState(1);
  const [moving, setMoving] = useState<{ teamId: string; index: number; hop: number } | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const locs = cfg.locations;
  const doneCount = Object.keys(completed).length;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const throwDice = () => {
    if (phase !== 'idle' || !team) return;
    setRoll(1 + Math.floor(Math.random() * 6));
    setPhase('rolling');
  };
  useHotkey('space', throwDice, phase === 'idle' && !menu);
  useHotkey('escape', () => setMenu(true), phase === 'idle' && !menu);

  const afterRoll = () => {
    setPhase('rolled');
    later(() => {
      const move = planMove(roll, locs);
      setPhase('moving');
      move.path.forEach((idx, i) => {
        later(() => {
          play('hop');
          setMoving({ teamId: move.teamId, index: idx, hop: i + 1 });
        }, i * 430);
      });
      const end = move.path.length * 430 + 250;
      later(() => {
        setTarget(move.path.at(-1)!);
        setPhase('arrived');
        play('reveal');
      }, end);
      later(() => {
        finishMove();
        setMoving(null);
        useGame.setState({ currentLocation: locs[move.path.at(-1)!].id });
        go('location');
      }, end + 1400);
    }, 700);
  };

  return (
    <div className="screen mapscreen">
      <header className="map-top">
        <div className="map-title">
          <h1 className="title-gold">{cfg.game.title}</h1>
          <span className="muted">
            Пройдено {doneCount} из {locs.length}
          </span>
        </div>
        <Scoreboard activeId={team?.id} />
      </header>

      <div className="map-area">
        <div className="map-box">
          <div className="map-bg" style={{ backgroundImage: bg(cfg.game.mapBackground) }} />
          {cfg.game.particles && <Particles count={8} />}
          <GameMap locations={locs} completed={completed} teams={teams} moving={moving} highlight={target} start={START} />
        </div>
      </div>

      <footer className="map-bottom">
        <button className="btn wood small" onClick={() => setMenu(true)}>
          ☰ Меню
        </button>
        {team && (
          <motion.div key={team.id} className="turn" style={{ ['--tc' as string]: team.color }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <MediaImage kind="character" name={team.character} className="turn-avatar" />
            Ходит: <b>{team.name}</b>
          </motion.div>
        )}
        <button className="btn big" onClick={throwDice} disabled={phase !== 'idle'} data-testid="btn-roll">
          🎲 Бросить кубик <kbd>Пробел</kbd>
        </button>
      </footer>

      <AnimatePresence>
        {(phase === 'rolling' || phase === 'rolled') && (
          <motion.div className="dice-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dice value={roll} rolling={phase === 'rolling'} onDone={afterRoll} />
            <AnimatePresence>
              {phase === 'rolled' && (
                <motion.div className="dice-result title-gold" initial={{ scale: 0 }} animate={{ scale: 1 }} data-testid="dice-result">
                  {roll}!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'arrived' && target !== null && (
          <motion.div className="arrive-banner panel" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <MediaImage kind="map" name={locs[target].icon} className="arrive-icon" /> {team?.name} → <b>{locs[target].name}</b>
          </motion.div>
        )}
      </AnimatePresence>

      <Confirm
        open={menu}
        title="Выйти в меню?"
        text="Партия сохранится — её можно будет продолжить."
        ok="В меню"
        onOk={() => {
          setMenu(false);
          go('start');
        }}
        onCancel={() => setMenu(false)}
      />
    </div>
  );
}
