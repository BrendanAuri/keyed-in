interface StartProps {
  readonly onStart: () => void;
  readonly error: string | null;
}

/** First screen. The tap starts audio, which mobile browsers only allow after a tap. */
export function Start({ onStart, error }: StartProps) {
  return (
    <main className="start">
      <h1 className="start-title">Keyed In</h1>
      <p className="start-tagline">Learn chords and scales, from the very beginning.</p>
      <button type="button" className="button primary start-button" onClick={onStart}>
        Tap to start
      </button>
      {error && (
        <p className="start-error" role="alert">
          Couldn't start audio: {error}
        </p>
      )}
      <ul className="start-tips">
        <li>No sound on a phone? Check the silent switch and the volume.</li>
        <li>Headphones help you hear every note of a chord.</li>
      </ul>
    </main>
  );
}
