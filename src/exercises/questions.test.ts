import { describe, expect, it } from 'vitest';
import { createDrill } from '../game/drill';
import { createRng } from '../game/rng';
import { EXERCISES, setOptions } from './catalogue';
import { choiceKeys } from './choices';
import { rate } from './grading';
import { checkAnswer, feedbackFor, generateQuestion } from './questions';
import { voiceTarget } from './targets';
import { isKeysQuestion, type QuestionSpec } from './types';

/** Every type with every subject it takes and its whole set, to make sure any question can be answered. */
const ALL_SPECS: QuestionSpec[] = EXERCISES.flatMap((info) =>
  info.abouts.map((about) => ({ type: info.type, about, set: setOptions(info.type, about).map((o) => o.id), guide: 'full' as const })),
);

describe('every question', () => {
  it('accepts its own right answer, and gives feedback for it', () => {
    for (const spec of ALL_SPECS) {
      for (let seed = 0; seed < 300; seed++) {
        const q = generateQuestion(spec, createRng(seed));
        const label = `${spec.type}/${spec.about} seed ${seed}: ${q.prompt}`;
        const answer = isKeysQuestion(q) ? { kind: 'keys' as const, midis: voiceTarget(q.target, 4) } : { kind: 'choice' as const, index: q.correct };
        const result = checkAnswer(q, answer);
        expect(result.correct, label).toBe(true);
        expect(feedbackFor(q, answer, result).headline, label).toBe("Yes, that's it.");
        if (isKeysQuestion(q) && q.start.length > 0) expect(checkAnswer(q, { kind: 'keys', midis: q.start }).correct, label).toBe(false);
        if (!isKeysQuestion(q)) {
          expect(new Set(q.choices).size, label).toBe(q.choices.length);
          expect(q.choices.length, label).toBeGreaterThanOrEqual(2);
          if (q.choiceTargets) expect(choiceKeys(q, q.correct).length, label).toBeGreaterThan(0);
        }
      }
    }
  });

  it('treats an answer of the wrong kind as wrong', () => {
    const q = generateQuestion({ type: 'spell', about: 'chords', set: ['major'] }, createRng(1));
    expect(checkAnswer(q, { kind: 'choice', index: 0 }).correct).toBe(false);
  });
});

describe('grading for review', () => {
  const right = { correct: true, partial: false };

  it('rates by right or wrong, hints and time', () => {
    expect(rate('spell', { correct: false, partial: true }, 2, false)).toBe('again');
    expect(rate('spell', right, 3, false)).toBe('easy');
    expect(rate('spell', right, 10, false)).toBe('good');
    expect(rate('spell', right, 30, false)).toBe('hard');
    expect(rate('spell', right, 3, true)).toBe('hard');
    expect(rate('identify', right, 5, false)).toBe('good');
  });
});

describe('drills', () => {
  const spec: QuestionSpec = { type: 'identify', about: 'chords', set: ['major', 'minor', 'diminished'] };

  it('replays exactly from its seed', () => {
    const a = createDrill(spec, 42);
    const b = createDrill(spec, 42);
    for (let i = 0; i < 20; i++) expect(a.next()).toEqual(b.next());
  });

  it('never asks about the same item twice in a row when it can help it', () => {
    const drill = createDrill(spec, 7);
    let last = '';
    for (let i = 0; i < 200; i++) {
      const q = drill.next();
      expect(q.item).not.toBe(last);
      last = q.item;
    }
  });
});

describe('the catalogue', () => {
  it('offers a set for everything but notes', () => {
    for (const info of EXERCISES) {
      for (const about of info.abouts) {
        const options = setOptions(info.type, about);
        if (about === 'notes') expect(options).toEqual([]);
        else expect(options.length, `${info.type}/${about}`).toBeGreaterThan(1);
      }
    }
  });

  it('only offers change questions chords that have a one-note partner', () => {
    expect(setOptions('change', 'chords').map((o) => o.id)).not.toContain('power');
  });
});
