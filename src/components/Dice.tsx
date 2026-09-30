// 3D-кубик на CSS transform: одна transition на весь бросок — почти бесплатно для процессора.
import { useEffect, useRef, useState } from 'react';
import { play } from '../audio/audio';
import './Dice.css';

// Поворот куба, при котором грань N смотрит на зрителя
const FACE: Record<number, [number, number]> = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function Dice({ value, rolling, onDone }: { value: number; rolling: boolean; onDone?: () => void }) {
  const [rot, setRot] = useState<[number, number]>([-20, 20]);
  const spins = useRef(0);
  useEffect(() => {
    if (!rolling) return;
    play('dice');
    spins.current += 2;
    const [x, y] = FACE[value];
    setRot([x + 360 * spins.current, y + 360 * (spins.current + 1)]);
    const t = setTimeout(() => {
      play('land');
      onDone?.();
    }, 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling, value]);
  return (
    <div className="dice-scene" data-testid="dice" data-value={rolling ? '' : value}>
      <div className="dice" style={{ transform: `rotateX(${rot[0]}deg) rotateY(${rot[1]}deg)` }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className={`face f${n}`}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={PIPS[n].includes(i) ? 'pip' : ''} />
            ))}
          </div>
        ))}
      </div>
      <div className="dice-shadow" />
    </div>
  );
}
