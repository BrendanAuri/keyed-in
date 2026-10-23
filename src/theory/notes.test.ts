import { describe, expect, it } from 'vitest';
import {
  LETTERS,
  bitCount,
  formatNote,
  formatPitch,
  isEnharmonic,
  maskOf,
  midi,
  note,
  noteFromPitchClass,
  parseNote,
  parsePitch,
  pitch,
  pitchClass,
  pitchClassesOf,
  pitchFromMidi,
  rotateMask,
  sameNote,
  simplestSpelling,
  spellWithLetter,
  spokenNote,
} from './notes';
import { buildChord } from './chords';

describe('parsing and formatting notes', () => {
  it('reads sharps, flats and doubles in ASCII and Unicode', () => {
    expect(parseNote('Eb')).toEqual(note('E', -1));
    expect(parseNote('E♭')).toEqual(note('E', -1));
    expect(parseNote('f#')).toEqual(note('F', 1));
    expect(parseNote('Bbb')).toEqual(note('B', -2));
    expect(parseNote('Cx')).toEqual(note('C', 2));
    expect(parseNote('C𝄪')).toEqual(note('C', 2));
    expect(parseNote('D♮')).toEqual(note('D', 0));
  });

  it('rejects things that are not notes', () => {
    for (const text of ['', 'H', 'E#b', 'C4', 'Cb#', 'major']) expect(parseNote(text)).toBeNull();
    expect(parsePitch('C')).toBeNull();
  });

  it('reads pitches with octaves, including negative ones', () => {
    expect(parsePitch('F#4')).toEqual(pitch('F', 1, 4));
    expect(parsePitch('C-1')).toEqual(pitch('C', 0, -1));
  });

  it('writes Unicode for the screen and ASCII for ids, with doubles as two signs', () => {
    expect(formatNote(note('E', -1))).toBe('E♭');
    expect(formatNote(note('E', -1), 'ascii')).toBe('Eb');
    expect(formatNote(note('F', 2))).toBe('F♯♯');
    expect(formatNote(note('B', -2), 'ascii')).toBe('Bbb');
    expect(formatPitch(pitch('E', -1, 4))).toBe('E♭4');
  });

  it('round-trips every letter with up to two sharps or flats', () => {
    for (const letter of LETTERS) {
      for (let accidental = -2; accidental <= 2; accidental++) {
        const n = note(letter, accidental);
        expect(parseNote(formatNote(n))).toEqual(n);
        expect(parseNote(formatNote(n, 'ascii'))).toEqual(n);
      }
    }
  });

  it('says notes in words', () => {
    expect(spokenNote(note('E', -1))).toBe('E flat');
    expect(spokenNote(note('F', 2))).toBe('F double sharp');
    expect(spokenNote(note('A'))).toBe('A');
  });
});

describe('pitch classes and MIDI numbers', () => {
  it('puts middle C at MIDI 60, with the octave going with the letter', () => {
    expect(midi(pitch('C', 0, 4))).toBe(60);
    expect(midi(pitch('A', 0, 4))).toBe(69);
    expect(midi(pitch('B', 1, 3))).toBe(60);
    expect(midi(pitch('C', -1, 4))).toBe(59);
    expect(midi(pitch('C', 0, -1))).toBe(0);
  });

  it('spells black keys with sharps or flats on request', () => {
    expect(pitchFromMidi(61)).toEqual(pitch('C', 1, 4));
    expect(pitchFromMidi(61, 'flat')).toEqual(pitch('D', -1, 4));
    expect(pitchFromMidi(59, 'flat')).toEqual(pitch('B', 0, 3));
    expect(noteFromPitchClass(-1)).toEqual(note('B'));
  });

  it('treats different spellings of one key as enharmonic but not the same', () => {
    expect(isEnharmonic(note('E', -1), note('D', 1))).toBe(true);
    expect(sameNote(note('E', -1), note('D', 1))).toBe(false);
    expect(pitchClass(note('B', 1))).toBe(0);
  });

  it('spells a pitch class with any letter', () => {
    expect(spellWithLetter(1, 'D')).toEqual(note('D', -1));
    expect(spellWithLetter(1, 'B')).toEqual(note('B', 2));
    expect(spellWithLetter(0, 'B')).toEqual(note('B', 1));
    expect(spellWithLetter(11, 'C')).toEqual(note('C', -1));
  });

  it('picks the spelling that keeps the chord simplest', () => {
    const major = (root: ReturnType<typeof note>) => buildChord(root, 'major');
    const minor = (root: ReturnType<typeof note>) => buildChord(root, 'minor');
    expect(simplestSpelling(1, major)).toEqual(note('D', -1));
    expect(simplestSpelling(1, minor)).toEqual(note('C', 1));
    expect(simplestSpelling(8, minor)).toEqual(note('G', 1));
    // F♯ and G♭ major both need six accidentals: ties go to flats.
    expect(simplestSpelling(6, major)).toEqual(note('G', -1));
  });
});

describe('sets of pitch classes', () => {
  it('packs and unpacks pitch classes as bits', () => {
    const cMajor = maskOf([0, 4, 7, 12]);
    expect(pitchClassesOf(cMajor)).toEqual([0, 4, 7]);
    expect(bitCount(cMajor)).toBe(3);
  });

  it('rotates a set either way, wrapping round', () => {
    const cMajor = maskOf([0, 4, 7]);
    expect(pitchClassesOf(rotateMask(cMajor, -2))).toEqual([2, 6, 9]);
    expect(pitchClassesOf(rotateMask(maskOf([9, 0, 4]), 9))).toEqual([0, 3, 7]);
  });
});
