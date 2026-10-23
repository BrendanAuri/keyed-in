/**
 * Feedback that teaches (SPEC §8): what you played, what was asked, and for
 * chords that differ by one note, which note and what it does to the sound.
 */
import { SEMITONES_PER_OCTAVE } from '../constants';
import { buildChord, chordName, chordTypeOf } from '../theory/chords';
import { semitones, transpose } from '../theory/intervals';
import { nameChord } from '../theory/naming';
import { formatNote, mod, noteFromPitchClass, pitchClass, type Note } from '../theory/notes';
import { listNotes, ordinal } from './targets';

/** What changing one chord note does to the sound, by the note's number and which way it moved. */
const COLOUR: Readonly<Record<string, string>> = {
  '3:lower': 'A lower 3rd makes a chord minor and darker.',
  '3:higher': 'A higher 3rd makes a chord major and brighter.',
  '5:lower': 'A lower 5th makes a chord diminished and tense.',
  '5:higher': 'A higher 5th makes a chord augmented and uneasy.',
  '7:lower': 'A lower 7th gives the bluesy dominant 7th, which wants to move on.',
  '7:higher': 'A higher 7th gives the soft, dreamy major 7th.',
};

/**
 * How one chord differs from another on the same root, note by note: "C minor's
 * 3rd is E♭, 1 key lower than C major's E. A lower 3rd makes a chord minor and darker."
 */
export function differenceLines(root: Note, fromTypeId: string, toTypeId: string): string[] {
  const from = new Map(chordTypeOf(fromTypeId).intervals.map((i) => [i.number, i]));
  const to = new Map(chordTypeOf(toTypeId).intervals.map((i) => [i.number, i]));
  const fromName = chordName(root, fromTypeId);
  const toName = chordName(root, toTypeId);
  const lines: string[] = [];
  for (const [number, toInterval] of to) {
    const fromInterval = from.get(number);
    const toNote = formatNote(transpose(root, toInterval));
    if (!fromInterval) {
      if (number !== 1) lines.push(`${toName} has a ${ordinal(number)}, ${toNote}; ${fromName} doesn't.`);
      continue;
    }
    const gap = semitones(toInterval) - semitones(fromInterval);
    if (gap === 0) continue;
    const way = gap < 0 ? 'lower' : 'higher';
    const keys = Math.abs(gap);
    lines.push(
      `${toName}'s ${ordinal(number)} is ${toNote}, ${keys} ${keys === 1 ? 'key' : 'keys'} ${way} than ${fromName}'s ${formatNote(transpose(root, fromInterval))}.`,
    );
    const colour = COLOUR[`${number}:${way}`];
    if (colour) lines.push(colour);
  }
  for (const [number, fromInterval] of from) {
    if (!to.has(number) && number !== 1) {
      lines.push(`${fromName} has a ${ordinal(number)}, ${formatNote(transpose(root, fromInterval))}; ${toName} doesn't.`);
    }
  }
  return lines;
}

/**
 * Spell keys (MIDI) for talking about them: as the right answer spells them
 * where they're in it, otherwise as the chord they make, otherwise with flats.
 */
export function spellKeys(midis: readonly number[], answerNotes: readonly Note[]): Note[] {
  const pcs = [...new Set(midis.map((m) => mod(m, SEMITONES_PER_OCTAVE)))];
  const lowest = Math.min(...midis);
  const ordered = pcs.sort((a, b) => mod(a - lowest, SEMITONES_PER_OCTAVE) - mod(b - lowest, SEMITONES_PER_OCTAVE));
  const named = nameChord(midis)[0];
  const chordNotes = named ? buildChord(named.root, named.chordTypeId) : [];
  return ordered.map(
    (pc) =>
      answerNotes.find((n) => pitchClass(n) === pc) ?? chordNotes.find((n) => pitchClass(n) === pc) ?? noteFromPitchClass(pc, 'flat'),
  );
}

/** "You played C, E and G: that's C major." */
export function playedLine(midis: readonly number[], answerNotes: readonly Note[]): string {
  if (midis.length === 0) return 'No keys were lit.';
  const notes = spellKeys(midis, answerNotes);
  const named = nameChord(midis)[0];
  const what = named && notes.length >= 3 ? `: that's ${chordName(named.root, named.chordTypeId)}${named.bass ? ` with ${formatNote(named.bass)} lowest` : ''}` : '';
  return `You played ${listNotes(notes)}${what}.`;
}

/** The chord type the keys make with this root as the root, if any. */
export function chordTypeOn(midis: readonly number[], root: Note): string | null {
  const match = nameChord(midis).find((m) => pitchClass(m.root) === pitchClass(root));
  return match?.chordTypeId ?? null;
}
