/**
 * Spelled notes and pitches. Spelling matters: E♭ and D♯ are the same key on
 * the keyboard but different notes, and which one is right depends on the key.
 * C4 (middle C) is MIDI 60.
 */
import { LETTERS_PER_OCTAVE, MIDI_C0, SEMITONES_PER_OCTAVE } from '../constants';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** A spelled note with no octave, such as E♭: what a chord chart shows. */
export interface Note {
  readonly letter: Letter;
  /** Sharps are positive and flats negative: −1 is ♭, +2 is ♯♯. */
  readonly accidental: number;
}

/** A note in a particular octave, such as E♭4. The octave goes with the letter, so B♯3 sounds the same as C4. */
export interface Pitch extends Note {
  readonly octave: number;
}

/** `unicode` (E♭, F♯) is for the screen; `ascii` (Eb, F#) is for ids, links and saved data. */
export type NoteStyle = 'unicode' | 'ascii';

/** Which way to spell a black key when nothing else decides it. */
export type Spelling = 'sharp' | 'flat';

/** Semitones above C for each letter. */
const NATURAL_SEMITONES: Readonly<Record<Letter, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Each pitch class spelled with sharps, then with flats. */
const SHARP_SPELLINGS: readonly Note[] = spellings([0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0], 'CCDDEFFGGAAB');
const FLAT_SPELLINGS: readonly Note[] = spellings([0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0], 'CDDEEFGGAABB');

function spellings(accidentals: readonly number[], letters: string): Note[] {
  return accidentals.map((accidental, i) => ({ letter: letters[i] as Letter, accidental }));
}

