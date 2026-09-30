import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGame, type PlayTeam } from '../store/game';
import { MediaImage } from '../components/common';
import { duckMusic, play } from '../audio/audio';
import { BigText, Stage } from './ui';
import type { MinigameProps } from './types';

type Mode = 'checking' | 'mic' | 'manual';

/** 8. Кричи громче: все команды по очереди кричат в микрофон, самая громкая получает луковицы */
export default function Shout(p: MinigameProps) {
  const pool = p.cfg.questions.shout;
  const phrase = useMemo(() => pool[useGame.getState().takeItems('shout', pool.length, 1)[0]].phrase, [pool]);
  // Первой кричит команда, которая пришла на Болото
  const order = useMemo(() => [p.team, ...p.teams.filter((t) => t.id !== p.team.id)], [p.team, p.teams]);
  const [mode, setMode] = useState<Mode>('checking');
  const [cur, setCur] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'count' | 'rec' | 'done'>('ready');
  const [count, setCount] = useState(3);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [live, setLive] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(16).fill(0));
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        const c = new AudioContext();
        const a = c.createAnalyser();
        a.fftSize = 1024;
        c.createMediaStreamSource(s).connect(a);
        ctx.current = c;
        analyser.current = a;
        setMode('mic');
      })
      .catch((e) => {
        window.api.log('warn', `Микрофон недоступен: ${String(e)}`);
        if (!cancelled) setMode('manual');
      }) ?? setMode('manual');
    duckMusic(true);
    return () => {
      cancelled = true;
      duckMusic(false);
      stream.current?.getTracks().forEach((t) => t.stop());
      void ctx.current?.close();
    };
  }, []);

  const team = order[cur];

  const record = () => {
    setPhase('count');
    setCount(3);
    let n = 3;
    const cd = setInterval(() => {
      n--;
      setCount(n);
      play('tick');
      if (n <= 0) {
        clearInterval(cd);
        startRec();
      }
    }, 800);
  };

  const startRec = () => {
    setPhase('rec');
    const a = analyser.current!;
    const time = new Float32Array(a.fftSize);
    const freq = new Uint8Array(a.frequencyBinCount);
    let peak = 0;
    const until = performance.now() + p.location.time * 1000;
    let raf = 0;
    let lastUi = 0;
    const tick = (t: number) => {
      a.getFloatTimeDomainData(time);
      let sum = 0;
      for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
      const db = 20 * Math.log10(Math.sqrt(sum / time.length) + 1e-9);
      const level = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
      peak = Math.max(peak, level);
      if (t - lastUi > 50) {
        // интерфейс обновляем 20 раз в секунду — этого хватает глазу
        lastUi = t;
        a.getByteFrequencyData(freq);
        const step = Math.floor(freq.length / 2 / 16);
        setBars(Array.from({ length: 16 }, (_, i) => freq[i * step] / 255));
        setLive(level);
      }
      if (t < until) raf = requestAnimationFrame(tick);
      else {
        cancelAnimationFrame(raf);
        save(Math.round(peak));
      }
    };
    raf = requestAnimationFrame(tick);
  };

  const save = (value: number) => {
    const next = { ...levels, [team.id]: value };
    setLevels(next);
    useGame.getState().setShoutLevel(team.id, value);
    setLive(0);
    setBars(Array(16).fill(0));
    play('land');
    if (cur + 1 < order.length) {
      setCur(cur + 1);
      setPhase('ready');
    } else {
      setPhase('done');
      decide(next);
    }
  };

  const decide = (lv: Record<string, number>) => {
    if (finished.current) return;
    finished.current = true;
    const max = Math.max(...Object.values(lv));
    const winners = order.filter((t) => lv[t.id] === max && max > 0);
    const awards = Object.fromEntries(winners.map((t) => [t.id, p.location.reward]));
    setTimeout(
      () =>
        p.onFinish({
          awards,
          success: winners.some((w) => w.id === p.team.id),
          perfect: false,
          summary: winners.length ? `Громче всех: ${winners.map((w) => w.name).join(', ')} (${max} из 100)` : 'Никого не было слышно…',
        }),
      2200,
    );
  };

  const manualWin = (t: PlayTeam) => {
    const lv = Object.fromEntries(order.map((x) => [x.id, x.id === t.id ? 100 : 50]));
    setLevels(lv);
    setPhase('done');
    decide(lv);
  };

  return (
    <Stage>
      <BigText>«{phrase}»</BigText>
      {mode === 'checking' && <div className="mg-label">Подключаю микрофон…</div>}

      {mode === 'mic' && (
        <>
          <div className="shout-teams">
            {order.map((t, i) => (
              <div key={t.id} className={`shout-team ${i === cur && phase !== 'done' ? 'cur' : ''}`} style={{ ['--tc' as string]: t.color }}>
                <MediaImage kind="character" name={t.character} className="shout-avatar" />
                <b>{t.name}</b>
                <div className="shout-bar">
                  <motion.div className="shout-fill" animate={{ scaleX: (i === cur && phase === 'rec' ? live : levels[t.id] ?? 0) / 100 }} transition={{ duration: 0.08 }} />
                </div>
                <span className="shout-val" data-testid={`level-${t.id}`}>
                  {levels[t.id] ?? '—'}
                </span>
              </div>
            ))}
          </div>
          {phase !== 'done' && (
            <div className="shout-center">
              {phase === 'ready' && (
                <button className="btn big" onClick={record} data-testid="btn-shout">
                  📣 {team.name}, готовы? Кричите!
                </button>
              )}
              {phase === 'count' && <div className="shout-count title-gold">{count || 'КРИЧИТЕ!'}</div>}
              {phase === 'rec' && (
                <div className="eq">
                  {bars.map((b, i) => (
                    <i key={i} style={{ transform: `scaleY(${0.05 + b})` }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mode === 'manual' && phase !== 'done' && (
        <div className="col" style={{ alignItems: 'center' }}>
          <div className="mg-label">🎤 Микрофон недоступен — ведущий оценивает на слух. Команды кричат по очереди, затем выберите самую громкую:</div>
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {order.map((t) => (
              <button key={t.id} className="btn" style={{ ['--b2' as string]: t.color }} onClick={() => manualWin(t)} data-testid={`manual-${t.id}`}>
                🏆 {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === 'mic' && phase !== 'done' && (
        <button className="btn ghost small" onClick={() => setMode('manual')}>
          Оценить вручную
        </button>
      )}
    </Stage>
  );
}
