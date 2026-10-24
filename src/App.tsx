import { useState } from 'react';
import { startAudio, type LiveAudio } from './audio/live';
import { UpdatePrompt } from './ui/components/UpdatePrompt';
import { useRoute, type Navigate, type Route } from './ui/router';
import { Drill } from './ui/screens/Drill';
import { Explore } from './ui/screens/Explore';
import { Home } from './ui/screens/Home';
import { Learn } from './ui/screens/Learn';
import { Level } from './ui/screens/Level';
import { Placement } from './ui/screens/Placement';
import { ScaleFinder } from './ui/screens/ScaleFinder';
import { ScaleGuide } from './ui/screens/ScaleGuide';
import { Start } from './ui/screens/Start';

const TABS: readonly { readonly label: string; readonly route: Route }[] = [
  { label: 'Home', route: { name: 'home' } },
  { label: 'Explore', route: { name: 'explore' } },
  { label: 'Finder', route: { name: 'finder' } },
  { label: 'Guide', route: { name: 'guide' } },
];

export function App() {
  const [route, navigate] = useRoute();
  const [audio, setAudio] = useState<LiveAudio | null>(null);
  const [error, setError] = useState<string | null>(null);

  function start(): void {
    setError(null);
    startAudio().then(setAudio, (reason: unknown) => {
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }

  return (
    <>
      {audio ? <MainApp route={route} navigate={navigate} audio={audio} /> : <Start onStart={start} error={error} />}
      <UpdatePrompt />
    </>
  );
}

function MainApp({ route, navigate, audio }: { readonly route: Route; readonly navigate: Navigate; readonly audio: LiveAudio }) {
  return (
    <>
      <header className="app-bar">
        <button type="button" className="app-title" onClick={() => navigate({ name: 'home' })}>
          Keyed In
        </button>
        <nav className="tabs" aria-label="Screens">
          {TABS.map((tab) => {
            const current = tab.route.name === route.name;
            return (
              <button
                key={tab.label}
                type="button"
                className={current ? 'tab current' : 'tab'}
                aria-current={current ? 'page' : undefined}
                onClick={() => navigate(tab.route)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>
      <Screen route={route} navigate={navigate} audio={audio} />
    </>
  );
}

function Screen({ route, navigate, audio }: { readonly route: Route; readonly navigate: Navigate; readonly audio: LiveAudio }) {
  switch (route.name) {
    case 'home':
      return <Home navigate={navigate} />;
    case 'learn':
      return route.pack && route.level ? <Level audio={audio} navigate={navigate} packId={route.pack} levelId={route.level} /> : <Learn navigate={navigate} />;
    case 'placement':
      return <Placement audio={audio} navigate={navigate} />;
    case 'drill':
      return <Drill audio={audio} />;
    case 'explore':
      return <Explore audio={audio} navigate={navigate} />;
    case 'finder':
      return <ScaleFinder audio={audio} navigate={navigate} />;
    case 'guide':
      return <ScaleGuide audio={audio} navigate={navigate} rootParam={route.root} scaleParam={route.scale} />;
  }
}
