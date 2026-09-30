import { motion } from 'framer-motion';
import { MediaImage } from './common';
import type { Location } from '../shared/types';
import type { PlayTeam } from '../store/game';
import './Map.css';

interface Props {
  locations: Location[];
  completed: Record<string, string>;
  teams: PlayTeam[];
  /** Положение фишки, которая сейчас прыгает (переопределяет pos команды) */
  moving?: { teamId: string; index: number; hop: number } | null;
  highlight?: number | null;
  start: { x: number; y: number };
}

/** Карта с локациями, тропинкой и фишками. Координаты — проценты от размера карты. */
export function GameMap({ locations, completed, teams, moving, highlight, start }: Props) {
  const pts = locations.map((l) => `${l.x},${l.y}`);
  const pathD = pts.length ? `M${pts.join(' L')} Z` : '';
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

  // Позиции фишек: несколько фишек на одной точке немного раздвигаем
  const tokenPos = teams.map((t) => {
    const idx = moving?.teamId === t.id ? moving.index : t.pos;
    return { t, idx };
  });
  const groups: Record<string, string[]> = {};
  tokenPos.forEach(({ t, idx }) => (groups[idx] ??= []).push(t.id));

  return (
    <div className="gmap" data-testid="map">
      <svg className="gmap-path" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d={pathD} />
        {locations[0] && <line x1={start.x} y1={start.y} x2={locations[0].x} y2={locations[0].y} />}
      </svg>
      <motion.div className="gmap-start" style={{ left: `${start.x}%`, top: `${start.y}%` }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
        🚩<span>Старт</span>
      </motion.div>
      {locations.map((l, i) => {
        const done = completed[l.id];
        const doneBy = done ? teamById[done] : null;
        return (
          <motion.div
            key={l.id}
            className={`gloc ${done ? 'done' : ''} ${highlight === i ? 'hl' : ''}`}
            style={{ left: `${l.x}%`, top: `${l.y}%`, ['--tc' as string]: doneBy?.color ?? '#d4a017' }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 260, damping: 18 }}
            data-testid={`loc-${l.id}`}
            data-done={done ? '1' : '0'}
          >
            {highlight === i && <span className="gloc-ring" />}
            <MediaImage kind="map" name={l.icon} alt={l.name} className="gloc-icon" />
            {done && <span className="gloc-check">✔</span>}
            <span className="gloc-name">{l.name}</span>
          </motion.div>
        );
      })}
      {tokenPos.map(({ t, idx }) => {
        const p = idx < 0 ? start : locations[idx] ?? start;
        const group = groups[idx];
        const k = group.indexOf(t.id);
        const off = (k - (group.length - 1) / 2) * 3.2;
        const hop = moving?.teamId === t.id ? moving.hop : 0;
        return (
          <motion.div
            key={t.id}
            className="token"
            style={{ ['--tc' as string]: t.color }}
            initial={false}
            animate={{ left: `${p.x + off}%`, top: `${p.y - 5.5}%` }}
            transition={{ type: 'spring', stiffness: 170, damping: 20 }}
            data-testid={`token-${t.id}`}
            data-pos={idx}
          >
            <motion.div key={hop} className="token-body" initial={{ y: 0 }} animate={{ y: [0, -34, 0] }} transition={{ duration: 0.38, ease: 'easeOut' }}>
              <MediaImage kind="character" name={t.character} alt={t.name} />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
