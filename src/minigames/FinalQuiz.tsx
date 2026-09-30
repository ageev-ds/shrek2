import { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { MediaImage } from '../components/common';
import { play } from '../audio/audio';
import { BigText, Progress, Stage, Timer } from './ui';
import type { MinigameProps } from './types';

/** 9. Финальный квиз: 3 вопроса по 10 с, отвечает тот, кто первым крикнул. Очки — ответившей команде. */
export default function FinalQuiz(p: MinigameProps) {
  const pool = p.cfg.questions.final_quiz;
  const items = useMemo(() => useGame.getState().takeItems('final_quiz', pool.length, p.cfg.game.finalCount).map((i) => pool[i]), [pool, p.cfg.game.finalCount]);
  const share = Math.round(p.location.reward / items.length / 10) * 10;
  const [idx, setIdx] = useState(0);
  const [who, setWho] = useState<string | null>(null);
  const [marks, setMarks] = useState<(boolean | null)[]>(items.map(() => null));
  const [awards, setAwards] = useState<Record<string, number>>({});
  const [reveal, setReveal] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const it = items[idx];

  const next = (ok: boolean | null, a: Record<string, number>) => {
    const m = marks.map((x, j) => (j === idx ? ok : x));
    setMarks(m);
    setReveal(true);
    setTimeout(() => {
      setReveal(false);
      setWho(null);
      setTimeUp(false);
      if (idx + 1 < items.length) setIdx(idx + 1);
      else {
        const right = m.filter((x) => x === true).length;
        const top = Object.entries(a).sort((x, y) => y[1] - x[1])[0];
        const leader = p.teams.find((t) => t.id === top?.[0]);
        p.onFinish({
          awards: a,
          success: (a[p.team.id] ?? 0) > 0,
          perfect: false,
          summary: `Верных ответов: ${right} из ${items.length}${leader ? `. Больше всех — ${leader.name}` : ''}`,
        });
      }
    }, 1800);
  };
  const judge = (ok: boolean) => {
    if (!who || reveal) return;
    play(ok ? 'correct' : 'wrong');
    const a = ok ? { ...awards, [who]: (awards[who] ?? 0) + share } : awards;
    setAwards(a);
    next(ok, a);
  };

  return (
    <Stage
      timer={<Timer seconds={p.location.time} running={!who && !reveal && !timeUp} onExpire={() => setTimeUp(true)} resetKey={idx} />}
      footer={
        who ? (
          <>
            <button className="btn green big" onClick={() => judge(true)} disabled={reveal} data-testid="btn-right">
              ✔ Верно (+{share})
            </button>
            <button className="btn red big" onClick={() => judge(false)} disabled={reveal} data-testid="btn-wrong">
              ✘ Неверно
            </button>
            <button className="btn ghost small" onClick={() => setWho(null)} disabled={reveal}>
              ↶ Другая команда
            </button>
          </>
        ) : (
          <button className="btn wood" onClick={() => (play('wrong'), next(null, awards))} disabled={reveal} data-testid="btn-skip">
            Никто не ответил
          </button>
        )
      }
    >
      <Progress total={items.length} index={idx} marks={marks} />
      <div className="mg-label">Вопрос {idx + 1} из {items.length} · кто первым крикнет «Знаю!» — отвечает</div>
      <BigText k={idx}>{it.q}</BigText>
      {timeUp && !who && <div className="mg-answer bad">Время вышло! Кто-нибудь успел?</div>}
      {!reveal && (
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {p.teams.map((t) => (
            <button key={t.id} className={`fq-team ${who === t.id ? 'on' : ''}`} style={{ ['--tc' as string]: t.color }} onClick={() => (play('click'), setWho(t.id))} data-testid={`who-${t.id}`}>
              <MediaImage kind="character" name={t.character} className="fq-avatar" />
              {t.name}
              {awards[t.id] ? <span className="fq-pts">+{awards[t.id]}</span> : null}
            </button>
          ))}
        </div>
      )}
      {reveal && <div className="mg-answer">Ответ: {it.answer}</div>}
    </Stage>
  );
}