const NOTE_PATTERN = /^([A-Ga-g])([#♯x𝄪]+|[b♭𝄫]+|♮)?(-?\d+)?$/u;

/** Remainder that is never negative: mod(−1, 12) is 11. */
export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function note(letter: Letter, accidental = 0): Note {
  return { letter, accidental };
}

export function pitch(letter: Letter, accidental: number, octave: number): Pitch {
  return { letter, accidental, octave };
}

/** Where a letter sits in C D E F G A B, from 0. */
export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** The letter a number of letter steps from C, wrapping round: 0 is C, 7 is C again. */
export function letterAt(steps: number): Letter {
  return LETTERS[mod(steps, LETTERS_PER_OCTAVE)] ?? 'C';
}

/** 0 for C, 1 for C♯ or D♭, up to 11 for B. */
export function pitchClass(n: Note): number {
  return mod(NATURAL_SEMITONES[n.letter] + n.accidental, SEMITONES_PER_OCTAVE);
}

/** MIDI number: C4 is 60, A4 is 69. */
export function midi(p: Pitch): number {
  return MIDI_C0 + p.octave * SEMITONES_PER_OCTAVE + NATURAL_SEMITONES[p.letter] + p.accidental;
}

export function noteFromPitchClass(pc: number, spelling: Spelling = 'sharp'): Note {
  const table = spelling === 'sharp' ? SHARP_SPELLINGS : FLAT_SPELLINGS;
  return table[mod(pc, SEMITONES_PER_OCTAVE)] ?? note('C');
}

/** The note with this letter that has this pitch class: (1, 'D') is D♭, (1, 'B') is B♯♯. */
export function spellWithLetter(pc: number, letter: Letter): Note {
  // Pick the smallest accidental that gets there, flat or sharp.
  const accidental = mod(pc - NATURAL_SEMITONES[letter] + SEMITONES_PER_OCTAVE / 2, SEMITONES_PER_OCTAVE) - SEMITONES_PER_OCTAVE / 2;
  return note(letter, accidental);
}

export function pitchFromMidi(midiNumber: number, spelling: Spelling = 'sharp'): Pitch {
  const n = noteFromPitchClass(midiNumber, spelling);
  return withOctaveFor(n, midiNumber);
}

/** The pitch of this note that has this MIDI number. The note must have the right pitch class. */
export function withOctaveFor(n: Note, midiNumber: number): Pitch {
  const octave = Math.round((midiNumber - MIDI_C0 - NATURAL_SEMITONES[n.letter] - n.accidental) / SEMITONES_PER_OCTAVE);
  return pitch(n.letter, n.accidental, octave);
}

/** Drops the octave. */
export function noteOf(p: Note): Note {
  return note(p.letter, p.accidental);
}

/** Same spelling (E♭ is not D♯). */
export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

/** Same key on the keyboard, however it's spelled (E♭ is D♯). */
export function isEnharmonic(a: Note, b: Note): boolean {
  return pitchClass(a) === pitchClass(b);
}

/**
 * Of the ways to spell a pitch class with at most one sharp or flat, the one that
 * makes `build` spell everything with the fewest accidentals: D♭ major (D♭ F A♭)
 * rather than C♯ major (C♯ E♯ G♯). Ties go to the flat spelling.
 */
export function simplestSpelling(pc: number, build: (root: Note) => readonly Note[]): Note {
  const candidates = [noteFromPitchClass(pc, 'flat'), noteFromPitchClass(pc, 'sharp')];
  let best = candidates[0] ?? note('C');
  let bestCost = Infinity;
  for (const candidate of candidates) {
    const cost = build(candidate).reduce((sum, n) => sum + Math.abs(n.accidental), 0);
    if (cost < bestCost) {
      best = candidate;
      bestCost = cost;
    }
  }
  return best;
}

// ── Sets of pitch classes ────────────────────────────────────────────────

/** Pitch classes as a 12-bit number, for quick comparison: bit 0 is C, bit 11 is B. */
export function maskOf(pitchClasses: Iterable<number>): number {
  let mask = 0;
  for (const pc of pitchClasses) mask |= 1 << mod(pc, SEMITONES_PER_OCTAVE);
  return mask;
}

/** The pitch classes in a set, lowest first. */
export function pitchClassesOf(mask: number): number[] {
  return Array.from({ length: SEMITONES_PER_OCTAVE }, (_, pc) => pc).filter((pc) => mask & (1 << pc));
}

export function bitCount(mask: number): number {
  let count = 0;
  for (let m = mask; m; m &= m - 1) count++;
  return count;
}

/** The set with every pitch class moved down by `by` semitones (up when negative), wrapping round. */
export function rotateMask(mask: number, by: number): number {
  const shift = mod(by, SEMITONES_PER_OCTAVE);
  const full = (1 << SEMITONES_PER_OCTAVE) - 1;
  return ((mask >> shift) | (mask << (SEMITONES_PER_OCTAVE - shift))) & full;
}

// ── Text ─────────────────────────────────────────────────────────────────

/**
 * ♯, ♭, ♯♯ and so on. Double sharps and flats are written as two signs rather than
 * 𝄪 and 𝄫, which many phone fonts can't show.
 */
export function accidentalText(accidental: number, style: NoteStyle = 'unicode'): string {
  const sharp = style === 'unicode' ? '♯' : '#';
  const flat = style === 'unicode' ? '♭' : 'b';
  return accidental > 0 ? sharp.repeat(accidental) : flat.repeat(-accidental);
}

/** "E♭", or "Eb" in ASCII. */
export function formatNote(n: Note, style: NoteStyle = 'unicode'): string {
  return `${n.letter}${accidentalText(n.accidental, style)}`;
}

/** A pitch class by both its names where it has two: "C♯ / D♭", or just "C". */
export function bothSpellings(pc: number): string {
  const sharp = formatNote(noteFromPitchClass(pc, 'sharp'));
  const flat = formatNote(noteFromPitchClass(pc, 'flat'));
  return sharp === flat ? sharp : `${sharp} / ${flat}`;
}

/** "E♭4", or "Eb4" in ASCII. */
export function formatPitch(p: Pitch, style: NoteStyle = 'unicode'): string {
  return `${formatNote(p, style)}${p.octave}`;
}

/** "E flat", "F sharp", "B double flat": for reading aloud and for beginners. */
export function spokenNote(n: Note): string {
  if (n.accidental === 0) return n.letter;
  const count = Math.abs(n.accidental);
  const word = n.accidental > 0 ? 'sharp' : 'flat';
  const times = count === 1 ? '' : count === 2 ? 'double ' : `${count}× `;
  return `${n.letter} ${times}${word}`;
}

function parseAccidental(text: string | undefined): number {
  let total = 0;
  for (const char of text ?? '') {
    if (char === '#' || char === '♯') total += 1;
    else if (char === 'b' || char === '♭') total -= 1;
    else if (char === 'x' || char === '𝄪') total += 2;
    else if (char === '𝄫') total -= 2;
  }
  return total;
}

function parse(text: string): { note: Note; octave: number | null } | null {
  const match = NOTE_PATTERN.exec(text.trim());
  if (!match?.[1]) return null;
  const letter = match[1].toUpperCase() as Letter;
  const octave = match[3] === undefined ? null : Number(match[3]);
  return { note: note(letter, parseAccidental(match[2])), octave };
}

/** Reads "Eb", "E♭", "F#" or "Bbb", with no octave. Null if it isn't a note. */
export function parseNote(text: string): Note | null {
  const parsed = parse(text);
  return parsed && parsed.octave === null ? parsed.note : null;
}

/** "Eb4", "C#-1". Needs an octave. Null if it isn't a pitch. */
export function parsePitch(text: string): Pitch | null {
  const parsed = parse(text);
  return parsed && parsed.octave !== null ? pitch(parsed.note.letter, parsed.note.accidental, parsed.octave) : null;
}
