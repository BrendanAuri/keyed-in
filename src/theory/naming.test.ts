import { describe, expect, it } from 'vitest';
import { p } from './fixtures';
import { formatInterval } from './intervals';
import { describeNotes, nameChord } from './naming';
import { formatNote, midi } from './notes';

/** MIDI numbers for pitches written as text. */
const keys = (...pitches: string[]) => pitches.map((text) => midi(p(text)));
const names = (...pitches: string[]) => nameChord(keys(...pitches)).map((m) => m.symbol);

describe('naming chords', () => {
  it('names root-position triads', () => {
    expect(names('C4', 'E4', 'G4')).toEqual(['C']);
    expect(names('A3', 'C4', 'E4')).toEqual(['Am']);
    expect(names('B3', 'D4', 'F4')).toEqual(['Bdim']);
  });

  it('names inversions as slash chords', () => {
    expect(names('E3', 'G3', 'C4')).toEqual(['C/E']);
    expect(names('G3', 'C4', 'E4')).toEqual(['C/G']);
  });

  it('gives every reasonable name, the one that fits the bass first', () => {
    expect(names('C4', 'E4', 'G4', 'A4')).toEqual(['C6', 'Am7/C']);
    expect(names('A3', 'C4', 'E4', 'G4')).toEqual(['Am7', 'C6/A']);
  });

  it('spells each name the simplest way', () => {
    expect(names('Db4', 'F4', 'Ab4')).toEqual(['D♭']);
    expect(names('C#4', 'E4', 'G#4')).toEqual(['C♯m']);
    expect(names('F#3', 'A#3', 'C#4')).toEqual(['G♭']);
  });

  it('lists every root of symmetrical chords', () => {
    expect(names('C4', 'E4', 'G#4')).toEqual(['Caug', 'Eaug/C', 'A♭aug/C']);
    // D♯ F♯ A C rather than E♭ G♭ B♭♭ D♭♭.
    expect(names('C4', 'Eb4', 'Gb4', 'A4')).toEqual(['Cdim7', 'D♯dim7/C', 'F♯dim7/C', 'Adim7/C']);
  });

  it('spells the bass as the chord does, unless that is harder to read', () => {
    expect(names('F#3', 'A3', 'D4')).toEqual(['D/F♯']);
  });

  it('ignores doubled notes and octaves', () => {
    expect(names('C3', 'G3', 'C4', 'E4', 'G4', 'C5')).toEqual(['C']);
  });

  it('names bigger chords', () => {
    expect(names('G3', 'B3', 'D4', 'F4', 'A4')).toEqual(['G9']);
    expect(names('C4', 'E4', 'G4', 'D5')).toEqual(['Cadd9']);
  });

  it('returns nothing for clusters no chord type fits', () => {
    expect(names('C4', 'C#4', 'D4')).toEqual([]);
  });
});

describe('describing what is played', () => {
  it('handles nothing, one note and octaves of one note', () => {
    expect(describeNotes([])).toEqual({ kind: 'empty' });
    const octaves = describeNotes(keys('C3', 'C4'));
    expect(octaves.kind === 'note' && formatNote(octaves.note)).toBe('C');
  });

  it('names two notes as an interval, with a power chord when there is one', () => {
    const fifth = describeNotes(keys('C3', 'G3'));
    expect(fifth.kind).toBe('interval');
    if (fifth.kind !== 'interval') return;
    expect(formatInterval(fifth.interval)).toBe('P5');
    expect(fifth.chords.map((c) => c.symbol)).toEqual(['C5']);

    const third = describeNotes(keys('E4', 'C5'));
    expect(third.kind === 'interval' && formatInterval(third.interval)).toBe('m6');
  });

  it('names three or more notes as chords', () => {
    const chord = describeNotes(keys('C4', 'E4', 'G4'));
    expect(chord.kind === 'chord' && chord.chords.map((c) => c.symbol)).toEqual(['C']);
  });
});
