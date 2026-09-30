import type { AllConfig, Location, MinigameResult } from '../shared/types';
import type { PlayTeam } from '../store/game';

/** Контракт мини-игры: получает данные из конфига, возвращает результат через onFinish */
export interface MinigameProps {
  location: Location;
  team: PlayTeam;
  teams: PlayTeam[];
  cfg: AllConfig;
  onFinish: (r: MinigameResult) => void;
}

/** Результат для одной команды: очки пропорционально доле верного + бонус за идеал */
export function scoreResult(p: MinigameProps, fraction: number, perfect: boolean, summary: string, successThreshold = 0.5): MinigameResult {
  const base = Math.round((p.location.reward * Math.max(0, Math.min(1, fraction))) / 10) * 10;
  const bonus = perfect ? p.cfg.game.perfectBonus : 0;
  return { awards: { [p.team.id]: base + bonus }, success: fraction >= successThreshold && base > 0, perfect, summary };
}
