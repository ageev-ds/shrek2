import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 7. Собери слово: кликайте буквы по порядку. Неверная буква не принимается и считается ошибкой. */
export default function WordBuilder(p: MinigameProps) {
  const pool = p.cfg.questions.word_builder;
  const item = useMemo(() => pool[useGame.getState().takeItems('word_builder', pool.length, 1)[0]], [pool]);
  const word = item.word.toUpperCase();
  const tiles = useMemo(() => {
    const t = [...word].map((ch, i) => ({ ch, id: i }));
    for (let k = 0; k < 20; k++) {
      for (let i = t.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [t[i], t[j]] = [t[j], t[i]];
      }
      if (t.map((x) => x.ch).join('') !== word) break;
    }
    return t;
  }, [word]);
  const [used, setUsed] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const built = used.map((id) => tiles.find((t) => t.id === id)!.ch).join('');

  const end = (ok: boolean, m: number) => {
    if (over) return;
    setOver(true);
    play(ok ? 'correct' : 'wrong');
    setTimeout(() => p.onFinish(scoreResult(p, ok ? 1 : 0, ok && m === 0, ok ? `Слово собрано: ${word}${m ? ` (ошибок: ${m})` : ' — без единой ошибки!'}` : `Не успели. Слово: ${word}`)), 1400);
  };
  const click = (id: number) => {
    if (over || used.includes(id)) return;
    const ch = tiles.find((t) => t.id === id)!.ch;
    if (ch === word[built.length]) {
      play('hop');
      const next = [...used, id];
      setUsed(next);
      if (next.length === word.length) end(true, mistakes);
    } else {
      play('wrong');
      setMistakes(mistakes + 1);
      setShake(id);
      setTimeout(() => setShake(null), 400);
    }
  };

  return (
    <Stage
      timer={<Timer seconds={p.location.time} running={!over} onExpire={() => end(false, mistakes)} />}
      footer={
        <button className="btn wood" onClick={() => setUsed(used.slice(0, -1))} disabled={!used.length || over}>
          ⌫ Убрать букву
        </button>
      }
    >
      <div className="mg-label">Подсказка: {item.hint || 'персонаж Шрека'}</div>
      <div className="mg-word" data-testid="word-built">
        {[...word].map((_, i) => (
          <span key={i} className={`slot ${built[i] ? 'filled' : ''}`}>
            {built[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="mg-tiles">
        {tiles.map((t) => (
          <motion.button
            key={t.id}
            className={`tile ${used.includes(t.id) ? 'used' : ''}`}
            onClick={() => click(t.id)}
            animate={shake === t.id ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            data-testid="tile"
            data-ch={t.ch}
          >
            {t.ch}
          </motion.button>
        ))}
      </div>
      {mistakes > 0 && <div className="muted">Ошибок: {mistakes}</div>}
    </Stage>
  );
}
