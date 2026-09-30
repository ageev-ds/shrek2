import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/game';
import { MediaImage } from '../components/common';
import { play } from '../audio/audio';
import { BigText, Flash, Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 4. Найди лишнее: 5 картинок, одна попытка */
export default function OddOneOut(p: MinigameProps) {
  const pool = p.cfg.questions.odd_one_out;
  const item = useMemo(() => pool[useGame.getState().takeItems('odd_one_out', pool.length, 1)[0]], [pool]);
  const [picked, setPicked] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const started = useRef(performance.now());

  const choose = (i: number | null) => {
    if (over) return;
    setOver(true);
    setPicked(i);
    const ok = i === item.odd;
    play(ok ? 'correct' : 'wrong');
    const fast = (performance.now() - started.current) / 1000 < p.location.time / 2;
    const expl = item.explanation ? ` ${item.explanation}` : '';
    setTimeout(
      () => p.onFinish(scoreResult(p, ok ? 1 : 0, ok && fast, ok ? `Верно — лишнее: ${item.items[item.odd].label}.${expl}` : `Лишнее было: ${item.items[item.odd].label}.${expl}`)),
      1700,
    );
  };

  return (
    <Stage timer={<Timer seconds={p.location.time} running={!over} onExpire={() => choose(null)} />}>
      <BigText>{item.title}</BigText>
      <div className="mg-odd">
        {item.items.map((it, i) => (
          <motion.button
            key={i}
            className={`mg-odd-item ${over && i === item.odd ? 'ok' : ''} ${picked === i && i !== item.odd ? 'bad' : ''}`}
            onClick={() => choose(i)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={over ? undefined : { y: -6 }}
            data-testid={`odd-${i}`}
            data-correct={i === item.odd ? '1' : '0'}
          >
            <MediaImage kind="character" name={it.image} alt={it.label} />
            <span>{it.label}</span>
          </motion.button>
        ))}
      </div>
      <Flash kind={picked === null ? null : picked === item.odd ? 'ok' : 'bad'} />
    </Stage>
  );
}
