/**
 * The Scale Finder (SPEC §14.1), apart from React: reading what's typed (note
 * names or frequencies), turning frequencies into notes, spotting harmonics,
 * and the frequency table. The matching itself is theory/scaleMatch.ts.
 */
import { BASS_HIGHLIGHT_HZ, DEFAULT_A4_HZ, FINDER_HZ_RANGE, FREQUENCY_TABLE_OCTAVES, SEMITONES_PER_OCTAVE } from '../constants';
import { findHarmonics, frequencyOf, frequencyOfMidi, nearestNote, suggestedA4 } from '../theory/frequency';
import {
  bothSpellings,
  formatNote,
  formatPitch,
  midi,
  mod,
  noteFromPitchClass,
  noteOf,
  parseNote,
  parsePitch,
  pitch,
  pitchClass,
  type Note,
} from '../theory/notes';

export type Entry =
  /** A note name typed in: keeps its spelling. */
  | { readonly kind: 'note'; readonly note: Note }
  /** A key tapped on the keyboard: just a pitch class. */
  | { readonly kind: 'key'; readonly pc: number }
  /** A frequency in Hz, read off a spectrum analyser. */
  | { readonly kind: 'frequency'; readonly hz: number };

export interface ParsedInput {
  readonly entries: Entry[];
  /** Words that weren't a note or a frequency, to show back. */
  readonly unread: string[];
}

export interface ResolvedEntry {
  readonly entry: Entry;
  readonly pc: number;
  /** "E♭", "C♯ / D♭" or "49.4 Hz". */
  readonly label: string;
  /** For frequencies: the nearest note and how far off, "G1, +14 cents". */
  readonly nearest: string | null;
  /** For frequencies that look like a harmonic of a lower one entered: which entry, and which harmonic. */
  readonly harmonicOf: { readonly index: number; readonly harmonic: number } | null;
}

export interface FrequencyRow {
  readonly octave: number;
  /** One per note, in the order given. */
  readonly cells: readonly { readonly hz: number; readonly bass: boolean }[];
}

const HZ_PATTERN = /^(\d+(?:\.\d+)?)\s*(?:hz)?$/i;

/** Reads "A C E G", "Eb, F#4" or "55 110hz 165.2", in any mix. */
export function parseInput(text: string): ParsedInput {
  const entries: Entry[] = [];
  const unread: string[] = [];
  const [lowHz, highHz] = FINDER_HZ_RANGE;
  for (const token of text.split(/[\s,;]+/).filter((t) => t.length > 0)) {
    const hz = HZ_PATTERN.exec(token);
    if (hz?.[1]) {
      const value = Number(hz[1]);
      if (value >= lowHz && value <= highHz) entries.push({ kind: 'frequency', hz: value });
      else unread.push(token);
      continue;
    }
    const n = parseNote(token) ?? parsePitch(token);
    if (n) entries.push({ kind: 'note', note: noteOf(n) });
    else unread.push(token);
  }
  return { entries, unread };
}

function signedCents(cents: number): string {
  const rounded = Math.round(cents);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : '±'}${Math.abs(rounded)} cents`;
}

/** Each entry with its pitch class and label, frequencies snapped to the nearest note at this A4. */
export function resolveEntries(entries: readonly Entry[], a4Hz = DEFAULT_A4_HZ): ResolvedEntry[] {
  const frequencyIndexes = entries.flatMap((e, i) => (e.kind === 'frequency' ? [i] : []));
  const links = findHarmonics(frequencyIndexes.map((i) => (entries[i]?.kind === 'frequency' ? entries[i].hz : 0)));
  return entries.map((entry, index) => {
    switch (entry.kind) {
      case 'note':
        return { entry, pc: pitchClass(entry.note), label: formatNote(entry.note), nearest: null, harmonicOf: null };
      case 'key':
        return { entry, pc: entry.pc, label: bothSpellings(entry.pc), nearest: null, harmonicOf: null };
      case 'frequency': {
        const near = nearestNote(entry.hz, a4Hz);
        const link = links.find((l) => frequencyIndexes[l.index] === index);
        const of = link ? frequencyIndexes[link.of] : undefined;
        return {
          entry,
          pc: pitchClass(near.pitch),
          label: `${+entry.hz.toFixed(2)} Hz`,
          nearest: `${formatPitch(near.pitch)}, ${signedCents(near.cents)}`,
          harmonicOf: link && of !== undefined ? { index: of, harmonic: link.harmonic } : null,
        };
      }
    }
  });
}

/** The pitch classes to match, leaving out the entries at `leftOut`, with no repeats. */
export function enteredPitchClasses(resolved: readonly ResolvedEntry[], leftOut: ReadonlySet<number>): number[] {
  return [...new Set(resolved.filter((_, i) => !leftOut.has(i)).map((r) => r.pc))].sort((a, b) => a - b);
}

/** The A4 that would put every frequency entered in tune, when they're all off by about the same amount. */
export function tuningSuggestion(entries: readonly Entry[], a4Hz = DEFAULT_A4_HZ): number | null {
  return suggestedA4(
    entries.flatMap((e) => (e.kind === 'frequency' ? [e.hz] : [])),
    a4Hz,
  );
}

/** Each note's frequency in every octave of the table, with the sub and bass range marked. */
export function frequencyRows(notes: readonly Note[], a4Hz = DEFAULT_A4_HZ): FrequencyRow[] {
  const [low, high] = FREQUENCY_TABLE_OCTAVES;
  const [bassLow, bassHigh] = BASS_HIGHLIGHT_HZ;
  return Array.from({ length: high - low + 1 }, (_, i) => {
    const octave = low + i;
    return {
      octave,
      cells: notes.map((n) => {
        const hz = frequencyOf(pitch(n.letter, n.accidental, octave), a4Hz);
        return { hz, bass: hz >= bassLow && hz <= bassHigh };
      }),
    };
  });
}

/** How far apart, in Hz, a note in `octave` is from the next one up: under 2.5 Hz at E1. */
export function halfStepAt(n: Note, octave: number, a4Hz = DEFAULT_A4_HZ): number {
  const m = midi(pitch(n.letter, n.accidental, octave));
  return frequencyOfMidi(m + 1, a4Hz) - frequencyOfMidi(m, a4Hz);
}

/** A note to show for a pitch class in the table: the typed spelling if there is one, else the flat. */
export function noteForPitchClass(pc: number, resolved: readonly ResolvedEntry[]): Note {
  const typed = resolved.find((r) => r.pc === mod(pc, SEMITONES_PER_OCTAVE) && r.entry.kind === 'note');
  return typed?.entry.kind === 'note' ? typed.entry.note : noteFromPitchClass(pc, 'flat');
}
