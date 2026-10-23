import { describe, expect, it } from 'vitest';
import { n, spelled } from './fixtures';
import { circleOfFifths, key, keyChords, keyName, keySignature, keySignatureNotes, noteFromFifths, parallelKey, relativeKey, scaleChords } from './keys';
import { formatNote } from './notes';

const numerals = (chords: ReturnType<typeof keyChords>) => chords.map((c) => c.numeral).join(' ');

describe('key signatures', () => {
  it('counts sharps as positive and flats as negative', () => {
    expect(keySignature(key(n('C'), 'major'))).toBe(0);
    expect(keySignature(key(n('G'), 'major'))).toBe(1);
    expect(keySignature(key(n('F'), 'major'))).toBe(-1);
    expect(keySignature(key(n('Eb'), 'major'))).toBe(-3);
    expect(keySignature(key(n('C#'), 'major'))).toBe(7);
    expect(keySignature(key(n('Cb'), 'major'))).toBe(-7);
    expect(keySignature(key(n('A'), 'minor'))).toBe(0);
    expect(keySignature(key(n('Eb'), 'minor'))).toBe(-6);
    expect(keySignature(key(n('F#'), 'minor'))).toBe(3);
  });

  it('lists the accidentals in the order they are written', () => {
    expect(spelled(keySignatureNotes(key(n('D'), 'major')))).toBe('F# C#');
    expect(spelled(keySignatureNotes(key(n('Ab'), 'major')))).toBe('Bb Eb Ab Db');
    expect(spelled(keySignatureNotes(key(n('G#'), 'major')))).toBe('F# C# G# D# A# E# B# F##');
    expect(keySignatureNotes(key(n('C'), 'major'))).toEqual([]);
  });

  it('walks the line of fifths', () => {
    expect([-3, -1, 0, 2, 7].map((f) => formatNote(noteFromFifths(f), 'ascii'))).toEqual(['Eb', 'F', 'C', 'D', 'C#']);
  });
});

describe('related keys', () => {
  it('finds relative and parallel keys', () => {
    expect(keyName(relativeKey(key(n('C'), 'major')))).toBe('A minor');
    expect(keyName(relativeKey(key(n('Eb'), 'major')))).toBe('C minor');
    expect(keyName(relativeKey(key(n('F#'), 'minor')))).toBe('A major');
    expect(keyName(parallelKey(key(n('C'), 'major')))).toBe('C minor');
  });

  it('goes round the circle of fifths clockwise from C', () => {
    const circle = circleOfFifths();
    expect(circle.map((step) => formatNote(step.major.tonic)).join(' ')).toBe('C G D A E B F♯ D♭ A♭ E♭ B♭ F');
    expect(circle.map((step) => formatNote(step.minor.tonic)).join(' ')).toBe('A E B F♯ C♯ G♯ D♯ B♭ F C G D');
    const alternatives = circle.flatMap((step) => (step.alternative ? [formatNote(step.alternative.major.tonic)] : []));
    expect(alternatives).toEqual(['C♭', 'G♭', 'C♯']);
  });
});

describe('the chords of a scale', () => {
  it('builds the seven chords of a major key with their numerals', () => {
    const chords = keyChords(key(n('C'), 'major'));
    expect(numerals(chords)).toBe('I ii iii IV V vi vii°');
    expect(chords.map((c) => c.chordTypeId)).toEqual(['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished']);
    expect(numerals(keyChords(key(n('C'), 'major'), 'seventh'))).toBe('Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7');
  });

  it('numbers minor keys against the major scale, as settled in SPEC §19', () => {
    expect(numerals(keyChords(key(n('A'), 'minor')))).toBe('i ii° ♭III iv v ♭VI ♭VII');
    expect(spelled(keyChords(key(n('A'), 'minor'))[5]?.notes ?? [])).toBe('F A C');
  });

  it('handles harmonic minor and the modes', () => {
    expect(numerals(scaleChords(n('A'), 'harmonicMinor'))).toBe('i ii° ♭III+ iv V ♭VI vii°');
    expect(numerals(scaleChords(n('A'), 'harmonicMinor', 'seventh'))).toBe('i(maj7) iiø7 ♭III+maj7 iv7 V7 ♭VImaj7 vii°7');
    expect(numerals(scaleChords(n('D'), 'dorian'))).toBe('i ii ♭III IV v vi° ♭VII');
    expect(numerals(scaleChords(n('E'), 'phrygian'))).toBe('i ♭II ♭III iv v° ♭VI ♭vii');
  });

  it('has nothing for scales without seven letters', () => {
    expect(scaleChords(n('C'), 'majorPentatonic')).toEqual([]);
  });
});
