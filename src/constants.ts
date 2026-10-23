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
export const CENTS_PER_OCTAVE = CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE;
export const SECONDS_PER_MINUTE = 60;
/** MIDI number of C0. C4, middle C, is 60. */
export const MIDI_C0 = 12;
/** MIDI number of A4, the note tuning is set from. */
export const A4_MIDI = 69;
/** The usual tuning: A4 = 440 Hz. */
export const DEFAULT_A4_HZ = 440;
/** Tunings offered as one tap, and the range any other can be set in, in Hz. */
export const A4_PRESETS_HZ = [432, 440, 442] as const;
export const A4_RANGE_HZ = [400, 480] as const;

// ── Voice engine (from Dial In, SPEC §6) ─────────────────────────────────

/**
 * Envelope segments are exponential; a segment of length T uses a time
 * constant of T / this value, so it's about 99 % complete after T.
 */
export const ENV_TIME_CONSTANTS_PER_SEGMENT = 4.6;
/** Linear fade at the very start and end of every voice, to avoid clicks. */
export const DECLICK_TIME = 0.005;
/** Gain of each oscillator. Osc 1 and osc 2 at 0 cents detune sum to 1. */
export const OSC_MIX_GAIN = 0.5;
/** Resonance 0–1 maps linearly to lowpass Q of 0 dB up to this. */
export const RESONANCE_MAX_DB = 18;
/** The filter envelope never opens the filter above this, in Hz. */
export const MAX_CUTOFF_HZ = 18000;
/** Output gain of a single voice. Lower than Dial In's 0.5, because chords stack five or six voices. */
export const VOICE_GAIN = 0.22;
/** Fixed gain of the master bus. */
export const MASTER_GAIN = 0.6;
export const LFO_CUTOFF_DEPTH_OCTAVES = 3;
export const LFO_PITCH_DEPTH_SEMITONES = 1;
/** Amp LFO at 100 % swings gain between 0 and 1. */
export const LFO_AMP_MAX_DEPTH = 1;
// Live output safety limiter.
export const LIMITER_THRESHOLD_DB = -3;
export const LIMITER_KNEE_DB = 0;
export const LIMITER_RATIO = 20;
export const LIMITER_ATTACK = 0.002;
export const LIMITER_RELEASE = 0.1;

// ── Playing (SPEC §6) ────────────────────────────────────────────────────

/** Delay before a live note starts, so its start time is never already in the past, in seconds. */
export const LIVE_START_DELAY = 0.01;
/** Most voices sounding at once from the keyboard; the oldest is stolen beyond this. */
export const MAX_VOICES = 12;
/** How long a chord is held when played, in seconds. */
export const CHORD_SECONDS = 1.8;
/** Gap between notes in a strum, in seconds: quick, like a hand across strings. */
export const STRUM_STEP_SECONDS = 0.045;
/** Gap between notes played one at a time, in seconds: slow enough for a beginner to hear each. */
export const ARPEGGIO_STEP_SECONDS = 0.42;
/** Gap between notes of a scale, in seconds. */
export const SCALE_STEP_SECONDS = 0.34;
/** Each note is held for this share of the gap to the next, so neighbours don't blur. */
export const LEGATO = 0.92;
/** Tempo of a cadence that sets the key before an ear question. */
export const CADENCE_BPM = 96;
/** Beats each cadence chord lasts; the last one rings for longer. */
export const CADENCE_BEATS = [1, 1, 1, 2] as const;
/** Chords in cadences and progressions are voiced as near this MIDI note as they can be (E4). */
export const VOICING_CENTRE_MIDI = 64;
/** A cadence or progression's bass notes sit in this MIDI range: E2 up to, not including, E3. */
export const BASS_RANGE = [40, 52] as const;

// ── Scale Guide (SPEC §14.2) ─────────────────────────────────────────────

/** The guide lists each note's frequency in these octaves (about 32–130 Hz), for tuning a kick, sub or 808. */
export const GUIDE_BASS_OCTAVES = [1, 2] as const;
/** Tempo a progression loops at until changed, and the range it can be set to, in BPM. */
export const LOOP_DEFAULT_BPM = 100;
export const LOOP_BPM_RANGE = [60, 160] as const;
/** Each chord of a looped progression lasts a bar of four beats. */
export const LOOP_BEATS_PER_CHORD = 4;
/** Beats each chord of a What next? pair lasts. */
export const MOVE_BEATS = 2;
/** How far ahead the looper schedules the next time round, in seconds. */
export const LOOP_LOOKAHEAD_SECONDS = 0.5;

// ── Questions (SPEC §8) ──────────────────────────────────────────────────

/** Keyboard questions show and voice their notes from the C in this octave. */
export const QUESTION_OCTAVE = 4;
/** Ear questions put their root somewhere in this MIDI range (F3 to F4), so it isn't always the same pitch. */
export const HEAR_ROOT_RANGE = [53, 65] as const;
/** The most answer buttons a question shows. */
export const MAX_CHOICES = 4;
/**
 * Seconds under which a right answer counts as fast (Easy) and over which it
 * counts as slow (Hard), per question type. Never shown in Learn: they only
 * set the review rating.
 */
export const TIME_LIMITS: Readonly<Record<string, { readonly fast: number; readonly slow: number }>> = {
  spell: { fast: 6, slow: 20 },
  change: { fast: 4, slow: 15 },
  fix: { fast: 5, slow: 15 },
  echo: { fast: 6, slow: 20 },
  identify: { fast: 3, slow: 10 },
  hearQuality: { fast: 3, slow: 10 },
  fact: { fast: 3, slow: 10 },
};
/** Gap between your answer and the right one when they're played A-B, in seconds. */
export const AB_GAP_SECONDS = 0.35;

// ── Keyboard (SPEC §7) ───────────────────────────────────────────────────

/** Octave of the keyboard's lowest C when it first opens on a phone (C4 is middle C); wider screens start one lower. */
export const DEFAULT_KEYBOARD_OCTAVE = 4;
export const KEYBOARD_OCTAVE_RANGE = [1, 6] as const;
/** Viewport width (CSS px) from which the keyboard shows two octaves instead of one. */
export const KEYBOARD_TWO_OCTAVE_MIN_WIDTH = 640;
/** The most octaves the keyboard stretches to so a chord or scale fits. */
export const KEYBOARD_MAX_OCTAVES = 3;

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
/** Frequencies in this range, in Hz, are highlighted as sub and bass in the Scale Finder's table. */
export const BASS_HIGHLIGHT_HZ = [20, 250] as const;
/** The Scale Finder's frequency table runs from octave 0 to octave 8. */
export const FREQUENCY_TABLE_OCTAVES = [0, 8] as const;
/** Frequencies the Scale Finder accepts, in Hz: below this is too low to hear as a note, above it too high to matter. */
export const FINDER_HZ_RANGE = [8, 20000] as const;
/** Scale groups shown before "Show all". */
export const FINDER_GROUPS_SHOWN = 6;
/** With fewer notes than this entered, the Scale Finder says lots of scales fit. */
export const FINDER_FEW_NOTES = 4;
/** "All but one note" near matches are only offered for scales at least this common (1 = most common)… */
export const NEAR_MATCH_MAX_COMMONNESS = 2;
/** …and once this many notes are entered; with fewer, plenty of scales fit exactly. */
export const NEAR_MATCH_MIN_NOTES = 4;
