import { VideoPlayer } from '../components/common';
import { useCfg } from '../store/config';
import { useGame } from '../store/game';

/** Вступительный ролик (если файла нет — сразу на карту) */
export function IntroScreen() {
  const cfg = useCfg();
  const go = useGame((s) => s.go);
  return (
    <div className="screen" style={{ background: '#000' }}>
      <VideoPlayer name={cfg.game.introVideo} onEnd={() => go('map')} />
    </div>
  );
}
