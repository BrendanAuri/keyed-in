/**
 * The theory engine checked against Tonal (SPEC §5), an independent library
 * used here only as an answer key. Tonal writes intervals number-first ("3m")
 * and accepts upper- or lower-case numerals without changing the chord, so the
 * comparisons below convert or stick to what it gets right.
 */
import { Chord, Interval, Key, Note, Progression, Scale } from 'tonal';
import { describe, expect, it } from 'vitest';
import { CHORD_TYPES, buildChord, chordSymbol, voiceChord } from './chords';
import { frequencyOf } from './frequency';
import { formatInterval, intervalBetween, intervalOf, transpose, type Interval as OurInterval } from './intervals';
import { key, keyChords, keySignature, scaleChords } from './keys';
import { nameChord } from './naming';
import {
  LETTERS,
  formatNote,
  formatPitch,
  letterAt,
  letterIndex,
  midi,
  note,
  parseNote,
  pitch,
  pitchClass,
  spellWithLetter,
  type Note as OurNote,
} from './notes';
import { numeralChord, parseNumeral } from './numerals';
import { SCALE_TYPES, buildScale } from './scales';

const ascii = (n: OurNote) => formatNote(n, 'ascii');
const asciiAll = (notes: readonly OurNote[]) => notes.map(ascii);

/** Every natural, sharp and flat: 21 roots. */
const ROOTS: readonly OurNote[] = LETTERS.flatMap((letter) => [-1, 0, 1].map((accidental) => note(letter, accidental)));

/** "3m" → "m3"; null for Tonal's descending intervals ("-2M"). */
function fromTonalInterval(name: string): string | null {
  const match = /^(\d+)([PMmAd]+)$/.exec(name);
  return match ? `${match[2]}${match[1]}` : null;
}

function toTonalInterval(i: OurInterval): string {
  return `${i.number}${i.quality}`;
}

/** Every interval this app can spell, unison to 9th. */
const INTERVALS: readonly OurInterval[] = ['P1', 'A1', 'm2', 'M2', 'A2', 'm3', 'M3', 'd4', 'P4', 'A4', 'd5', 'P5', 'A5', 'm6', 'M6', 'm7', 'M7', 'd7', 'P8', 'm9', 'M9'].map(intervalOf);

const TONAL_CHORDS: Readonly<Record<string, string>> = {
  major: 'M',
  minor: 'm',
  dominant7: '7',
  minor7: 'm7',
  major7: 'maj7',
  power: '5',
  sus4: 'sus4',
  sus2: 'sus2',
  diminished: 'dim',
  augmented: 'aug',
  major6: '6',
  minor6: 'm6',
  add9: 'add9',
  minorAdd9: 'madd9',
  halfDiminished7: 'm7b5',
  diminished7: 'dim7',
  dominant7sus4: '7sus4',
  dominant9: '9',
  major9: 'maj9',
  minor9: 'm9',
  minorMajor7: 'mMaj7',
  augmentedMajor7: 'maj7#5',
};

const TONAL_SCALES: Readonly<Record<string, string>> = {
  major: 'major',
  naturalMinor: 'minor',
  majorPentatonic: 'major pentatonic',
  minorPentatonic: 'minor pentatonic',
  blues: 'blues',
  dorian: 'dorian',
  mixolydian: 'mixolydian',
  harmonicMinor: 'harmonic minor',
  phrygian: 'phrygian',
  lydian: 'lydian',
  melodicMinor: 'melodic minor',
  majorBlues: 'major blues',
  locrian: 'locrian',
};

describe('agrees with Tonal on notes', () => {
  it('gives the same MIDI numbers and frequencies', () => {
    for (const root of ROOTS) {
      for (let octave = 0; octave <= 8; octave++) {
        const ours = pitch(root.letter, root.accidental, octave);
        const name = formatPitch(ours, 'ascii');
        expect(midi(ours), name).toBe(Note.midi(name));
        expect(frequencyOf(ours), name).toBeCloseTo(Note.freq(name) ?? NaN, 6);
      }
    }
  });
});

