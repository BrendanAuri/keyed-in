/**
 * How scales, chords and moves between chords tend to feel (SPEC §14.2). Plain
 * data: the Scale Guide shows these words next to the real names, as "often
 * heard as", because a chord's feel depends on the key, the tempo, the sound
 * and the listener. Numerals are counted against the major scale (SPEC §19)
 * and written as `formatNumeral` writes triads ("♭VII", "vii°").
 */

export interface ScaleFeel {
  /** A few words: "bright, happy, settled". */
  readonly feel: string;
  /** The scale it's compared with to find its colour notes: Dorian is natural minor with a major 6th. */
  readonly compareWith?: string;
  /** For scales without seven letters, the seven-note scale on the same root whose chords fit with it. */
  readonly chordsFrom?: string;
}

export const SCALE_FEELS: Readonly<Record<string, ScaleFeel>> = {
  major: { feel: 'bright, happy, settled' },
  naturalMinor: { feel: 'dark, sad, serious' },
  harmonicMinor: { feel: 'dramatic and exotic, with a strong pull home', compareWith: 'naturalMinor' },
  melodicMinor: { feel: 'smooth and jazzy: minor at the bottom, major at the top', compareWith: 'naturalMinor' },
  dorian: { feel: 'minor, but hopeful and cool: funk, soul and jazz', compareWith: 'naturalMinor' },
  phrygian: { feel: 'dark and tense: Spanish music and metal', compareWith: 'naturalMinor' },
  lydian: { feel: 'dreamy and floating: film and game music', compareWith: 'major' },
  mixolydian: { feel: 'relaxed and bluesy: rock and folk', compareWith: 'major' },
  locrian: { feel: 'unstable and hard to settle on, so rarely used for a whole song', compareWith: 'naturalMinor' },
  majorPentatonic: { feel: 'open and sunny: hard to play a wrong note', chordsFrom: 'major' },
  minorPentatonic: { feel: 'bluesy, made for riffs and solos', chordsFrom: 'naturalMinor' },
  blues: { feel: 'gritty and bluesy, thanks to its blue note', chordsFrom: 'naturalMinor' },
  majorBlues: { feel: 'upbeat and twangy: country and blues', chordsFrom: 'major' },
};

/** How the chord on each degree of a scale tends to feel, from the 1st to the 7th. */
export const CHORD_FEELS: Readonly<Record<string, readonly string[]>> = {
  major: [
    'home, settled',
    'gentle, on the move',
    'in between, uncertain',
    'opens up, lifts away',
    'tension, pulls back home',
    'soft, a little sad',
    'unstable, tense',
  ],
  naturalMinor: ['a dark home', 'tense, uneasy', 'brighter, hopeful', 'mournful', 'soft, a gentle pull home', 'lifting, hopeful', 'bold, heroic'],
  harmonicMinor: [
    'a dark home',
    'tense, uneasy',
    'strange, unsettled',
    'mournful',
    'a dramatic pull home',
    'lifting, hopeful',
    'very tense, wants to go home',
  ],
  melodicMinor: ['dark but smooth', 'soft, on the move', 'strange, floating', 'bright, bluesy', 'a strong pull home', 'tense, unstable', 'very tense'],
  dorian: [
    'a cool, dark home',
    'soft, on the move',
    'brighter, hopeful',
    "bright and soulful: Dorian's colour chord",
    'soft, a gentle pull home',
    'tense, unstable',
    'bold, rising',
  ],
  phrygian: [
    'a dark home',
    "dark and tense, a half step above home: Phrygian's colour chord",
    'brighter',
    'mournful',
    'tense, unstable',
    'lifting',
    'heavy, sinking',
  ],
  lydian: [
    'home, bright and floating',
    "dreamy, otherworldly: Lydian's colour chord",
    'in between',
    'unstable, tense',
    'tension',
    'soft, a little sad',
    'gentle, wistful',
  ],
  mixolydian: [
    'home, bright',
    'gentle, on the move',
    'unstable, tense',
    'opens up, lifts away',
    'softer, unresolved',
    'soft, a little sad',
    "bold and rocky: Mixolydian's colour chord",
  ],
  locrian: ['an unstable home', 'heavy, dark', 'soft', 'mournful', 'bright, unexpected', 'warm, lifting', 'soft, sinking'],
};

/** For chords no scale above describes, a feel from the chord type alone. */
export const CHORD_TYPE_FEELS: Readonly<Record<string, string>> = {
  major: 'bright, stable',
  minor: 'darker, softer',
  diminished: 'tense, unstable',
  augmented: 'uneasy, floating',
};

export interface Move {
  /** The chord moved from, as a numeral. */
  readonly from: string;
  readonly to: string;
  readonly name: string;
  readonly feel: string;
  /** The second chord comes from another scale, so it's offered even though the scale doesn't have it. */
  readonly borrowed?: boolean;
}

/**
 * Named moves between two chords. A move shows in a scale when the scale has
 * the first chord, and has the second too (unless it's borrowed).
 */
