import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mediaUrl, type MediaKind } from '../store/config';
import { useGame } from '../store/game';
import { duckMusic, isMuted, onMuteChange, play, setMuted } from '../audio/audio';
import { useHotkey } from '../hooks/useHotkey';
import './common.css';

/** Лёгкие частицы-светлячки на чистом CSS */
export function Particles({ count = 12 }: { count?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        dur: `${9 + ((i * 7) % 8)}s`,
        delay: `${-((i * 13) % 17)}s`,
        dx: `${((i * 37) % 80) - 40}px`,
        size: 3 + (i % 3) * 2,
      })),
    [count],
  );
  return (
    <div className="particles" aria-hidden>
      {items.map((p, i) => (
        <i key={i} style={{ left: p.left, animationDuration: p.dur, animationDelay: p.delay, width: p.size, height: p.size, ['--dx' as string]: p.dx }} />
      ))}
    </div>
  );
}

/** Картинка из assets. Если файла нет — аккуратная SVG-заглушка с подписью. */
export function MediaImage({ kind, name, alt = '', className = '', style }: { kind: MediaKind; name: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  const url = mediaUrl(kind, name);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [url]);
  if (!url || broken) return <Placeholder label={alt || name} className={className} style={style} />;
  return <img src={url} alt={alt} className={className} style={style} draggable={false} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}

export function Placeholder({ label, className = '', style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} role="img" aria-label={label}>
      <circle cx="50" cy="50" r="47" fill="#3a5a2b" stroke="#d4a017" strokeWidth="3" />
      <circle cx="50" cy="40" r="15" fill="#6b8e23" />
      <path d="M22 84 C24 64 36 58 50 58 C64 58 76 64 78 84Z" fill="#6b8e23" />
      <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="900" fill="#f5e6c8">?</text>
    </svg>
  );
}

/** Полноэкранное видео из assets/videos. Нет файла — сразу onEnd. Клик/Esc/Пробел — пропустить. */
export function VideoPlayer({ name, onEnd, caption }: { name: string; onEnd: () => void; caption?: string }) {
  const url = mediaUrl('video', name);
  const ended = useRef(false);
  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    duckMusic(false);
    onEnd();
  };
  useEffect(() => {
    if (!url) finish();
    else duckMusic(true);
    return () => duckMusic(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  useHotkey('escape', finish, !!url);
  useHotkey('space', finish, !!url);
  if (!url) return null;
  return (
    <div className="video-layer" onClick={finish} data-testid="video">
      <video src={url} autoPlay playsInline preload="auto" muted={isMuted()} onEnded={finish} onError={finish} />
      <div className="video-skip">
        {caption && <span>{caption}</span>} Нажмите, чтобы пропустить <kbd>Пробел</kbd>
      </div>
    </div>
  );
}

export function MuteButton() {
  const [muted, set] = useState(isMuted());
  useEffect(() => {
    const off = onMuteChange(set);
    return () => void off();
  }, []);
  useHotkey('m', () => setMuted(!isMuted()));
  useHotkey('ь', () => setMuted(!isMuted()));
  return (
    <button className="icon-btn mute-btn" onClick={() => setMuted(!muted)} title="Звук вкл/выкл (M)" data-testid="mute">
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** Счёт команд: 3 плашки с луковицами */
export function Scoreboard({ activeId }: { activeId?: string }) {
  const teams = useGame((s) => s.teams);
  return (
    <div className="scoreboard" data-testid="scoreboard">
      {teams.map((t) => (
        <div key={t.id} className={`score ${t.id === activeId ? 'active' : ''}`} style={{ ['--tc' as string]: t.color }} data-testid={`score-${t.id}`}>
          <MediaImage kind="character" name={t.character} className="score-avatar" alt={t.name} />
          <div className="score-body">
            <span className="score-name">{t.name}</span>
            <span className="score-value">
              🧅 <Counter value={t.score} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Число, которое «докручивается» (обновление ~20 раз в секунду, только на время изменения) */
function Counter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span data-testid="score-value">{shown}</span>;
}

/** Круговой таймер. Тикает последние 5 секунд. */
export function Timer({ seconds, running, onExpire, size = 110, resetKey }: { seconds: number; running: boolean; onExpire: () => void; size?: number; resetKey?: unknown }) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire);
  cb.current = onExpire;
  const leftRef = useRef(seconds);
  useEffect(() => {
    leftRef.current = seconds;
    setLeft(seconds);
  }, [seconds, resetKey]);
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let lastWhole = Math.ceil(leftRef.current);
    const id = setInterval(() => {
      const now = performance.now();
      leftRef.current = Math.max(0, leftRef.current - (now - last) / 1000);
      last = now;
      setLeft(leftRef.current);
      const whole = Math.ceil(leftRef.current);
      if (whole !== lastWhole) {
        lastWhole = whole;
        if (whole <= 5 && whole > 0) play('tick');
      }
      if (leftRef.current <= 0) {
        clearInterval(id);
        play('timeUp');
        cb.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, resetKey]);
  const r = 44;
  const c = 2 * Math.PI * r;
  const frac = seconds > 0 ? left / seconds : 0;
  const color = left <= 3 ? '#e8604f' : left <= 7 ? '#f39c12' : '#f1c94b';
  return (
    <div className={`timer ${left <= 5 && running ? 'urgent' : ''}`} style={{ width: size, height: size }} data-testid="timer">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="48" fill="rgba(30,18,11,0.92)" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 50 50)" />
      </svg>
      <span style={{ color, fontSize: size * 0.36 }}>{Math.ceil(left)}</span>
    </div>
  );
}

/** Жёлтая плашка с предупреждениями о конфигах */
export function Warnings({ list }: { list: string[] }) {
  const [open, setOpen] = useState(true);
  if (!list.length) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="warnings" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} data-testid="warnings">
          <b>⚠ Проблемы с файлами в assets ({list.length}):</b>
          <ul>
            {list.slice(0, 5).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {list.length > 5 && <li>…и ещё {list.length - 5} — подробности в логе</li>}
          </ul>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, children, onClose, width = 560 }: { open: boolean; children: ReactNode; onClose?: () => void; width?: number }) {
  useHotkey('escape', () => onClose?.(), open && !!onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
          <motion.div className="modal panel" style={{ width }} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, title, text, ok, onOk, onCancel }: { open: boolean; title: string; text?: string; ok: string; onOk: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} width={500}>
      <div className="col" style={{ textAlign: 'center', gap: '1.1rem' }}>
        <h2 className="title-gold" style={{ fontSize: '2rem' }}>
          {title}
        </h2>
        {text && <p style={{ margin: 0 }}>{text}</p>}
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn wood" onClick={onCancel}>
            Отмена
          </button>
          <button className="btn" onClick={onOk} autoFocus>
            {ok}
          </button>
        </div>
      </div>
    </Modal>
  );
}
