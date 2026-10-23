/**
 * Roman numerals: chords named by where their root sits in the key, so what you
 * learn in one key works in all of them. Numerals are measured against the major
 * scale in every key and mode (SPEC §19): in a minor key the chords are i, ii°,
 * ♭III, iv, v, ♭VI and ♭VII, and a chord borrowed from minor in a major key is
 * ♭VI in either. Upper case has a major 3rd, lower case a minor 3rd.
 */
import { CHORD_TYPES, chordTypeOf } from './chords';
import { baseSemitones, degreeOffset, intervalBetween, intervalFromSize, simpleNumber, transpose } from './intervals';
import { accidentalText, type Note, type NoteStyle } from './notes';

export interface RomanNumeral {
  /** 1 to 7. */
  readonly degree: number;
  /** Against the major scale: −1 for ♭VII, 0 for V. */
  readonly accidental: number;
  readonly chordTypeId: string;
}

export interface NumeralChord {
  readonly root: Note;
  readonly chordTypeId: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

/** Longest first, so "VII" isn't read as "V" followed by "II". */
const NUMERAL_PATTERN = /^(bb|b|##|#|♭♭|♭|♯♯|♯)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/;

/** Other ways people type a numeral's ending. */
const SUFFIX_ALIASES: Readonly<Record<string, string>> = { o: '°', o7: '°7', ø: 'ø7', m7b5: 'ø7', '+7': '+maj7' };

/** "♭VII", "vii°", "V7", "iiø7". */
export function formatNumeral(n: RomanNumeral, style: NoteStyle = 'unicode'): string {
  const type = chordTypeOf(n.chordTypeId);
  const roman = ROMAN[n.degree - 1] ?? '?';
  return `${accidentalText(n.accidental, style)}${type.numeralCase === 'upper' ? roman : roman.toLowerCase()}${type.numeralSuffix}`;
}

/** Reads "bVII", "♭VI", "vii°", "viio", "V7", "ii7" or "iiø7". Null if it isn't a numeral this app knows. */
export function parseNumeral(text: string): RomanNumeral | null {
  const match = NUMERAL_PATTERN.exec(text.trim());
  const roman = match?.[2];
  if (!match || !roman) return null;
  const accidental = [...(match[1] ?? '')].reduce((sum, char) => sum + (char === '#' || char === '♯' ? 1 : -1), 0);
  const numeralCase = roman === roman.toUpperCase() ? 'upper' : 'lower';
  const typed = match[3] ?? '';
  const suffix = SUFFIX_ALIASES[typed] ?? typed;
  const type = CHORD_TYPES.find((t) => t.numeralCase === numeralCase && t.numeralSuffix === suffix);
  if (!type) return null;
  return { degree: ROMAN.indexOf(roman.toUpperCase() as (typeof ROMAN)[number]) + 1, accidental, chordTypeId: type.id };
}

/** The chord a numeral stands for in a key: ♭VII in C is B♭ major. */
export function numeralChord(tonic: Note, n: RomanNumeral): NumeralChord | null {
  const i = intervalFromSize(n.degree, baseSemitones(n.degree) + n.accidental);
  return i ? { root: transpose(tonic, i), chordTypeId: n.chordTypeId } : null;
}

/** The numeral for a chord in a key: B♭ major in C is ♭VII, and C♭ major in C is ♭I. */
export function numeralFor(tonic: Note, root: Note, chordTypeId: string): RomanNumeral | null {
  const i = intervalBetween(tonic, root);
  return i ? { degree: simpleNumber(i.number), accidental: degreeOffset(i), chordTypeId } : null;
}

/** Splits "I–V–vi–IV" (dashes, en dashes or spaces) into numerals. Null if any part isn't one. */
export function parseProgression(text: string): RomanNumeral[] | null {
  const parts = text.split(/[\s\-–—]+/).filter((part) => part.length > 0);
  const numerals = parts.map(parseNumeral);
  return numerals.every((n): n is RomanNumeral => n !== null) ? numerals : null;
}
