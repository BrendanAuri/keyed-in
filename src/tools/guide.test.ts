import { describe, expect, it } from 'vitest';
import { CHORD_FEELS, MOVES, PROGRESSIONS, SCALE_FEELS } from '../content/feel';
import { chordSymbol } from '../theory/chords';
import { n } from '../theory/fixtures';
import { scaleChords } from '../theory/keys';
import { parseNumeral, parseProgression } from '../theory/numerals';
import { SCALE_TYPES, getScaleType, isHeptatonic } from '../theory/scales';
import { bassFrequencies, chordsSource, colourNotes, guideChords, movesFrom, progressionsFor, scaleFeel } from './guide';

describe('the feel content', () => {
  it('describes every scale, and every seven-note scale borrows chords only when it has none', () => {
    for (const type of SCALE_TYPES) {
      expect(scaleFeel(type.id), type.id).not.toBe('');
      expect(chordsSource(type.id) === null, type.id).toBe(isHeptatonic(type.id));
    }
  });

  it('names real scales everywhere', () => {
    for (const [id, feel] of Object.entries(SCALE_FEELS)) {
      expect(getScaleType(id), id).toBeDefined();
      for (const other of [feel.compareWith, feel.chordsFrom]) if (other) expect(isHeptatonic(other), `${id} → ${other}`).toBe(true);
    }
    for (const [id, feels] of Object.entries(CHORD_FEELS)) {
      expect(isHeptatonic(id), id).toBe(true);
      expect(feels, id).toHaveLength(7);
    }
  });

  it('writes every move and progression in numerals the engine reads', () => {
    for (const move of MOVES) {
      expect(parseNumeral(move.from), move.from).not.toBeNull();
      expect(parseNumeral(move.to), move.to).not.toBeNull();
    }
    for (const p of PROGRESSIONS) {
      expect(parseProgression(p.numerals), p.numerals).not.toBeNull();
      for (const id of p.scales) expect(getScaleType(id), id).toBeDefined();
    }
  });

  it("starts every move on a chord some scale has, so it's reachable", () => {
    const everyNumeral = new Set(SCALE_TYPES.filter((t) => isHeptatonic(t.id)).flatMap((t) => scaleChords(n('C'), t.id).map((c) => c.numeral)));
    for (const move of MOVES) expect(everyNumeral.has(move.from), move.from).toBe(true);
  });

  it("only lists a progression under a scale that has its chords, unless one's borrowed", () => {
    // The flamenco progression's V comes from harmonic minor, so natural minor borrows it.
    const borrowed = new Map([['i–♭VII–♭VI–V', 'naturalMinor']]);
    for (const p of PROGRESSIONS) {
      for (const id of p.scales) {
        const numerals = scaleChords(n('C'), id).map((c) => c.numeral);
        const fits = p.numerals.split('–').every((x) => numerals.includes(x));
        expect(fits || borrowed.get(p.numerals) === id, `${p.numerals} in ${id}`).toBe(true);
      }
    }
  });
});

describe("a scale's chords", () => {
  it('spells each chord with its numeral and feel', () => {
    const chords = guideChords(n('C'), 'major');
    expect(chords.map((c) => `${c.numeral} ${c.symbol}`)).toEqual(['I C', 'ii Dm', 'iii Em', 'IV F', 'V G', 'vi Am', 'vii° Bdim']);
    expect(chords[4]?.feel).toBe('tension, pulls back home');
  });

  it('gives sevenths the feel of their triad', () => {
    const sevenths = guideChords(n('A'), 'naturalMinor', 'seventh');
    expect(sevenths.map((c) => c.symbol)).toEqual(['Am7', 'Bm7♭5', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7']);
    expect(sevenths[0]?.feel).toBe('a dark home');
  });

  it('has no chords of its own for scales without seven letters', () => {
    expect(guideChords(n('A'), 'minorPentatonic')).toEqual([]);
    expect(chordsSource('minorPentatonic')).toBe('naturalMinor');
  });
});

describe('What next?', () => {
  const next = (root: string, scale: string, degree: number) =>
    movesFrom(n(root), scale, degree).map((m) => `${m.move.name}: ${m.move.to} ${m.symbol}`);

  it('lists the named moves from a chord', () => {
    expect(next('C', 'major', 5)).toEqual(['Going home: I C', 'The fake-out: vi Am', 'Backing off: IV F']);
  });

  it('offers borrowed chords the scale lacks', () => {
    expect(next('C', 'major', 4)).toContain('Darkening: iv Fm');
    expect(next('C', 'major', 1)).toContain('Borrowed boldness: ♭VII B♭');
  });

  it('uses the moves that fit each mode', () => {
    expect(next('D', 'dorian', 1)).toContain('The Dorian lift: IV G');
    expect(next('E', 'phrygian', 1)).toContain('Phrygian tension: ♭II F');
    expect(next('A', 'harmonicMinor', 5)).toContain('Going home: i Am');
    expect(next('A', 'naturalMinor', 5)).toContain('Gentle return: i Am');
  });

  it('has nothing for a degree that isn\'t there', () => {
    expect(movesFrom(n('C'), 'major', 8)).toEqual([]);
    expect(movesFrom(n('C'), 'majorPentatonic', 1)).toEqual([]);
  });
});

describe('colour notes', () => {
  it("finds what sets a mode apart from major or minor", () => {
    expect(colourNotes(n('D'), 'dorian')).toEqual([{ note: 'B', degree: '6', comparedDegree: '♭6' }]);
    expect(colourNotes(n('F'), 'lydian')).toEqual([{ note: 'B', degree: '♯4', comparedDegree: '4' }]);
    expect(colourNotes(n('G'), 'mixolydian')).toEqual([{ note: 'F', degree: '♭7', comparedDegree: '7' }]);
    expect(colourNotes(n('A'), 'harmonicMinor')).toEqual([{ note: 'G♯', degree: '7', comparedDegree: '♭7' }]);
    expect(colourNotes(n('B'), 'locrian').map((c) => c.degree)).toEqual(['♭2', '♭5']);
  });

  it('has none for major and natural minor', () => {
    expect(colourNotes(n('C'), 'major')).toEqual([]);
    expect(colourNotes(n('A'), 'naturalMinor')).toEqual([]);
  });
});

describe('progressions and bass notes', () => {
  it('spells progressions in the key', () => {
    const [pop] = progressionsFor(n('C'), 'major');
    expect(pop?.symbols).toBe('C–G–Am–F');
    expect(progressionsFor(n('A'), 'naturalMinor').map((p) => p.symbols)).toContain('Am–F–C–G');
    expect(progressionsFor(n('A'), 'naturalMinor').map((p) => p.symbols)).toContain('Am–G–F–E');
    expect(progressionsFor(n('C'), 'majorPentatonic')).toEqual([]);
  });

  it('gives the bass frequencies of every note', () => {
    const rows = bassFrequencies(n('A'), 'naturalMinor');
    expect(rows[0]?.note).toBe('A');
    expect(rows[0]?.hz[0]).toBeCloseTo(55, 6);
    expect(rows[0]?.hz[1]).toBeCloseTo(110, 6);
    expect(rows).toHaveLength(7);
    expect(bassFrequencies(n('A'), 'naturalMinor', 432)[0]?.hz[0]).toBeCloseTo(54, 6);
  });

  it('agrees with the chord symbols of the key', () => {
    const symbols = guideChords(n('E'), 'mixolydian').map((c) => c.symbol);
    expect(symbols[6]).toBe(chordSymbol(n('D'), 'major'));
  });
});
