import { Fragment, type CSSProperties } from 'react';
import { circleOfFifths, keyName, keySignature, type Key } from '../../theory/keys';
import { formatNote } from '../../theory/notes';

/**
 * Where the major and minor keys sit, as % of the circle's width from its
 * centre. With the button sizes in styles.css (18 % and 11.5 %), neighbours
 * and the two rings never touch, even at 320 px.
 */
const MAJOR_RADIUS = 42;
const MINOR_RADIUS = 24;

/** "2♯", "3♭", or nothing for C major and A minor. */
function signatureText(k: Key): string {
  const count = keySignature(k);
  return count > 0 ? `${count}♯` : count < 0 ? `${-count}♭` : '';
}

function signatureWords(k: Key): string {
  const count = keySignature(k);
  if (count === 0) return 'no sharps or flats';
  const word = count > 0 ? 'sharp' : 'flat';
  return `${Math.abs(count)} ${word}${Math.abs(count) === 1 ? '' : 's'}`;
}

function position(index: number, count: number, radius: number): CSSProperties {
  // Clockwise from the top.
  const angle = (index / count) * 2 * Math.PI;
  return { left: `${50 + radius * Math.sin(angle)}%`, top: `${50 - radius * Math.cos(angle)}%` };
}

/**
 * The circle of fifths (SPEC §13): major keys round the outside, their relative
 * minors inside, each step clockwise adding a sharp. Tapping a key picks it.
 */
export function CircleOfFifths({ onPick }: { readonly onPick: (k: Key) => void }) {
  const steps = circleOfFifths();
  return (
    <div className="circle" role="group" aria-label="Circle of fifths">
      <div className="circle-ring" aria-hidden="true" />
      {steps.map((step, i) => {
        const alt = step.alternative;
        return (
          <Fragment key={i}>
            <button
              type="button"
              className="circle-key major"
              style={position(i, steps.length, MAJOR_RADIUS)}
              aria-label={`${keyName(step.major)}, ${signatureWords(step.major)}${alt ? `, also written ${keyName(alt.major)}` : ''}`}
              onClick={() => onPick(step.major)}
            >
              <span className="circle-name">{formatNote(step.major.tonic)}</span>
              {alt && <span className="circle-alt">{formatNote(alt.major.tonic)}</span>}
              <span className="circle-sig">{signatureText(step.major)}</span>
            </button>
            <button
              type="button"
              className="circle-key minor"
              style={position(i, steps.length, MINOR_RADIUS)}
              aria-label={keyName(step.minor)}
              onClick={() => onPick(step.minor)}
            >
              {formatNote(step.minor.tonic)}m
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
