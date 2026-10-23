import { describe, expect, it } from 'vitest';
import { ARPEGGIO_STEP_SECONDS, CHORD_SECONDS, LEGATO, SCALE_STEP_SECONDS, STRUM_STEP_SECONDS } from '../constants';
import { chordSymbol } from '../theory/chords';
import { n } from '../theory/fixtures';
import { key } from '../theory/keys';
import { formatPitch, pitchFromMidi } from '../theory/notes';
import {
  bassNote,
  cadenceChords,
  cadenceEvents,
  chordEvents,
  eventsEnd,
  progressionEvents,
  scaleEvents,
  voiceNear,
  type ChordSpec,
} from './schedule';

const names = (midis: readonly number[]) => midis.map((m) => formatPitch(pitchFromMidi(m))).join(' ');
const chord = (root: string, chordTypeId = 'major'): ChordSpec => ({ root: n(root), chordTypeId });

describe('playing a chord', () => {
  const cMajor = [67, 60, 64];

  it('plays every note at once, lowest first', () => {
    expect(chordEvents(cMajor)).toEqual([
      { midi: 60, at: 0, duration: CHORD_SECONDS },
      { midi: 64, at: 0, duration: CHORD_SECONDS },
      { midi: 67, at: 0, duration: CHORD_SECONDS },
    ]);
  });

  it('strums with each note a little later, all ending together', () => {
    const events = chordEvents(cMajor, 'strum');
    expect(events.map((e) => e.at)).toEqual([0, STRUM_STEP_SECONDS, 2 * STRUM_STEP_SECONDS]);
    expect(new Set(events.map((e) => e.at + e.duration)).size).toBe(1);
  });

  it('plays one note at a time, each on its own', () => {
    const events = chordEvents(cMajor, 'arpeggio');
    expect(events.map((e) => e.at)).toEqual([0, ARPEGGIO_STEP_SECONDS, 2 * ARPEGGIO_STEP_SECONDS]);
    for (const e of events) expect(e.duration).toBeLessThan(ARPEGGIO_STEP_SECONDS);
  });
});

describe('playing a scale', () => {
  it('goes up, or up and back down with the top note once', () => {
    const up = [60, 62, 64, 65];
    expect(scaleEvents(up).map((e) => e.midi)).toEqual(up);
    expect(scaleEvents(up, 'upAndDown').map((e) => e.midi)).toEqual([60, 62, 64, 65, 64, 62, 60]);
    expect(eventsEnd(scaleEvents(up))).toBeCloseTo(3 * SCALE_STEP_SECONDS + SCALE_STEP_SECONDS * LEGATO, 10);
  });
});

describe('voicing chords', () => {
  it('voices a first chord around the middle of the keyboard', () => {
    expect(names(voiceNear(chord('C'), null))).toBe('C4 E4 G4');
  });

  it('moves as little as possible from chord to chord, as a pianist would', () => {
    const tonic = voiceNear(chord('C'), null);
    const four = voiceNear(chord('F'), tonic);
    const five = voiceNear(chord('G'), four);
    expect(names(four)).toBe('C4 F4 A4');
    expect(names(five)).toBe('B3 D4 G4');
    expect(names(voiceNear(chord('C'), five))).toBe('C4 E4 G4');
  });

  it("doesn't drift up or down over a long progression", () => {
    const roots = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    let previous: number[] | null = null;
    for (let i = 0; i < 48; i++) {
      previous = voiceNear(chord(roots[i % roots.length] ?? 'C', i % 2 ? 'minor7' : 'major'), previous);
      expect(Math.min(...previous)).toBeGreaterThanOrEqual(46);
      expect(Math.max(...previous)).toBeLessThan(84);
    }
  });

  it('puts the bass between E2 and D♯3', () => {
    expect(bassNote(n('C'))).toBe(48);
    expect(bassNote(n('E'))).toBe(40);
    expect(bassNote(n('D#'))).toBe(51);
  });
});

describe('progressions and cadences', () => {
  it('plays each chord on the beat with its root in the bass', () => {
    const events = progressionEvents([chord('C'), chord('A', 'minor')], 60, 2);
    expect(events.filter((e) => e.at === 0).map((e) => e.midi)).toEqual([48, 60, 64, 67]);
    expect(names(events.filter((e) => e.at === 2).map((e) => e.midi))).toBe('A2 C4 E4 A4');
    for (const e of events) expect(e.duration).toBeCloseTo(2 * LEGATO, 10);
  });

  it('takes one length per chord when given a list', () => {
    const events = progressionEvents([chord('C'), chord('F'), chord('G')], 120, [1, 1, 2]);
    expect([...new Set(events.map((e) => e.at))]).toEqual([0, 0.5, 1]);
    expect(eventsEnd(events)).toBeCloseTo(1 + 2 * 0.5 * LEGATO, 10);
  });

  it('sets a major key with I–IV–V–I and a minor key with i–iv–V–i', () => {
    const symbols = (chords: ChordSpec[]) => chords.map((c) => chordSymbol(c.root, c.chordTypeId)).join(' ');
    expect(symbols(cadenceChords(key(n('C'), 'major')))).toBe('C F G C');
    expect(symbols(cadenceChords(key(n('A'), 'minor')))).toBe('Am Dm E Am');
    expect(symbols(cadenceChords(key(n('Eb'), 'major')))).toBe('E♭ A♭ B♭ E♭');
  });

  it('lets the last cadence chord ring longest', () => {
    const events = cadenceEvents(key(n('C'), 'major'));
    const starts = [...new Set(events.map((e) => e.at))];
    expect(starts).toHaveLength(4);
    const last = events.filter((e) => e.at === starts[3]);
    const first = events.filter((e) => e.at === 0);
    expect(last[0]?.duration).toBeCloseTo(2 * (first[0]?.duration ?? 0), 10);
  });
});
