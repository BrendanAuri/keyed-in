import { describe, expect, it } from 'vitest';
import { n } from '../theory/fixtures';
import { formatPitch, pitchFromMidi } from '../theory/notes';
import { listNotes, ordinal, recipe, targetName, targetNotes, targetPitchClasses, voiceTarget, whereIs } from './targets';
import type { Target } from './types';

const names = (midis: readonly number[]) => midis.map((m) => formatPitch(pitchFromMidi(m, 'flat'))).join(' ');
const cMinor: Target = { kind: 'chord', root: n('C'), chordTypeId: 'minor' };

describe('targets', () => {
  it('lists their notes and pitch classes', () => {
    expect(listNotes(targetNotes(cMinor))).toBe('C, E♭ and G');
    expect(targetPitchClasses({ kind: 'scale', root: n('C'), scaleTypeId: 'majorPentatonic' })).toEqual([0, 2, 4, 7, 9]);
    expect(listNotes(targetNotes({ kind: 'interval', root: n('A'), interval: 'm3' }))).toBe('A and C');
  });

  it('names them in words', () => {
    expect(targetName(cMinor)).toBe('C minor');
    expect(targetName({ kind: 'note', note: n('Eb') })).toBe('E♭');
    expect(targetName({ kind: 'interval', root: n('C'), interval: 'M3' })).toBe('a major 3rd above C');
    expect(targetName({ kind: 'scale', root: n('D'), scaleTypeId: 'major' })).toBe('the D major scale');
  });

  it('voices them from the C of an octave', () => {
    expect(names(voiceTarget(cMinor, 4))).toBe('C4 E♭4 G4');
    expect(names(voiceTarget({ kind: 'scale', root: n('A'), scaleTypeId: 'naturalMinor' }, 4))).toBe('A4 B4 C5 D5 E5 F5 G5 A5');
    expect(names(voiceTarget({ kind: 'note', note: n('Cb') }, 4))).toBe('B4');
  });
});

describe('recipes in plain words', () => {
  it('counts keys for chords and intervals', () => {
    expect(recipe({ kind: 'chord', root: n('D'), chordTypeId: 'minor' })).toBe(
      'Start on D. Count up 3 keys to the next note, then 4 more. Count every key, black and white.',
    );
    expect(recipe({ kind: 'chord', root: n('G'), chordTypeId: 'dominant7' })).toContain('Count up 4 keys to the next note, then 3 more, then 3 more.');
    expect(recipe({ kind: 'interval', root: n('C'), interval: 'P5' })).toBe('Start on C and count up 7 keys. Count every key, black and white.');
  });

  it('names the steps of a scale', () => {
    expect(recipe({ kind: 'scale', root: n('C'), scaleTypeId: 'major' })).toBe(
      'Start on C, then go up in steps: whole, whole, half, whole, whole, whole, half. A half step is the very next key; a whole step skips one.',
    );
  });

  it('says where a note is on the keyboard', () => {
    expect(whereIs(n('D'))).toBe('D is the white key between the two black keys.');
    expect(whereIs(n('F#'))).toBe('F♯ is the black key just right of F.');
    expect(whereIs(n('Bb'))).toBe('B♭ is the black key just left of B.');
    expect(whereIs(n('E#'))).toBe('E♯ is the same key as F.');
    expect(whereIs(n('Cb'))).toBe('C♭ is the same key as B.');
    expect(recipe({ kind: 'note', note: n('A') })).toBe(whereIs(n('A')));
  });

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 7, 9, 11, 13].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '7th', '9th', '11th', '13th']);
  });
});
