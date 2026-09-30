import { useMemo, useRef, useState } from 'react';
import { useGame } from '../store/game';
import { play } from '../audio/audio';
import { BigText, Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 5. Изобрази персонажа: карточку видит только показывающий (открывается удержанием) */
export default function Charades(p: MinigameProps) {
  const pool = p.cfg.questions.charades;
  const item = useMemo(() => pool[useGame.getState().takeItems('charades', pool.length, 1)[0]], [pool]);
  const [peek, setPeek] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);
  const started = useRef(0);

  const finish = (ok: boolean) => {
    if (done !== null) return;
    setDone(ok);
    setRunning(false);
    play(ok ? 'correct' : 'wrong');
    const fast = (performance.now() - started.current) / 1000 < p.location.time / 2;
    setTimeout(() => p.onFinish(scoreResult(p, ok ? 1 : 0, ok && fast, ok ? `Угадали: ${item.character}!` : `Это был(а): ${item.character}`)), 1500);
  };

  return (
    <Stage
      timer={<Timer seconds={p.location.time} running={running} onExpire={() => finish(false)} />}
      footer={
        running ? (
          <>
            <button className="btn green big" onClick={() => finish(true)} data-testid="btn-yes">
              ✅ Угадали
            </button>
            <button className="btn red big" onClick={() => finish(false)} data-testid="btn-no">
              ❌ Не угадали
            </button>
          </>
        ) : done === null ? (
          <button
            className="btn big"
            onClick={() => {
              setPeek(false);
              setRunning(true);
              started.current = performance.now();
              play('click');
            }}
            data-testid="btn-go"
          >
            ▶ Показывающий готов — время пошло!
          </button>
        ) : null
      }
    >
      <div className="mg-label">Позовите одного игрока к экрану. Остальные — отвернитесь!</div>
      <button
        className={`mg-card ${peek || done !== null ? 'open' : ''}`}
        onMouseDown={() => setPeek(true)}
        onMouseUp={() => setPeek(false)}
        onMouseLeave={() => setPeek(false)}
        onTouchStart={() => setPeek(true)}
        onTouchEnd={() => setPeek(false)}
        data-testid="card"
      >
        {peek || done !== null ? (
          <>
            <BigText>{item.character}</BigText>
            {item.hint && <span className="mg-hint">{item.hint}</span>}
          </>
        ) : (
          <span>🤫 Зажмите карточку, чтобы подсмотреть</span>
        )}
      </button>
      {running && <div className="mg-label">Только жесты и мимика — без слов!</div>}
    </Stage>
  );
}
