/** Shorthand for tests: notes and pitches from text, failing loudly on a typo. */
import { formatNote, parseNote, parsePitch, type Note, type Pitch } from './notes';

/** n('Eb') is E♭. */
export function n(text: string): Note {
  const parsed = parseNote(text);
  if (!parsed) throw new Error(`Not a note: "${text}"`);
  return parsed;
}

/** p('Eb4') is E♭4. */
export function p(text: string): Pitch {
  const parsed = parsePitch(text);
  if (!parsed) throw new Error(`Not a pitch: "${text}"`);
  return parsed;
}

/** Notes as ASCII text, space-separated: "C Eb G". */
export function spelled(notes: readonly Note[]): string {
  return notes.map((note) => formatNote(note, 'ascii')).join(' ');
}
