/**
 * Questions answered on the keyboard (SPEC §8): spell (name → keys), change
 * (keys and a new name → keys, by moving one note), fix (find the wrong note)
 * and echo (hear it, play it back). Answers are checked by pitch class, so
 * any octave and any order is right.
 */
import { QUESTION_OCTAVE, SEMITONES_PER_OCTAVE } from '../constants';
import { pick, type Rng } from '../game/rng';
import { chordName } from '../theory/chords';
import { intervalOf, semitones } from '../theory/intervals';
import { formatNote, midi, mod, pitch, pitchClass, type Note } from '../theory/notes';
import { chordTypeOn, differenceLines, playedLine, spellKeys } from './feedback';
import { COMMON_ROOTS, listNotes, recipe, rootNote, targetName, targetNotes, targetPitchClasses, voiceTarget } from './targets';
import type { Feedback, Guide, KeysQuestion, QuestionSpec, Result, Target } from './types';

/**
 * Chord pairs one note apart, for change questions: [from, to]. Each way round,
 * so both "make it minor" and "make it major" come up.
 */
export const CHANGE_PAIRS: readonly (readonly [string, string])[] = [
  ['major', 'minor'],
  ['minor', 'major'],
  ['major', 'augmented'],
  ['augmented', 'major'],
  ['minor', 'diminished'],
  ['diminished', 'minor'],
  ['major', 'sus4'],
  ['sus4', 'major'],
  ['major', 'sus2'],
  ['sus2', 'major'],
  ['dominant7', 'major7'],
  ['major7', 'dominant7'],
  ['dominant7', 'minor7'],
  ['minor7', 'dominant7'],
];

function pickRoot(spec: QuestionSpec, rng: Rng): Note {
  return rootNote(pick(rng, spec.roots ?? COMMON_ROOTS));
}

function rootId(n: Note): string {
  return formatNote(n, 'ascii');
}

/** The pieces every keyboard question has, with the guide's recipe filled in. */
function keysQuestion(fields: Omit<KeysQuestion, 'recipe' | 'guide' | 'hideNames' | 'sound'> & Partial<KeysQuestion>, guide: Guide): KeysQuestion {
  return { guide, recipe: guide === 'none' ? null : recipe(fields.target), sound: null, hideNames: false, ...fields };
}

export function generateSpell(spec: QuestionSpec, rng: Rng): KeysQuestion {
  const guide = spec.guide ?? 'none';
  const root = pickRoot(spec, rng);
  const lit = (t: Target) => (guide === 'none' ? [] : [voiceTarget(t, QUESTION_OCTAVE)[0] ?? 0]);
  if (spec.about === 'notes') {
    const target: Target = { kind: 'note', note: root };
    // With no help, names on the keys would give the answer away.
    return keysQuestion({ type: 'spell', item: `spell:note@${rootId(root)}`, prompt: `Find ${formatNote(root)}.`, target, shown: [], start: [], hideNames: guide === 'none' }, guide);
  }
  if (spec.about === 'scales') {
    const scaleTypeId = pick(rng, spec.set);
    const target: Target = { kind: 'scale', root, scaleTypeId };
    return keysQuestion(
      { type: 'spell', item: `spell:${scaleTypeId}@${rootId(root)}`, prompt: `Tap the notes of ${targetName(target)}.`, target, shown: lit(target), start: [] },
      guide,
    );
  }
  const chordTypeId = pick(rng, spec.set);
  const target: Target = { kind: 'chord', root, chordTypeId };
  return keysQuestion(
    { type: 'spell', item: `spell:${chordTypeId}@${rootId(root)}`, prompt: `Tap the notes of ${targetName(target)}.`, target, shown: lit(target), start: [] },
    guide,
  );
}

