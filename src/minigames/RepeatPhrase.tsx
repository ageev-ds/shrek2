import { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { mediaUrl } from '../store/config';
import { play, speak } from '../audio/audio';
import { MOODS } from '../shared/types';
import { BigText, Stage, Timer } from './ui';
import { scoreResult, type MinigameProps } from './types';

/** 3. Повтори фразу с интонацией: пример (файл или голос Windows) → команда говорит → оценка ведущего */
export default function RepeatPhrase(p: MinigameProps) {
  const pool = p.cfg.questions.repeat_phrase;
  const item = useMemo(() => pool[useGame.getState().takeItems('repeat_phrase', pool.length, 1)[0]], [pool]);
  const mood = MOODS[item.mood];
  const [done, setDone] = useState(false);
  const audioUrl = mediaUrl('voice', item.audio);

  const example = () => {
    if (audioUrl) {
      const a = new Audio(audioUrl);
      void a.play();
    } else if (!speak(item.phrase, mood.rate, mood.pitch)) play('reveal');
  };
  const rate = (score: 0 | 1 | 2) => {
    if (done) return;
    setDone(true);
    const summary = score === 2 ? 'Великолепная актёрская игра!' : score === 1 ? 'Неплохо, но можно ярче!' : 'Интонация не удалась';
    p.onFinish(scoreResult(p, score / 2, score === 2, summary, 0.5));
  };

  return (
    <Stage
      timer={<Timer seconds={p.location.time} running={!done} onExpire={() => undefined} />}
      footer={
        <>
          <button className="btn green" onClick={() => rate(2)} data-testid="rate-2">
            🌟 Блестяще
          </button>
          <button className="btn" onClick={() => rate(1)} data-testid="rate-1">
            👍 Неплохо (половина)
          </button>
          <button className="btn red" onClick={() => rate(0)} data-testid="rate-0">
            👎 Не получилось
          </button>
        </>
      }
    >
      <div className="mg-mood">
        <span className="mg-mood-emoji">{mood.emoji}</span>
        <span>
          Произнесите <b>{mood.label}</b>
          {item.character && <> — как {item.character}</>}
        </span>
      </div>
      <BigText>«{item.phrase}»</BigText>
      <button className="btn wood" onClick={example} data-testid="btn-example">
        ▶ Проиграть пример {audioUrl ? '' : '(голос компьютера)'}
      </button>
    </Stage>
  );
}
