import { describe, expect, it } from 'vitest';
import { HEAR_ROOT_RANGE } from '../constants';
import { createRng } from '../game/rng';
import { formatPitch, pitchFromMidi } from '../theory/notes';
import { checkChoice, choiceFeedback, choiceKeys, generateFact, generateHearQuality, generateIdentify } from './choices';
import type { ChoiceQuestion, QuestionSpec } from './types';

const names = (midis: readonly number[]) => midis.map((m) => formatPitch(pitchFromMidi(m, 'flat'))).join(' ');
const spec = (fields: Partial<QuestionSpec>): QuestionSpec => ({ type: 'identify', about: 'chords', set: ['major', 'minor'], roots: ['G'], ...fields });
const wrongIndex = (q: ChoiceQuestion) => (q.correct === 0 ? 1 : 0);

describe('identify', () => {
  it('lights a chord and offers its name among others on the same root', () => {
    const q = generateIdentify(spec({}), createRng(1));
    expect(q.prompt).toBe('Which chord is lit?');
    expect([...q.choices].sort()).toEqual(['G major', 'G minor']);
    expect(names(q.shown)).toMatch(/^G4 (B|B♭)4 D5$/);
    expect(checkChoice(q, q.correct).correct).toBe(true);
  });

  it('adds a contrasting chord when the set has only one', () => {
    const q = generateIdentify(spec({ set: ['diminished'] }), createRng(2));
    expect([...q.choices].sort()).toEqual(['G diminished', 'G minor']);
  });

  it('hides key names for notes and offers both spellings', () => {
    const q = generateIdentify(spec({ about: 'notes', roots: ['Db'] }), createRng(3));
    expect(q.hideNames).toBe(true);
    expect(q.choices).toContain('C♯ / D♭');
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
  });

  it('explains a wrong chord by the note that differs', () => {
    const q = generateIdentify(spec({}), createRng(1));
    const fb = choiceFeedback(q, wrongIndex(q), checkChoice(q, wrongIndex(q)));
    expect(fb.headline).toBe('Not quite.');
    expect(fb.lines[0]).toMatch(/^You chose G (major|minor); it's G (minor|major)\.$/);
    expect(fb.lines.some((line) => line.includes("'s 3rd is"))).toBe(true);
  });
});

describe('hearQuality', () => {
  it('plays from a root somewhere in the middle range, different from run to run', () => {
    const roots = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const q = generateHearQuality(spec({ type: 'hearQuality' }), createRng(seed));
      expect(q.rootMidi).toBeGreaterThanOrEqual(HEAR_ROOT_RANGE[0]);
      expect(q.rootMidi).toBeLessThanOrEqual(HEAR_ROOT_RANGE[1]);
      roots.add(q.rootMidi ?? 0);
    }
    expect(roots.size).toBeGreaterThan(5);
  });

  it('names kinds of chord, not the chord, and plays any choice on the same root', () => {
    const q = generateHearQuality(spec({ type: 'hearQuality' }), createRng(4));
    expect([...q.choices].sort()).toEqual(['Major', 'Minor']);
    expect(q.item).toMatch(/^hearQuality:(major|minor)$/);
    const right = choiceKeys(q, q.correct);
    expect(right).toEqual(q.sound?.midis);
    expect(choiceKeys(q, wrongIndex(q))[0]).toBe(right[0]);
    const fb = choiceFeedback(q, wrongIndex(q), checkChoice(q, wrongIndex(q)));
    expect(fb.lines).toContain('Press A-B to hear the two back to back.');
    expect(fb.yours).toEqual(choiceKeys(q, wrongIndex(q)));
  });

  it('asks about intervals and scales too', () => {
    const interval = generateHearQuality(spec({ type: 'hearQuality', about: 'intervals', set: ['m3', 'M3'] }), createRng(5));
    expect([...interval.choices].sort()).toEqual(['Major 3rd', 'Minor 3rd']);
    const scale = generateHearQuality(spec({ type: 'hearQuality', about: 'scales', set: ['major', 'dorian'] }), createRng(5));
    expect([...scale.choices].sort()).toEqual(['Dorian', 'Major']);
    expect(scale.sound?.midis).toHaveLength(8);
  });
});

describe('facts', () => {
  const fact = (kind: string, root: string, seed = 1) => generateFact(spec({ type: 'fact', about: 'facts', set: [kind], roots: [root] }), createRng(seed));

  it('asks about key signatures and explains with the accidentals', () => {
    const q = fact('keySignature', 'Eb');
    expect(q.prompt).toBe('How many sharps or flats are in E♭ major?');
    expect(q.choices[q.correct]).toBe('3 flats');
    expect(q.explanation).toBe('E♭ major has 3 flats: B♭, E♭ and A♭.');
    expect(fact('keySignature', 'C').choices[fact('keySignature', 'C').correct]).toBe('No sharps or flats');
  });

  it('asks about relative minors and the notes of a key', () => {
    const rel = fact('relativeMinor', 'G');
    expect(rel.choices[rel.correct]).toBe('E minor');
    const degree = fact('scaleDegree', 'Bb', 7);
    expect(degree.prompt).toMatch(/^What's the \d(st|nd|rd|th) note of the B♭ major scale\?$/);
    expect(degree.explanation).toContain('B♭, C, D, E♭, F, G and A');
  });

  it('asks about half and whole steps, with both spellings of black keys', () => {
    for (let seed = 0; seed < 10; seed++) {
      const q = fact('halfStep', 'E', seed);
      expect(q.choices[q.correct]).toBe(q.prompt.includes(' up ') ? 'F' : 'D♯ / E♭');
    }
    const whole = fact('wholeStep', 'C', 3);
    expect(['D', 'A♯ / B♭']).toContain(whole.choices[whole.correct]);
  });

  it('reads a wrong fact back in plain words', () => {
    const q = fact('keySignature', 'C');
    const wrong = wrongIndex(q);
    const fb = choiceFeedback(q, wrong, checkChoice(q, wrong));
    expect(fb.lines[0]).toMatch(/^You chose .+; it's no sharps or flats\.$/);
    expect(fb.lines[1]).toBe('C major has no sharps or flats.');
  });
});
