import { useState } from 'react';
import { startAudio, type LiveAudio } from './audio/live';
import { UpdatePrompt } from './ui/components/UpdatePrompt';
import { useRoute, type Navigate, type Route } from './ui/router';
import { Explore } from './ui/screens/Explore';
import { Home } from './ui/screens/Home';
import { Start } from './ui/screens/Start';

const TABS: readonly { readonly label: string; readonly route: Route }[] = [
  { label: 'Home', route: { name: 'home' } },
  { label: 'Explore', route: { name: 'explore' } },
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
      {route.name === 'explore' ? <Explore audio={audio} /> : <Home navigate={navigate} />}
    </>
  );
}
