import { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import { BigText, Flash, Progress, Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 6. Правда или ложь: 5 утверждений, общий таймер */
export default function TrueFalse(p: MinigameProps) {
  const pool = p.cfg.questions.true_false;
  const items = useMemo(() => useGame.getState().takeItems('true_false', pool.length, p.cfg.game.trueFalseCount).map((i) => pool[i]), [pool, p.cfg.game.trueFalseCount]);
  const [idx, setIdx] = useState(0);
  const [marks, setMarks] = useState<(boolean | null)[]>(items.map(() => null));
  const [shown, setShown] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const it = items[idx];

  const end = (m: (boolean | null)[]) => {
    if (over) return;
    setOver(true);
    const right = m.filter((x) => x === true).length;
    setTimeout(() => p.onFinish(scoreResult(p, right / items.length, right === items.length, `Верных ответов: ${right} из ${items.length}`)), 900);
  };
  const answer = (v: boolean) => {
    if (shown !== null || over) return;
    const ok = v === it.answer;
    play(ok ? 'correct' : 'wrong');
    setFlash(ok ? 'ok' : 'bad');
    const m = marks.map((x, j) => (j === idx ? ok : x));
    setMarks(m);
    setShown(`${it.answer ? 'Правда' : 'Ложь'}. ${it.explanation}`);
    setTimeout(() => {
      setShown(null);
      setFlash(null);
      if (idx + 1 >= items.length) end(m);
      else setIdx(idx + 1);
    }, 1400);
  };
  useHotkey('arrowleft', () => answer(true));
  useHotkey('arrowright', () => answer(false));

  return (
    <Stage
      timer={<Timer seconds={p.location.time} running={!over} onExpire={() => end(marks)} />}
      footer={
        <>
          <button className="btn green big" onClick={() => answer(true)} disabled={shown !== null} data-testid="btn-true" data-answer={String(it.answer)}>
            ✔ Правда
          </button>
          <button className="btn red big" onClick={() => answer(false)} disabled={shown !== null} data-testid="btn-false">
            ✘ Ложь
          </button>
        </>
      }
    >
      <Progress total={items.length} index={idx} marks={marks} />
      <BigText k={idx}>{it.statement}</BigText>
      {shown && <div className={`mg-answer ${marks[idx] ? '' : 'bad'}`}>{shown}</div>}
      <Flash kind={flash} />
    </Stage>
  );
}