export function generateChange(spec: QuestionSpec, rng: Rng): KeysQuestion {
  const guide = spec.guide ?? 'none';
  const inSet = CHANGE_PAIRS.filter(([from, to]) => spec.set.includes(from) && spec.set.includes(to));
  const pairs = inSet.length > 0 ? inSet : CHANGE_PAIRS.filter(([from]) => spec.set.includes(from));
  const [from, to] = pick(rng, pairs.length > 0 ? pairs : CHANGE_PAIRS);
  const root = pickRoot(spec, rng);
  const start = voiceTarget({ kind: 'chord', root, chordTypeId: from }, QUESTION_OCTAVE);
  const target: Target = { kind: 'chord', root, chordTypeId: to };
  const q = keysQuestion(
    {
      type: 'change',
      item: `change:${from}>${to}@${rootId(root)}`,
      prompt: `Here's ${chordName(root, from)}. Make it ${chordName(root, to)} by moving one note.`,
      target,
      shown: [],
      start,
    },
    guide,
  );
  return { ...q, recipe: guide === 'none' ? null : moveRecipe(root, from, to) };
}

/** "Move E down 1 key, to E♭." */
function moveRecipe(root: Note, from: string, to: string): string {
  const fromNotes = targetNotes({ kind: 'chord', root, chordTypeId: from });
  const toNotes = targetNotes({ kind: 'chord', root, chordTypeId: to });
  const leaving = fromNotes.find((n) => !toNotes.some((m) => pitchClass(m) === pitchClass(n)));
  const arriving = toNotes.find((n) => !fromNotes.some((m) => pitchClass(m) === pitchClass(n)));
  if (!leaving || !arriving) return differenceLines(root, from, to).join(' ');
  const gap = mod(pitchClass(arriving) - pitchClass(leaving) + SEMITONES_PER_OCTAVE / 2, SEMITONES_PER_OCTAVE) - SEMITONES_PER_OCTAVE / 2;
  const keys = Math.abs(gap);
  return `Move ${formatNote(leaving)} ${gap < 0 ? 'down' : 'up'} ${keys} ${keys === 1 ? 'key' : 'keys'}, to ${formatNote(arriving)}.`;
}

export function generateFix(spec: QuestionSpec, rng: Rng): KeysQuestion {
  const guide = spec.guide ?? 'none';
  const root = pickRoot(spec, rng);
  const target: Target =
    spec.about === 'scales' ? { kind: 'scale', root, scaleTypeId: pick(rng, spec.set) } : { kind: 'chord', root, chordTypeId: pick(rng, spec.set) };
  const keys = voiceTarget(target, QUESTION_OCTAVE);
  const pcs = targetPitchClasses(target);
  // Move one note other than the root (and the top of a scale) a key up or down, to a note the target doesn't have.
  const options = keys.flatMap((m, i) =>
    i === 0 || (target.kind === 'scale' && i === keys.length - 1)
      ? []
      : [m - 1, m + 1].filter((wrong) => !pcs.includes(mod(wrong, SEMITONES_PER_OCTAVE)) && !keys.includes(wrong)).map((wrong) => ({ i, wrong })),
  );
  const change = options.length > 0 ? pick(rng, options) : null;
  const start = change ? keys.map((m, i) => (i === change.i ? change.wrong : m)) : keys;
  const id = target.kind === 'scale' ? target.scaleTypeId : target.kind === 'chord' ? target.chordTypeId : '';
  return keysQuestion(
    {
      type: 'fix',
      item: `fix:${id}@${rootId(root)}`,
      prompt: `This should be ${targetName(target)}, but one note is wrong. Fix it.`,
      target,
      shown: [],
      start,
    },
    guide,
  );
}

