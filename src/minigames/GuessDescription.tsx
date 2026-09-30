import { useMemo, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { BigText, Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 1. Угадай по описанию: ведущий читает, команда угадывает, ведущий жмёт «Угадали» / «Не угадали» */
export default function GuessDescription(p: MinigameProps) {
  const pool = p.cfg.questions.guess_description;
  const item = useMemo(() => pool[useGame.getState().takeItems('guess_description', pool.length, 1)[0]], [pool]);
  const [answer, setAnswer] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);
  const started = useRef(performance.now());

  const finish = (ok: boolean) => {
    if (done !== null) return;
    setDone(ok);
    setAnswer(true);
    play(ok ? 'correct' : 'wrong');
    const fast = (performance.now() - started.current) / 1000 < p.location.time / 2;
    setTimeout(() => p.onFinish(scoreResult(p, ok ? 1 : 0, ok && fast, ok ? `Правильно: ${item.answer}${fast ? ' — и очень быстро!' : ''}` : `Это был(а): ${item.answer}`)), 1600);
  };

  return (
    <Stage
      timer={<Timer seconds={p.location.time} running={done === null} onExpire={() => finish(false)} />}
      footer={
        <>
          <button className="btn green big" disabled={done !== null} onClick={() => finish(true)} data-testid="btn-yes">
            ✅ Угадали
          </button>
          <button className="btn red big" disabled={done !== null} onClick={() => finish(false)} data-testid="btn-no">
            ❌ Не угадали
          </button>
          {!answer && (
            <button className="btn ghost small" onClick={() => setAnswer(true)}>
              👁 Подсказка ведущему
            </button>
          )}
        </>
      }
    >
      <div className="mg-label">Ведущий читает вслух. Кто это?</div>
      <BigText>«{item.text}»</BigText>
      {answer && <div className={`mg-answer ${done === false ? 'bad' : ''}`}>Ответ: {item.answer}</div>}
    </Stage>
  );
}
