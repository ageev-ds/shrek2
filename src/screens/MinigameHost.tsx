import { lazy, Suspense, useMemo } from 'react';
import { MediaImage, Scoreboard } from '../components/common';
import { useCfg } from '../store/config';
import { activeTeam, useGame } from '../store/game';
import { GAME_TYPES, type GameType, type MinigameResult } from '../shared/types';
import type { MinigameProps } from '../minigames/types';
import { play } from '../audio/audio';
import './screens.css';
import '../minigames/minigames.css';

// Каждая мини-игра — отдельный чанк, грузится только когда нужна
const GAMES: Record<GameType, React.LazyExoticComponent<(p: MinigameProps) => JSX.Element>> = {
  guess_description: lazy(() => import('../minigames/GuessDescription')),
  quick_questions: lazy(() => import('../minigames/QuickQuestions')),
  repeat_phrase: lazy(() => import('../minigames/RepeatPhrase')),
  odd_one_out: lazy(() => import('../minigames/OddOneOut')),
  charades: lazy(() => import('../minigames/Charades')),
  true_false: lazy(() => import('../minigames/TrueFalse')),
  word_builder: lazy(() => import('../minigames/WordBuilder')),
  shout: lazy(() => import('../minigames/Shout')),
  final_quiz: lazy(() => import('../minigames/FinalQuiz')),
};

export function MinigameHost() {
  const cfg = useCfg();
  const locId = useGame((s) => s.currentLocation);
  const team = useGame(activeTeam);
  const teams = useGame((s) => s.teams);
  const finish = useGame((s) => s.finishMinigame);
  const loc = cfg.locations.find((l) => l.id === locId);
  const Game = loc ? GAMES[loc.game] : null;
  const type = GAME_TYPES.find((g) => g.id === loc?.game);

  const onFinish = useMemo(
    () => (r: MinigameResult) => {
      play(r.success ? 'correct' : 'wrong');
      finish(r);
    },
    [finish],
  );
  if (!loc || !team || !Game) return null;
  return (
    <div className="screen minigame">
      <header className="mg-head">
        <MediaImage kind="map" name={loc.icon} className="mg-loc-icon" />
        <div>
          <h2 className="title-gold">{loc.name}</h2>
          <span className="muted">
            {type?.icon} {type?.title}
          </span>
        </div>
        <div className="spacer" />
        <Scoreboard activeId={team.id} />
      </header>
      <main className="mg-body" data-testid={`minigame-${loc.game}`}>
        <Suspense fallback={null}>
          <Game location={loc} team={team} teams={teams} cfg={cfg} onFinish={onFinish} />
        </Suspense>
      </main>
    </div>
  );
}
