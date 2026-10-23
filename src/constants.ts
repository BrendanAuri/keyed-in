/**
 * Every tunable number lives here (SPEC §4), so they're easy to find and change.
 * Small named constants at the top of a module are fine for values only it uses.
 */

/** How long the "works offline" notice stays up, in ms. */
export const OFFLINE_NOTICE_MS = 4000;

// ── Pitch ────────────────────────────────────────────────────────────────

/** Semitones in an octave. */
export const SEMITONES_PER_OCTAVE = 12;
/** Letter names in an octave: C D E F G A B. */
export const LETTERS_PER_OCTAVE = 7;
export const CENTS_PER_SEMITONE = 100;
/** MIDI number of C0. C4, middle C, is 60. */
export const MIDI_C0 = 12;
/** MIDI number of A4, the note tuning is set from. */
export const A4_MIDI = 69;
/** The usual tuning: A4 = 440 Hz. */
export const DEFAULT_A4_HZ = 440;

// ── Scale Finder (SPEC §14.1) ────────────────────────────────────────────

/**
 * A frequency within this many cents of a whole-number multiple of a lower one
 * counts as that note's harmonic. Wide enough for a misread analyser peak (1 Hz
 * at 55 Hz is about 30 cents), narrow enough that a note a half step away isn't.
 */
export const HARMONIC_TOLERANCE_CENTS = 30;
/** The highest harmonic the check looks for. Above the 8th, harmonics crowd too close to tell apart. */
export const MAX_HARMONIC = 8;
/** A tuning other than A4 = 440 is suggested only when at least this many frequencies are entered… */
export const TUNING_MIN_FREQUENCIES = 3;
/** …they're all off by at least this many cents, in the same direction… */
export const TUNING_MIN_OFFSET_CENTS = 10;
/** …and they're within this many cents of each other. */
export const TUNING_MAX_SPREAD_CENTS = 12;
/** "All but one note" near matches are only offered for scales at least this common (1 = most common)… */
export const NEAR_MATCH_MAX_COMMONNESS = 2;
/** …and once this many notes are entered; with fewer, plenty of scales fit exactly. */
export const NEAR_MATCH_MIN_NOTES = 4;