export const MOVES: readonly Move[] = [
  // Major keys.
  { from: 'V', to: 'I', name: 'Going home', feel: 'resolved, finished: the strongest pull there is' },
  { from: 'IV', to: 'I', name: 'Soft landing', feel: 'gentle and settled: the "amen" at the end of a hymn' },
  { from: 'V', to: 'vi', name: 'The fake-out', feel: 'you expect home and land somewhere sadder: surprising, unsettling' },
  { from: 'I', to: 'IV', name: 'Lift', feel: 'opening up, moving away from home' },
  { from: 'I', to: 'V', name: 'A question', feel: 'leaves things hanging, waiting for an answer' },
  { from: 'IV', to: 'V', name: 'Building tension', feel: 'rising, about to arrive' },
  { from: 'ii', to: 'V', name: 'Building tension', feel: "smooth and rising: jazz's favourite step towards home" },
  { from: 'vi', to: 'IV', name: 'Warming up', feel: 'from sad towards hopeful' },
  { from: 'I', to: 'vi', name: 'Clouding over', feel: 'a gentle turn to sadness: the two chords share two notes' },
  { from: 'V', to: 'IV', name: 'Backing off', feel: "relaxed and bluesy: rock's way of not quite going home" },
  { from: 'IV', to: 'iv', name: 'Darkening', feel: 'bittersweet: the same chord turned minor, borrowed from the minor key', borrowed: true },
  { from: 'I', to: '♭VII', name: 'Borrowed boldness', feel: 'bold and a bit rocky: a chord borrowed from Mixolydian', borrowed: true },
  { from: '♭VII', to: 'I', name: "Rock's way home", feel: 'bold and triumphant, home without the usual pull' },
  // Minor keys.
  { from: 'V', to: 'i', name: 'Going home', feel: "dramatic and final: the minor key's strongest ending" },
  { from: 'v', to: 'i', name: 'Gentle return', feel: 'a softer way home than the major V' },
  { from: 'iv', to: 'i', name: 'Soft landing', feel: 'mournful, settled' },
  { from: 'i', to: 'iv', name: 'Sinking', feel: 'mournful, heavier' },
  { from: 'i', to: '♭VI', name: 'Lift', feel: 'hopeful, opening up: a favourite in trance and film music' },
  { from: '♭VI', to: '♭VII', name: 'Rising', feel: 'climbing, building energy' },
  { from: '♭VII', to: 'i', name: 'Heroic return', feel: 'bold and triumphant, home with a rock edge' },
  { from: '♭VII', to: '♭VI', name: 'Stepping down', feel: 'falling, dramatic: half of the flamenco slide' },
  { from: 'i', to: '♭VII', name: 'Stepping down', feel: 'moving away, often epic' },
  { from: 'iv', to: 'v', name: 'Building tension', feel: 'rising, but softly' },
  { from: 'iv', to: 'V', name: 'Building tension', feel: 'rising to a dramatic pull, with a V borrowed from harmonic minor', borrowed: true },
  { from: 'V', to: '♭VI', name: 'The fake-out', feel: 'you expect home and land somewhere warmer: surprising' },
  // Modes.
  { from: 'i', to: 'IV', name: 'The Dorian lift', feel: 'cool and soulful: a major IV brightens the minor' },
  { from: 'i', to: '♭II', name: 'Phrygian tension', feel: 'dark and menacing: a half step up from home' },
  { from: '♭II', to: 'i', name: 'Phrygian landing', feel: 'heavy, dramatic' },
  { from: 'I', to: 'II', name: 'Lydian float', feel: 'dreamy, lifted, otherworldly' },
];

export interface ProgressionInfo {
  /** Numerals separated by en dashes. */
  readonly numerals: string;
  readonly feel: string;
  /** Where you hear it. Real songs by title only (SPEC §6). */
  readonly heardIn: string;
  /** The scales it's listed under. */
  readonly scales: readonly string[];
}

export const PROGRESSIONS: readonly ProgressionInfo[] = [
  { numerals: 'I–V–vi–IV', feel: 'uplifting, anthemic', heardIn: 'countless pop songs, such as "Let It Be" and "With or Without You"', scales: ['major'] },
  { numerals: 'vi–IV–I–V', feel: 'wistful, then hopeful', heardIn: 'pop and rock, such as "Zombie"', scales: ['major'] },
  { numerals: 'I–vi–IV–V', feel: 'sweet, nostalgic', heardIn: '1950s doo-wop, such as "Stand By Me"', scales: ['major'] },
  { numerals: 'I–IV–V–I', feel: 'settled, finished', heardIn: 'folk songs, hymns, and rock and roll', scales: ['major'] },
  { numerals: 'ii–V–I', feel: 'smooth, satisfying', heardIn: 'jazz standards', scales: ['major'] },
  { numerals: 'I–♭VII–IV–I', feel: 'bold, rocky', heardIn: 'classic rock, such as "Sweet Child O\' Mine"', scales: ['mixolydian'] },
  { numerals: 'i–♭VI–♭III–♭VII', feel: 'epic, emotional', heardIn: 'trance, EDM and film scores', scales: ['naturalMinor'] },
  { numerals: 'i–♭VII–♭VI–♭VII', feel: 'driving, heroic', heardIn: 'rock and metal', scales: ['naturalMinor'] },
  { numerals: 'i–♭VI–♭VII–i', feel: 'rising, triumphant', heardIn: 'film and game music', scales: ['naturalMinor'] },
  { numerals: 'i–iv–v–i', feel: 'dark, serious', heardIn: 'minor-key folk songs and ballads', scales: ['naturalMinor'] },
  { numerals: 'i–iv–V–i', feel: 'dramatic, final', heardIn: 'classical music and metal', scales: ['harmonicMinor'] },
  // Its V is borrowed from harmonic minor; harmonic minor itself has no ♭VII.
  { numerals: 'i–♭VII–♭VI–V', feel: 'Spanish, fiery', heardIn: 'flamenco, where it\'s called the Andalusian cadence', scales: ['naturalMinor'] },
  { numerals: 'i–IV', feel: 'cool, funky', heardIn: 'Dorian grooves, such as "Oye Como Va"', scales: ['dorian'] },
  { numerals: 'i–♭II', feel: 'dark, menacing', heardIn: 'metal and Spanish music', scales: ['phrygian'] },
  { numerals: 'I–II', feel: 'dreamy, floating', heardIn: 'film and game scores', scales: ['lydian'] },
];
