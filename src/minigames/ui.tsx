// Общие детали оформления мини-игр
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Timer } from '../components/common';

export function Stage({ timer, children, footer }: { timer?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mg-stage">
      <div className="mg-top">{timer}</div>
      <div className="mg-center">{children}</div>
      {footer && <div className="mg-footer">{footer}</div>}
    </div>
  );
}

export function Progress({ total, index, marks }: { total: number; index: number; marks: (boolean | null)[] }) {
  return (
    <div className="mg-progress">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`dot ${i === index ? 'cur' : ''} ${marks[i] === true ? 'ok' : marks[i] === false ? 'bad' : ''}`} />
      ))}
    </div>
  );
}

export function BigText({ children, k }: { children: ReactNode; k?: unknown }) {
  return (
    <motion.div key={String(k)} className="mg-bigtext" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}

export function Flash({ kind }: { kind: 'ok' | 'bad' | null }) {
  if (!kind) return null;
  return <motion.div key={Math.random()} className={`mg-flash ${kind}`} initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />;
}

export { Timer };
