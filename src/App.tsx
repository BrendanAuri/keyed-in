import { UpdatePrompt } from './ui/components/UpdatePrompt';
import { Home } from './ui/screens/Home';

export function App() {
  return (
    <>
      <header className="app-bar">
        <h1 className="app-title">Keyed In</h1>
      </header>
      <Home />
      <UpdatePrompt />
    </>
  );
}
