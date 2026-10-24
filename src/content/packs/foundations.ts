/**
 * Foundations (SPEC §9.2): from the very beginning, for someone who's never
 * touched a keyboard. Levels 1 to 10; 11 to 14 need question types that come
 * in Milestone 7. Every intro uses plain words and shows a term before it's used.
 */
import type { Pack } from '../schema';

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Each black key by both its names. */
const BLACK_KEYS = ['C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'];

export const FOUNDATIONS: Pack = {
  id: 'foundations',
  title: 'Foundations',
  description: 'From the very beginning: the keys and their names, your first chords, scales, and how far apart notes are.',
  version: 1,
  comingSoon: 'Four more levels are on the way: hearing notes and chords in a key, and the chord patterns behind songs.',
  levels: [
    {
      id: 'keyboard',
      title: 'The keyboard',
      summary: 'The white keys, their letters, and how to find each one.',
      intro: [
        {
          kind: 'see',
          text: 'These are the white keys. Each has a letter: C, D, E, F, G, A and B. After B the letters start again from C.',
          target: { kind: 'notes', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'] },
        },
        {
          kind: 'see',
          text: 'The black keys come in groups of two and three. C is always the white key just left of a group of two. Here are two Cs.',
          target: { kind: 'notes', notes: ['C4', 'C5'] },
        },
        { kind: 'play', text: 'Your turn: tap a C. The letters are hidden this time, so look for the two black keys.', target: { kind: 'notes', notes: ['C4'] }, hideNames: true },
        {
          kind: 'see',
          text: 'Next to C, D sits between the two black keys, and E is just right of them.',
          target: { kind: 'notes', notes: ['D4', 'E4'] },
        },
        {
          kind: 'see',
          text: 'F is just left of the group of three black keys. G and A sit between them, and B is just right of them.',
          target: { kind: 'notes', notes: ['F4', 'G4', 'A4', 'B4'] },
        },
        { kind: 'play', text: 'Now tap G: between the first two of the three black keys.', target: { kind: 'notes', notes: ['G4'] }, hideNames: true },
        {
          kind: 'read',
          text: "In this level you'll find notes on the keyboard and name a key that's lit up. When the letters are hidden, find your way by the groups of black keys.",
        },
      ],
      questions: [
        { spec: { type: 'spell', about: 'notes', set: [], roots: WHITE_KEYS, guide: 'hint' }, weight: 1 },
        { spec: { type: 'spell', about: 'notes', set: [], roots: WHITE_KEYS, guide: 'none' }, weight: 3 },
        { spec: { type: 'identify', about: 'notes', set: [], roots: WHITE_KEYS }, weight: 3 },
      ],
      placement: [
        { type: 'spell', about: 'notes', set: [], roots: WHITE_KEYS, guide: 'none' },
        { type: 'identify', about: 'notes', set: [], roots: WHITE_KEYS },
      ],
    },
    {
      id: 'steps',
      title: 'Half steps and whole steps',
      summary: 'The black keys, sharps and flats, and the steps between keys.',
      intro: [
        {
          kind: 'see',
          text: 'From one key to the very next, black or white, is a half step. The black key a half step up from C is called C sharp, written C♯. Sharp means a half step up.',
          target: { kind: 'notes', notes: ['C4', 'C#4'] },
        },
        {
          kind: 'see',
          text: "The same black key is a half step down from D, so it's also D flat, written D♭. Flat means a half step down. One key, two names.",
          target: { kind: 'notes', notes: ['Db4', 'D4'] },
        },
        {
          kind: 'see',
          text: 'Two half steps make a whole step. C up to D is a whole step: it skips the black key in between.',
          target: { kind: 'notes', notes: ['C4', 'D4'] },
        },
        {
          kind: 'see',
          text: 'E and F have no black key between them, so E up to F is only a half step. The same goes for B up to C.',
          target: { kind: 'notes', notes: ['E4', 'F4'] },
        },
        { kind: 'play', text: 'Your turn: tap B♭, a half step down from B.', target: { kind: 'notes', notes: ['Bb4'] } },
        { kind: 'play', text: 'Now tap the key a whole step up from E. Count two keys up, black or white.', target: { kind: 'notes', notes: ['F#4'] } },
        {
          kind: 'read',
          text: "In this level you'll find black keys by their sharp and flat names, and say which key is a half step or a whole step away from a note.",
        },
      ],
      questions: [
        { spec: { type: 'spell', about: 'notes', set: [], roots: BLACK_KEYS, guide: 'hint' }, weight: 2 },
        { spec: { type: 'fact', about: 'facts', set: ['halfStep', 'wholeStep'] }, weight: 3 },
        { spec: { type: 'spell', about: 'notes', set: [], roots: BLACK_KEYS, guide: 'none' }, weight: 2 },
        { spec: { type: 'identify', about: 'notes', set: [] }, weight: 1 },
      ],
      placement: [
        { type: 'spell', about: 'notes', set: [], roots: BLACK_KEYS, guide: 'none' },
        { type: 'fact', about: 'facts', set: ['halfStep', 'wholeStep'] },
      ],
    },
    {
      id: 'major-chords',
      title: 'Your first chord: major',
      summary: 'Build a major chord: start on a note, count up 4 keys, then 3 more.',
      intro: [
        {
          kind: 'see',
          text: 'A chord is a few notes played together. This is C major: C, E and G. Press One at a time to hear each note.',
          target: { kind: 'chord', root: 'C', chord: 'major' },
        },
        {
          kind: 'read',
          text: "Here's the recipe for a major chord. Start on a note, count up 4 keys to the next one, then 3 more. Count every key, black and white: from C, it's C♯, D, D♯, E, then F, F♯, G.",
        },
        {
          kind: 'see',
          text: 'The same recipe from F gives F, A and C: F major. The note a chord starts on is its root, and the chord is named after it.',
          target: { kind: 'chord', root: 'F', chord: 'major' },
        },
        {
          kind: 'play',
          text: 'Your turn: build D major. Start on D, count up 4 keys, then 3 more. Tap a key again to take it away.',
          target: { kind: 'chord', root: 'D', chord: 'major' },
        },
        {
          kind: 'read',
          text: "In this level you'll build major chords, with the recipe shown at first and then behind a hint. You'll also name a major chord that's lit up, by finding its root.",
        },
      ],
      questions: [
        { spec: { type: 'spell', about: 'chords', set: ['major'], guide: 'full' }, weight: 3 },
        { spec: { type: 'spell', about: 'chords', set: ['major'], guide: 'hint' }, weight: 3 },
        { spec: { type: 'identify', about: 'chords', set: ['major'], choices: 'root' }, weight: 2 },
      ],
      placement: [
        { type: 'spell', about: 'chords', set: ['major'], guide: 'none' },
        { type: 'identify', about: 'chords', set: ['major'], choices: 'root' },
      ],
    },
    {
      id: 'minor-chords',
      title: 'Minor chords',
      summary: 'Minor is major with the middle note one key lower.',
      intro: [
        { kind: 'see', text: "Here's C major again: C, E and G.", target: { kind: 'chord', root: 'C', chord: 'major' } },
        {
          kind: 'see',
          text: 'Move the middle note one key lower, from E to E♭, and you get C minor: C, E♭ and G.',
          target: { kind: 'chord', root: 'C', chord: 'minor' },
        },
        {
          kind: 'hear',
          text: 'Listen to the two. Many people hear major as bright, and minor as darker or sadder.',
          sounds: [
            { label: 'C major', target: { kind: 'chord', root: 'C', chord: 'major' } },
            { label: 'C minor', target: { kind: 'chord', root: 'C', chord: 'minor' } },
          ],
        },
        {
          kind: 'play',
          text: "Your turn: here's D major, already chosen. Make it D minor by moving the middle note one key lower.",
          target: { kind: 'chord', root: 'D', chord: 'minor' },
          start: ['D4', 'F#4', 'A4'],
        },
        {
          kind: 'play',
          text: 'Now build E minor from nothing. The recipe for minor: start on a note, count up 3 keys, then 4 more.',
          target: { kind: 'chord', root: 'E', chord: 'minor' },
        },
        {
          kind: 'read',
          text: "In this level you'll turn major chords into minor ones and back by moving one note, build minor chords, and tell major from minor when they're lit up.",
        },
      ],
      questions: [
        { spec: { type: 'change', about: 'chords', set: ['major', 'minor'], guide: 'full' }, weight: 3 },
        { spec: { type: 'change', about: 'chords', set: ['major', 'minor'], guide: 'hint' }, weight: 2 },
        { spec: { type: 'spell', about: 'chords', set: ['minor'], guide: 'hint' }, weight: 3 },
        { spec: { type: 'identify', about: 'chords', set: ['major', 'minor'] }, weight: 2 },
      ],
      placement: [
        { type: 'change', about: 'chords', set: ['major', 'minor'], guide: 'none' },
        { type: 'spell', about: 'chords', set: ['minor'], guide: 'none' },
      ],
    },
    {
      id: 'major-or-minor',
      title: 'Major or minor?',
      summary: 'Tell major from minor by ear, and play a chord back.',
      intro: [
        {
          kind: 'hear',
          text: "Now for your ears. Play C major, then C minor, and listen for the difference. Minor's middle note is one key lower.",
          sounds: [
            { label: 'C major', target: { kind: 'chord', root: 'C', chord: 'major' } },
            { label: 'C minor', target: { kind: 'chord', root: 'C', chord: 'minor' } },
          ],
        },
        {
          kind: 'hear',
          text: "The same two on E. The difference sounds the same whichever note they're on.",
          sounds: [
            { label: 'E major', target: { kind: 'chord', root: 'E', chord: 'major' } },
            { label: 'E minor', target: { kind: 'chord', root: 'E', chord: 'minor' } },
          ],
        },
        {
          kind: 'play',
          text: 'Listen to this chord. Its lowest note, C, is chosen for you: add the other two notes you hear. Major or minor?',
          target: { kind: 'chord', root: 'C', chord: 'minor' },
          start: ['C4'],
          listen: true,
        },
        {
          kind: 'read',
          text: "In this level you'll hear a chord and say whether it's major or minor. Then you'll hear one and play it back: its lowest note is chosen, and you add the rest. Play it again as often as you like.",
        },
      ],
      questions: [
        { spec: { type: 'hearQuality', about: 'chords', set: ['major', 'minor'] }, weight: 5 },
        { spec: { type: 'echo', about: 'chords', set: ['major', 'minor'] }, weight: 2 },
      ],
      placement: [
        { type: 'hearQuality', about: 'chords', set: ['major', 'minor'] },
        { type: 'echo', about: 'chords', set: ['major', 'minor'] },
      ],
    },
    {
      id: 'major-scale',
      title: 'The major scale',
      summary: 'Whole, whole, half, whole, whole, whole, half.',
      intro: [
        {
          kind: 'see',
          text: 'A scale is a set of notes played one after another, from a note up to the next note with the same name. This is the C major scale: every white key from C up to C.',
          target: { kind: 'scale', root: 'C', scale: 'major' },
        },
        {
          kind: 'see',
          text: 'Count the steps between its notes: whole, whole, half, whole, whole, whole, half. The two half steps are E to F and B to C, where there are no black keys between.',
          target: { kind: 'notes', notes: ['E4', 'F4', 'B4', 'C5'] },
        },
        {
          kind: 'see',
          text: 'Start the same pattern on G and you need one black key, F♯, to keep the steps right. That makes the G major scale.',
          target: { kind: 'scale', root: 'G', scale: 'major' },
        },
        {
          kind: 'play',
          text: 'Your turn: build the D major scale. Start on D and follow the pattern: whole, whole, half, whole, whole, whole, half. You need two black keys.',
          target: { kind: 'scale', root: 'D', scale: 'major' },
        },
        { kind: 'read', text: "In this level you'll build major scales, and fix a scale that has one wrong note." },
      ],
      questions: [
        { spec: { type: 'spell', about: 'scales', set: ['major'], guide: 'full' }, weight: 3 },
        { spec: { type: 'spell', about: 'scales', set: ['major'], guide: 'hint' }, weight: 3 },
        { spec: { type: 'fix', about: 'scales', set: ['major'], guide: 'hint' }, weight: 3 },
      ],
      placement: [
        { type: 'spell', about: 'scales', set: ['major'], guide: 'none' },
        { type: 'fix', about: 'scales', set: ['major'], guide: 'none' },
      ],
    },
    {
      id: 'intervals',
      title: 'How far apart: intervals',
      summary: 'Count the distance between two notes: 3rds, 5ths and octaves.',
      intro: [
        {
          kind: 'see',
          text: 'The distance between two notes is called an interval. Count it in letters: C, D, E is three letters, so C up to E is a 3rd.',
          target: { kind: 'interval', root: 'C', interval: 'M3' },
        },
        {
          kind: 'see',
          text: "C up to G is five letters, C, D, E, F, G, so it's a 5th. A major chord is a root with the 3rd and the 5th above it.",
          target: { kind: 'interval', root: 'C', interval: 'P5' },
        },
        {
          kind: 'see',
          text: 'C up to the next C is eight letters: an octave. The two notes sound so alike that they share a name.',
          target: { kind: 'interval', root: 'C', interval: 'P8' },
        },
        {
          kind: 'hear',
          text: 'Listen to each one. The octave sounds the most alike; many people hear the 5th as open and plain, and the 3rd as sweeter.',
          sounds: [
            { label: '3rd', target: { kind: 'interval', root: 'C', interval: 'M3' } },
            { label: '5th', target: { kind: 'interval', root: 'C', interval: 'P5' } },
            { label: 'Octave', target: { kind: 'interval', root: 'C', interval: 'P8' } },
          ],
        },
        {
          kind: 'read',
          text: "Their full names are major 3rd, perfect 5th and octave. The next level explains the first word. In this level you'll name them when they're lit up and when you hear them.",
        },
      ],
      questions: [
        { spec: { type: 'identify', about: 'intervals', set: ['M3', 'P5', 'P8'] }, weight: 3 },
        { spec: { type: 'hearQuality', about: 'intervals', set: ['M3', 'P5', 'P8'] }, weight: 4 },
      ],
      placement: [
        { type: 'identify', about: 'intervals', set: ['M3', 'P5', 'P8'] },
        { type: 'hearQuality', about: 'intervals', set: ['M3', 'P5', 'P8'] },
      ],
    },
    {
      id: 'interval-quality',
      title: 'Interval quality',
      summary: 'Major, minor and perfect: 2nds, 3rds, 4ths and 5ths.',
      intro: [
        {
          kind: 'see',
          text: 'C up to E is a 3rd that counts 4 keys up. That size of 3rd is called a major 3rd.',
          target: { kind: 'interval', root: 'C', interval: 'M3' },
        },
        {
          kind: 'see',
          text: "C up to E♭ spans the same three letters, so it's a 3rd too, but it's only 3 keys up: a minor 3rd. It's the note that changes between C major and C minor.",
          target: { kind: 'interval', root: 'C', interval: 'm3' },
        },
        {
          kind: 'hear',
          text: 'Listen to the two 3rds, one after the other.',
          sounds: [
            { label: 'Major 3rd', target: { kind: 'interval', root: 'C', interval: 'M3' } },
            { label: 'Minor 3rd', target: { kind: 'interval', root: 'C', interval: 'm3' } },
          ],
        },
        {
          kind: 'see',
          text: '2nds work the same way. A whole step, like C up to D, is a major 2nd. A half step, like C up to D♭, is a minor 2nd.',
          target: { kind: 'interval', root: 'C', interval: 'M2' },
        },
        {
          kind: 'see',
          text: '4ths, 5ths and octaves have one usual size, called perfect. C up to F is a perfect 4th, and C up to G is a perfect 5th.',
          target: { kind: 'interval', root: 'C', interval: 'P4' },
        },
        {
          kind: 'read',
          text: "In this level you'll name 2nds, 3rds, 4ths and 5ths when they're lit up, and hear a major 3rd against a minor 3rd.",
        },
      ],
      questions: [
        { spec: { type: 'identify', about: 'intervals', set: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5'] }, weight: 5 },
        { spec: { type: 'hearQuality', about: 'intervals', set: ['m3', 'M3'] }, weight: 3 },
      ],
      placement: [
        { type: 'identify', about: 'intervals', set: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5'] },
        { type: 'hearQuality', about: 'intervals', set: ['m3', 'M3'] },
      ],
    },
    {
      id: 'diminished-augmented',
      title: 'Diminished and augmented',
      summary: 'The other two kinds of three-note chord.',
      intro: [
        { kind: 'see', text: "Here's C minor: C, E♭ and G.", target: { kind: 'chord', root: 'C', chord: 'minor' } },
        {
          kind: 'see',
          text: 'Move its top note one key lower too, from G to G♭, and you get C diminished. It often sounds tense, as if it wants to move on.',
          target: { kind: 'chord', root: 'C', chord: 'diminished' },
        },
        {
          kind: 'see',
          text: "Now start from C major and move the top note one key higher, from G to G♯. That's C augmented, which often sounds dreamy and unsettled.",
          target: { kind: 'chord', root: 'C', chord: 'augmented' },
        },
        {
          kind: 'hear',
          text: 'All four kinds of three-note chord, on C. Play each one.',
          sounds: [
            { label: 'Major', target: { kind: 'chord', root: 'C', chord: 'major' } },
            { label: 'Minor', target: { kind: 'chord', root: 'C', chord: 'minor' } },
            { label: 'Diminished', target: { kind: 'chord', root: 'C', chord: 'diminished' } },
            { label: 'Augmented', target: { kind: 'chord', root: 'C', chord: 'augmented' } },
          ],
        },
        {
          kind: 'play',
          text: 'Your turn: build D diminished. The recipe: start on D, count up 3 keys, then 3 more.',
          target: { kind: 'chord', root: 'D', chord: 'diminished' },
        },
        {
          kind: 'read',
          text: "Augmented's recipe is 4 keys up, then 4 more. In this level you'll build both, change one chord into another by moving one note, and tell all four kinds apart by ear.",
        },
      ],
      questions: [
        { spec: { type: 'spell', about: 'chords', set: ['diminished', 'augmented'], guide: 'hint' }, weight: 3 },
        { spec: { type: 'change', about: 'chords', set: ['minor', 'diminished'], guide: 'hint' }, weight: 2 },
        { spec: { type: 'change', about: 'chords', set: ['major', 'augmented'], guide: 'hint' }, weight: 2 },
        { spec: { type: 'hearQuality', about: 'chords', set: ['major', 'minor', 'diminished', 'augmented'] }, weight: 3 },
      ],
      placement: [
        { type: 'spell', about: 'chords', set: ['diminished', 'augmented'], guide: 'none' },
        { type: 'hearQuality', about: 'chords', set: ['major', 'minor', 'diminished', 'augmented'] },
      ],
    },
    {
      id: 'key-signatures',
      title: 'Key signatures and the circle of fifths',
      summary: 'The sharps or flats in each key, and how the keys line up.',
      intro: [
        { kind: 'see', text: 'The C major scale uses only white keys: no sharps or flats.', target: { kind: 'scale', root: 'C', scale: 'major' } },
        {
          kind: 'see',
          text: 'G major needs one sharp, F♯. Every major scale has its own set of sharps or flats, called its key signature.',
          target: { kind: 'scale', root: 'G', scale: 'major' },
        },
        { kind: 'see', text: 'F major needs one flat, B♭.', target: { kind: 'scale', root: 'F', scale: 'major' } },
        {
          kind: 'read',
          text: 'Count up a 5th from C and you reach G, with one sharp. A 5th up from G is D, with two: F♯ and C♯. Each 5th up adds a sharp, and each 5th down adds a flat: F has one, B♭ has two. Put the keys in a ring and you get the circle of fifths. You can tap it in Explore.',
        },
        {
          kind: 'read',
          text: "When music mostly uses the notes of one scale, it's in that key: music in D major mostly uses the notes of the D major scale. In this level you'll count the sharps or flats in a key, name a key's notes, and build major scales with no help.",
        },
      ],
      questions: [
        { spec: { type: 'fact', about: 'facts', set: ['keySignature'] }, weight: 4 },
        { spec: { type: 'fact', about: 'facts', set: ['scaleDegree'] }, weight: 3 },
        { spec: { type: 'spell', about: 'scales', set: ['major'], guide: 'none' }, weight: 2 },
      ],
    },
  ],
};
