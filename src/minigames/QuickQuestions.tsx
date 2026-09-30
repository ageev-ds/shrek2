import { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import { BigText, Flash, Progress, Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 2. Быстрые вопросы: 5 вопросов × 4 варианта, общий таймер */
export default function QuickQuestions(p: MinigameProps) {
  const pool = p.cfg.questions.quick_questions;
  const items = useMemo(() => useGame.getState().takeItems('quick_questions', pool.length, p.cfg.game.quickCount).map((i) => pool[i]), [pool, p.cfg.game.quickCount]);
  const [idx, setIdx] = useState(0);
  const [marks, setMarks] = useState<(boolean | null)[]>(items.map(() => null));
  const [picked, setPicked] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const q = items[idx];

  const end = (m: (boolean | null)[]) => {
    if (over) return;
    setOver(true);
    const right = m.filter((x) => x === true).length;
    setTimeout(() => p.onFinish(scoreResult(p, right / items.length, right === items.length, `Верных ответов: ${right} из ${items.length}`)), 900);
  };

  const answer = (i: number) => {
    if (picked !== null || over) return;
    const ok = i === q.correct;
    setPicked(i);
    setFlash(ok ? 'ok' : 'bad');
    play(ok ? 'correct' : 'wrong');
    const m = marks.map((x, j) => (j === idx ? ok : x));
    setMarks(m);
    setTimeout(() => {
      setPicked(null);
      setFlash(null);
      if (idx + 1 >= items.length) end(m);
      else setIdx(idx + 1);
    }, 900);
  };
  useHotkey('1', () => answer(0));
  useHotkey('2', () => answer(1));
  useHotkey('3', () => answer(2));
  useHotkey('4', () => answer(3));

  return (
    <Stage timer={<Timer seconds={p.location.time} running={!over} onExpire={() => end(marks)} />}>
      <Progress total={items.length} index={idx} marks={marks} />
      <BigText k={idx}>{q.q}</BigText>
      <div className="mg-options">
        {q.options.map((o, i) => (
          <button
            key={i}
            className={`mg-option ${picked !== null && i === q.correct ? 'ok' : ''} ${picked === i && i !== q.correct ? 'bad' : ''}`}
            onClick={() => answer(i)}
            data-testid={`opt-${i}`}
            data-correct={i === q.correct ? '1' : '0'}
          >
            <span className="mg-key">{i + 1}</span> {o}
          </button>
        ))}
      </div>
      <Flash kind={flash} />
    </Stage>
  );
}
