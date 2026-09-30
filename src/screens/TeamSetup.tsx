import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { MediaImage } from '../components/common';
import { useCfg, useConfig } from '../store/config';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import type { Team } from '../shared/types';
import { bg } from './StartScreen';

export const COLORS = ['#4CAF50', '#9E9E9E', '#FF9800', '#E91E63', '#2196F3', '#9C27B0', '#F44336', '#FFEB3B', '#795548', '#00BCD4'];

export function TeamSetup() {
  const cfg = useCfg();
  const files = useConfig((s) => s.files);
  const go = useGame((s) => s.go);
  const newGame = useGame((s) => s.newGame);
  const [teams, setTeams] = useState<Team[]>(() => cfg.teams.map((t) => ({ ...t })));
  const characters = [...files].filter((f) => f.startsWith('images/characters/')).map((f) => f.slice('images/characters/'.length));
  const [pick, setPick] = useState<number | null>(null);

  useHotkey('escape', () => (pick !== null ? setPick(null) : go('start')));
  const upd = (i: number, patch: Partial<Team>) => setTeams(teams.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const start = () => {
    play('land');
    newGame(teams.map((t, i) => ({ ...t, name: t.name.trim() || `Команда ${i + 1}` })));
    go('intro');
  };

  return (
    <div className="screen teams">
      <div className="map-bg dim" style={{ backgroundImage: bg(cfg.game.mapBackground) }} />
      <header className="teams-head">
        <button className="btn wood small" onClick={() => go('start')}>
          ← Назад
        </button>
        <h1 className="title-gold">Кто отправляется в путь?</h1>
        <span className="muted">{teams.length} команды</span>
      </header>
      <div className="teams-grid">
        <AnimatePresence>
          {teams.map((t, i) => (
            <motion.div
              key={t.id}
              className="team-card panel"
              style={{ ['--tc' as string]: t.color }}
              layout
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.08 }}
              data-testid="team-card"
            >
              <button className="team-avatar" onClick={() => setPick(i)} title="Выбрать персонажа">
                <MediaImage kind="character" name={t.character} alt={t.name} />
              </button>
              <input className="input team-name" value={t.name} maxLength={28} onChange={(e) => upd(i, { name: e.target.value })} data-testid={`team-name-${i}`} />
              <div className="colors">
                {COLORS.map((c) => (
                  <button key={c} className={`swatch ${t.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => upd(i, { color: c })} />
                ))}
              </div>
              {teams.length > 2 && (
                <button className="icon-btn team-del" title="Убрать команду" onClick={() => (play('remove'), setTeams(teams.filter((_, j) => j !== i)))}>
                  ✕
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {teams.length < 6 && (
          <button
            className="team-add"
            onClick={() => {
              play('add');
              setTeams([...teams, { id: `team_${Date.now()}`, name: `Команда ${teams.length + 1}`, color: COLORS[(teams.length + 3) % COLORS.length], emoji: '⭐', character: characters[teams.length % Math.max(1, characters.length)] ?? 'shrek.svg' }]);
            }}
          >
            ＋ команда
          </button>
        )}
      </div>
      <footer className="teams-foot">
        <button className="btn big" onClick={start} data-testid="btn-go">
          🧅 В путь!
        </button>
      </footer>
      {pick !== null && (
        <div className="char-picker" onClick={() => setPick(null)}>
          <div className="panel char-grid" onClick={(e) => e.stopPropagation()}>
            {characters.map((c) => (
              <button
                key={c}
                className={teams[pick].character === c ? 'on' : ''}
                onClick={() => {
                  upd(pick, { character: c });
                  setPick(null);
                  play('click');
                }}
              >
                <MediaImage kind="character" name={c} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