describe('agrees with Tonal on intervals', () => {
  it('measures the interval between every pair of roots the same way', () => {
    let compared = 0;
    for (const a of ROOTS) {
      for (const b of ROOTS) {
        const theirs = fromTonalInterval(Interval.distance(ascii(a), ascii(b)));
        if (theirs === null) continue;
        const ours = intervalBetween(a, b);
        // Triply augmented or diminished (F♭ up to B♯) is past anything the app spells, so it's null by design.
        const expected = /^(AAA|ddd)/.test(theirs) ? null : theirs;
        expect(ours && formatInterval(ours), `${ascii(a)} to ${ascii(b)}`).toBe(expected);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(400);
  });

  it('transposes every root by every interval the same way', () => {
    for (const root of ROOTS) {
      for (const i of INTERVALS) {
        expect(ascii(transpose(root, i)), `${ascii(root)} + ${formatInterval(i)}`).toBe(Note.transpose(ascii(root), toTonalInterval(i)));
      }
    }
  });
});

describe('agrees with Tonal on chords and scales', () => {
  it('maps every chord type to Tonal', () => {
    expect(Object.keys(TONAL_CHORDS).sort()).toEqual(CHORD_TYPES.map((t) => t.id).sort());
  });

  it('spells every chord type on every root the same way', () => {
    for (const type of CHORD_TYPES) {
      for (const root of ROOTS) {
        const theirs = Chord.getChord(TONAL_CHORDS[type.id] ?? '?', ascii(root));
        expect(theirs.empty, type.id).toBe(false);
        expect(asciiAll(buildChord(root, type.id)), `${ascii(root)} ${type.id}`).toEqual(theirs.notes);
      }
    }
  });

  it('maps every scale type to Tonal', () => {
    expect(Object.keys(TONAL_SCALES).sort()).toEqual(SCALE_TYPES.map((t) => t.id).sort());
  });

  it('spells every scale on every root the same way, apart from the blues rule', () => {
    // SPEC §19: a blues scale's double flat becomes the sharp of the note below (B♭♭ → A); Tonal keeps B♭♭.
    const bluesRule = (name: string): string => {
      const theirs = parseNote(name);
      if (!theirs || theirs.accidental > -2) return name;
      return ascii(spellWithLetter(pitchClass(theirs), letterAt(letterIndex(theirs.letter) - 1)));
    };
    for (const type of SCALE_TYPES) {
      for (const root of ROOTS) {
        const theirs = Scale.get(`${ascii(root)} ${TONAL_SCALES[type.id] ?? '?'}`);
        expect(theirs.empty, type.id).toBe(false);
        const expected = type.avoidDoubleFlats ? theirs.notes.map(bluesRule) : theirs.notes;
        expect(asciiAll(buildScale(root, type.id)), `${ascii(root)} ${type.id}`).toEqual(expected);
      }
    }
  });
});

describe('agrees with Tonal on keys', () => {
  const notesOf = (symbol: string) => Chord.get(symbol).notes;

  it('gives the same key signatures', () => {
    for (const root of ROOTS) {
      expect(keySignature(key(root, 'major')), `${ascii(root)} major`).toBe(Key.majorKey(ascii(root)).alteration);
      expect(keySignature(key(root, 'minor')), `${ascii(root)} minor`).toBe(Key.minorKey(ascii(root)).alteration);
    }
  });

  it('builds the same chords on each degree of major and minor keys', () => {
    for (const root of ROOTS) {
      const major = Key.majorKey(ascii(root));
      const minor = Key.minorKey(ascii(root));
      const symbols = (chords: ReturnType<typeof keyChords>) => chords.map((c) => (c.chordTypeId ? chordSymbol(c.root, c.chordTypeId, null, 'ascii') : '?'));
      expect(symbols(keyChords(key(root, 'major'))), ascii(root)).toEqual(major.triads);
      expect(symbols(keyChords(key(root, 'major'), 'seventh')), ascii(root)).toEqual(major.chords);
      expect(symbols(keyChords(key(root, 'minor'))), ascii(root)).toEqual(minor.natural.triads);
      expect(symbols(keyChords(key(root, 'minor'), 'seventh')), ascii(root)).toEqual(minor.natural.chords);
      // Tonal writes harmonic minor's sevenths differently (AmMaj7, C+maj7, G#o7), so compare notes.
      const harmonic = scaleChords(root, 'harmonicMinor', 'seventh').map((c) => asciiAll(c.notes));
      expect(harmonic, ascii(root)).toEqual(minor.harmonic.chords.map(notesOf));
    }
  });

  it('numbers minor-key chords against the major scale, as Tonal does', () => {
    const plain = (numeral: string) => numeral.replace(/[°ø+7]|\(maj7\)|maj7/g, '').toUpperCase().replaceAll('♭', 'b').replaceAll('♯', '#');
    for (const root of ROOTS) {
      expect(keyChords(key(root, 'minor')).map((c) => plain(c.numeral)), ascii(root)).toEqual(Key.minorKey(ascii(root)).natural.grades);
      expect(keyChords(key(root, 'major')).map((c) => plain(c.numeral)), ascii(root)).toEqual(Key.majorKey(ascii(root)).grades);
    }
  });

  it('puts every numeral on the same root', () => {
    const numerals = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
    for (const tonic of ROOTS) {
      const theirs = Progression.fromRomanNumerals(ascii(tonic), numerals).map((symbol) => Chord.get(symbol).tonic);
      const ours = numerals.map((text) => {
        const parsed = parseNumeral(text);
        const chord = parsed && numeralChord(tonic, parsed);
        return chord ? ascii(chord.root) : null;
      });
      expect(ours, ascii(tonic)).toEqual(theirs);
    }
  });
});

describe('agrees with Tonal on naming chords', () => {
  /** A chord as its root's pitch class and our chord type id, whoever named it. */
  const typeByIntervals = new Map(CHORD_TYPES.map((t) => [t.intervals.map(formatInterval).join(' '), t.id]));
  /** Tonal's chord name as "root pitch class:our type id", or null for a type this app doesn't have. */
  const fromTonal = (symbol: string): string | null => {
    // Drop a slash bass ("/Eb"), but not the slash inside Tonal's own "m/ma7".
    const chord = Chord.get(symbol.replace(/\/[A-G][#b]*$/, ''));
    const typeId = typeByIntervals.get(chord.intervals.map((i) => fromTonalInterval(i) ?? '?').join(' '));
    const tonic = chord.tonic ? parseNote(chord.tonic) : null;
    return typeId && tonic ? `${pitchClass(tonic)}:${typeId}` : null;
  };

  it('finds the same chords in every inversion of every chord type', () => {
    const mismatches: string[] = [];
    for (const type of CHORD_TYPES.filter((t) => t.intervals.length >= 3)) {
      for (const root of ROOTS) {
        for (let inversion = 0; inversion < type.intervals.length; inversion++) {
          const voiced = voiceChord(pitch(root.letter, root.accidental, 3), type.id, inversion);
          const ours = nameChord(voiced.map(midi)).map((m) => `${pitchClass(m.root)}:${m.chordTypeId}`);
          const detected = Chord.detect(voiced.map((x) => ascii(x)));
          const theirs = [...new Set(detected.map(fromTonal).filter((x): x is string => x !== null))];
          const label = `${voiced.map((x) => ascii(x)).join(' ')} (${type.id}, inversion ${inversion})`;
          if (!ours.includes(`${pitchClass(root)}:${type.id}`)) mismatches.push(`${label}: we miss it`);
          if ([...ours].sort().join() !== [...theirs].sort().join()) {
            mismatches.push(`${label}: ours ${ours.join(', ')}; Tonal ${theirs.join(', ')} (${detected.join(', ')})`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