export function generateEcho(spec: QuestionSpec, rng: Rng): KeysQuestion {
  const root = pickRoot(spec, rng);
  const rootKey = midi(pitch(root.letter, root.accidental, QUESTION_OCTAVE));
  if (spec.about === 'intervals') {
    const interval = pick(rng, spec.set);
    const target: Target = { kind: 'interval', root, interval };
    return keysQuestion(
      {
        type: 'echo',
        item: `echo:${interval}`,
        prompt: `Here's ${formatNote(root)}. Listen, then play both notes you hear.`,
        target,
        shown: [rootKey],
        start: [],
        sound: [rootKey, rootKey + semitones(intervalOf(interval))],
      },
      'none',
    );
  }
  const chordTypeId = pick(rng, spec.set);
  const target: Target = { kind: 'chord', root, chordTypeId };
  return keysQuestion(
    {
      type: 'echo',
      item: `echo:${chordTypeId}`,
      prompt: `Here's ${formatNote(root)}, the lowest note. Listen, then play the chord you hear.`,
      target,
      shown: [rootKey],
      start: [],
      sound: voiceTarget(target, QUESTION_OCTAVE),
    },
    'none',
  );
}

/** Right when the keys lit are exactly the target's notes, in any octave. */
export function checkKeys(q: KeysQuestion, midis: readonly number[]): Result {
  const played = new Set(midis.map((m) => mod(m, SEMITONES_PER_OCTAVE)));
  const wanted = targetPitchClasses(q.target);
  const hits = wanted.filter((pc) => played.has(pc)).length;
  const extras = [...played].filter((pc) => !wanted.includes(pc)).length;
  const correct = hits === wanted.length && extras === 0;
  return { correct, partial: !correct && hits > 0 && extras === 0 };
}

export function keysFeedback(q: KeysQuestion, midis: readonly number[], result: Result): Feedback {
  const answer = targetNotes(q.target);
  const correctKeys = q.sound ?? voiceTarget(q.target, QUESTION_OCTAVE);
  const yours = [...midis].sort((a, b) => a - b);
  const name = targetName(q.target);
  const asked = `${capitalise(name)} is ${listNotes(answer)}.`;
  if (result.correct) return { headline: "Yes, that's it.", lines: [asked], yours, correct: correctKeys };

  const played = new Set(midis.map((m) => mod(m, SEMITONES_PER_OCTAVE)));
  const missing = answer.filter((n) => !played.has(pitchClass(n)));
  const extra = spellKeys(midis, answer).filter((n) => !answer.some((a) => pitchClass(a) === pitchClass(n)));
  const lines = [playedLine(midis, answer), asked];
  if (missing.length > 0) lines.push(`Missing: ${listNotes(missing)}.`);
  if (extra.length > 0) lines.push(`Not in it: ${listNotes(extra)}.`);
  if (q.target.kind === 'chord') {
    const playedType = chordTypeOn(midis, q.target.root);
    if (playedType && playedType !== q.target.chordTypeId) lines.push(...differenceLines(q.target.root, playedType, q.target.chordTypeId));
  }
  return { headline: result.partial ? 'Nearly.' : 'Not quite.', lines, yours, correct: correctKeys };
}

/** With full help, what to say when a key that isn't in the target is lit: "E isn't in C minor." */
export function wrongKeyTip(q: KeysQuestion, key: number): string | null {
  if (q.guide !== 'full') return null;
  const pc = mod(key, SEMITONES_PER_OCTAVE);
  if (targetPitchClasses(q.target).includes(pc)) return null;
  const answer = targetNotes(q.target);
  const [tapped] = spellKeys([key], answer);
  if (!tapped) return null;
  if (q.target.kind === 'note') return `That's ${formatNote(tapped)}. ${recipe(q.target)}`;
  return `${formatNote(tapped)} isn't in ${targetName(q.target)}. ${recipe(q.target)}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** How many notes two chords on the same root don't share: 2 when one note has moved. */
export function notesApart(root: Note, from: string, to: string): number {
  const a = new Set(targetNotes({ kind: 'chord', root, chordTypeId: from }).map(pitchClass));
  const b = new Set(targetNotes({ kind: 'chord', root, chordTypeId: to }).map(pitchClass));
  return [...a].filter((pc) => !b.has(pc)).length + [...b].filter((pc) => !a.has(pc)).length;
}
