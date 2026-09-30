import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState } from 'react';
import { mediaUrl, mediaUrlAny, useConfig } from './store/config';
import { useGame, type Screen } from './store/game';
import { initAudio, setVolumes, startMusic } from './audio/audio';
import { MuteButton, Warnings } from './components/common';
import { StartScreen } from './screens/StartScreen';
import { TeamSetup } from './screens/TeamSetup';
import { IntroScreen } from './screens/IntroScreen';
import { MapScreen } from './screens/MapScreen';
import { LocationScreen } from './screens/LocationScreen';
import { MinigameHost } from './screens/MinigameHost';
import { ResultScreen } from './screens/ResultScreen';

// Редкие экраны грузятся лениво — меньше работы при старте
const FinaleScreen = lazy(() => import('./screens/FinaleScreen'));
const EditorScreen = lazy(() => import('./editor/EditorScreen'));

const SCREENS: Record<Screen, React.ComponentType> = {
  start: StartScreen,
  teams: TeamSetup,
  intro: IntroScreen,
  map: MapScreen,
  location: LocationScreen,
  minigame: MinigameHost,
  result: ResultScreen,
  finale: FinaleScreen,
  editor: EditorScreen,
};

export function App() {
  const assets = useConfig((s) => s.assets);
  const load = useConfig((s) => s.load);
  const screen = useGame((s) => s.screen);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, [load]);

  // Звук и музыка — после загрузки конфигов (там громкость и имя файла музыки)
  useEffect(() => {
    if (!assets) return;
    const g = assets.config.game;
    setVolumes(g.sfxVolume, g.musicVolume);
    void initAudio((id) => mediaUrlAny('sfx', id)).then(() => startMusic(mediaUrl('music', g.music)));
  }, [assets]);

  if (error)
    return (
      <div className="screen" style={{ placeItems: 'center', display: 'grid', padding: 30, textAlign: 'center' }}>
        <div className="panel" style={{ padding: 30, maxWidth: 700 }}>
          <h2 className="title-gold">Не удалось запустить игру</h2>
          <p>{error}</p>
          <p className="muted">Подробности — в %APPDATA%\shrek-path\logs\main.log</p>
        </div>
      </div>
    );
  if (!assets)
    return (
      <div className="screen" style={{ display: 'grid', placeItems: 'center', fontSize: '4rem' }}>
        <span style={{ animation: 'spin 1.4s linear infinite', display: 'inline-block' }}>🧅</span>
      </div>
    );

  const Current = SCREENS[screen];
  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="screen"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Suspense fallback={null}>
            <Current />
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <MuteButton />
      <Warnings list={assets.warnings} />
    </>
  );
}
