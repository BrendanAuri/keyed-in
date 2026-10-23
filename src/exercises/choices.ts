/**
 * Questions answered with buttons (SPEC §8): identify (keys → name),
 * hearQuality (sound → name) and fact (name → name).
 */
import { HEAR_ROOT_RANGE, MAX_CHOICES, QUESTION_OCTAVE, SEMITONES_PER_OCTAVE } from '../constants';
import { integer, pick, shuffle, type Rng } from '../game/rng';
import { chordName, chordTypeOf } from '../theory/chords';
import { intervalName, intervalOf } from '../theory/intervals';
import { key, keyName, keySignature, keySignatureNotes, relativeKey } from '../theory/keys';
import { bothSpellings, formatNote, mod, noteFromPitchClass, pitchClass, pitchFromMidi, type Note } from '../theory/notes';
import { buildScale, scaleName, scaleTypeOf } from '../theory/scales';
import { differenceLines } from './feedback';
import { COMMON_ROOTS, listNotes, ordinal, rootNote, targetNotes, voiceTarget } from './targets';
import type { ChoiceQuestion, FactKind, Feedback, QuestionSpec, Result, Target } from './types';

/** Chord types used to make a choice when a question's set has only one. */
const CONTRAST: Readonly<Record<string, string>> = { major: 'minor', minor: 'major', diminished: 'minor', augmented: 'major' };

function pickRoot(spec: QuestionSpec, rng: Rng): Note {
  return rootNote(pick(rng, spec.roots ?? COMMON_ROOTS));
}

/** The right answer plus up to MAX_CHOICES − 1 others from `pool`, shuffled. */
function choicesFrom<T>(rng: Rng, answer: T, pool: readonly T[]): { readonly options: T[]; readonly correct: number } {
  const others = shuffle(
    rng,
    pool.filter((x) => x !== answer),
  ).slice(0, MAX_CHOICES - 1);
  const options = shuffle(rng, [answer, ...others]);
  return { options, correct: options.indexOf(answer) };
}

/** A question's set, with a contrasting type added if it has only one, so there's always a choice. */
function chordPool(set: readonly string[]): string[] {
  if (set.length > 1) return [...set];
  const only = set[0] ?? 'major';
  return [only, CONTRAST[only] ?? 'major'];
}

function base(fields: Pick<ChoiceQuestion, 'type' | 'item' | 'prompt' | 'choices' | 'correct'> & Partial<ChoiceQuestion>): ChoiceQuestion {
  return { choiceTargets: null, shown: [], sound: null, rootMidi: null, explanation: null, hideNames: false, ...fields };
}

export function generateIdentify(spec: QuestionSpec, rng: Rng): ChoiceQuestion {
  const root = pickRoot(spec, rng);
  if (spec.about === 'notes') {
    const { options, correct } = choicesFrom(rng, pitchClass(root), Array.from({ length: SEMITONES_PER_OCTAVE }, (_, i) => i));
    return base({
      type: 'identify',
      item: `identify:note@${formatNote(root, 'ascii')}`,
      prompt: 'Which note is lit?',
      choices: options.map(bothSpellings),
      correct,
      choiceTargets: options.map((pc) => ({ kind: 'note', note: noteFromPitchClass(pc, 'flat') })),
      shown: voiceTarget({ kind: 'note', note: root }, QUESTION_OCTAVE),
      hideNames: true,
    });
  }
  if (spec.about === 'intervals') {
    const interval = pick(rng, spec.set);
    const { options, correct } = choicesFrom(rng, interval, spec.set.length > 1 ? spec.set : ['M3', 'm3']);
    return base({
      type: 'identify',
      item: `identify:${interval}@${formatNote(root, 'ascii')}`,
      prompt: 'How far apart are these two notes?',
      choices: options.map((i) => capitalise(intervalName(intervalOf(i)))),
      correct,
      choiceTargets: options.map((i) => ({ kind: 'interval', root, interval: i })),
      shown: voiceTarget({ kind: 'interval', root, interval }, QUESTION_OCTAVE),
    });
  }
  const chordTypeId = pick(rng, spec.set);
  const { options, correct } = choicesFrom(rng, chordTypeId, chordPool(spec.set));
  return base({
    type: 'identify',
    item: `identify:${chordTypeId}@${formatNote(root, 'ascii')}`,
    prompt: 'Which chord is lit?',
    choices: options.map((t) => chordName(root, t)),
    correct,
    choiceTargets: options.map((t) => ({ kind: 'chord', root, chordTypeId: t })),
    shown: voiceTarget({ kind: 'chord', root, chordTypeId }, QUESTION_OCTAVE),
  });
}

export function generateHearQuality(spec: QuestionSpec, rng: Rng): ChoiceQuestion {
  // A random register, so what's learned is the sound of "minor", not of one minor chord.
  const rootMidi = integer(rng, HEAR_ROOT_RANGE[0], HEAR_ROOT_RANGE[1]);
  const root = pitchFromMidi(rootMidi, 'flat');
  const octave = root.octave;
  if (spec.about === 'intervals') {
    const interval = pick(rng, spec.set);
    const { options, correct } = choicesFrom(rng, interval, spec.set.length > 1 ? spec.set : ['M3', 'm3']);
    const targets: Target[] = options.map((i) => ({ kind: 'interval', root, interval: i }));
    return base({
      type: 'hearQuality',
      item: `hearQuality:${interval}`,
      prompt: 'Listen. Which interval is it?',
      choices: options.map((i) => capitalise(intervalName(intervalOf(i)))),
      correct,
      choiceTargets: targets,
      sound: { midis: voiceTarget({ kind: 'interval', root, interval }, octave), style: 'interval' },
      rootMidi,
    });
  }
  if (spec.about === 'scales') {
    const scaleTypeId = pick(rng, spec.set);
    const { options, correct } = choicesFrom(rng, scaleTypeId, spec.set.length > 1 ? spec.set : ['major', 'naturalMinor']);
    return base({
      type: 'hearQuality',
      item: `hearQuality:${scaleTypeId}`,
      prompt: 'Listen. Which scale is it?',
      choices: options.map((s) => capitalise(scaleTypeOf(s).name)),
      correct,
      choiceTargets: options.map((s) => ({ kind: 'scale', root, scaleTypeId: s })),
      sound: { midis: voiceTarget({ kind: 'scale', root, scaleTypeId }, octave), style: 'scale' },
      rootMidi,
    });
  }
  const chordTypeId = pick(rng, spec.set);
  const { options, correct } = choicesFrom(rng, chordTypeId, chordPool(spec.set));
  return base({
    type: 'hearQuality',
    item: `hearQuality:${chordTypeId}`,
    prompt: 'Listen. Which kind of chord is it?',
    choices: options.map((t) => capitalise(chordTypeOf(t).name)),
    correct,
    choiceTargets: options.map((t) => ({ kind: 'chord', root, chordTypeId: t })),
    sound: { midis: voiceTarget({ kind: 'chord', root, chordTypeId }, octave), style: 'chord' },
    rootMidi,
  });
}

/** "3 flats", "1 sharp", "no sharps or flats". */
function signatureLabel(count: number): string {
  if (count === 0) return 'No sharps or flats';
  const n = Math.abs(count);
  return `${n} ${count > 0 ? 'sharp' : 'flat'}${n === 1 ? '' : 's'}`;
}

export function generateFact(spec: QuestionSpec, rng: Rng): ChoiceQuestion {
  const kind = pick(rng, spec.set) as FactKind;
  const root = pickRoot(spec, rng);
  const id = `fact:${kind}@${formatNote(root, 'ascii')}`;
  switch (kind) {
    case 'keySignature': {
      const k = key(root, 'major');
      const count = keySignature(k);
      const near = [count - 2, count - 1, count + 1, count + 2, -count].filter((c) => c !== count && Math.abs(c) <= 7);
      const { options, correct } = choicesFrom(rng, count, [...new Set(near)]);
      const accidentals = keySignatureNotes(k);
      return base({
        type: 'fact',
        item: id,
        prompt: `How many sharps or flats are in ${keyName(k)}?`,
        choices: options.map(signatureLabel),
        correct,
        explanation: `${keyName(k)} has ${signatureLabel(count).toLowerCase()}${accidentals.length > 0 ? `: ${listNotes(accidentals)}` : ''}.`,
      });
    }
    case 'relativeMinor': {
      const k = key(root, 'major');
      const relative = relativeKey(k);
      const others = COMMON_ROOTS.map(rootNote).filter((n) => pitchClass(n) !== pitchClass(relative.tonic));
      const { options, correct } = choicesFrom(rng, keyName(relative), others.map((n) => keyName(key(n, 'minor'))));
      return base({
        type: 'fact',
        item: id,
        prompt: `What's the relative minor of ${keyName(k)}?`,
        choices: options,
        correct,
        explanation: `${keyName(relative)} has the same notes as ${keyName(k)}. To find it, count down 3 keys from ${formatNote(root)}.`,
      });
    }
    case 'scaleDegree': {
      const scale = buildScale(root, 'major');
      const degree = integer(rng, 2, scale.length);
      const answer = scale[degree - 1] ?? root;
      const { options, correct } = choicesFrom(
        rng,
        formatNote(answer),
        scale.filter((n) => n !== answer).map((n) => formatNote(n)),
      );
      return base({
        type: 'fact',
        item: `fact:scaleDegree${degree}@${formatNote(root, 'ascii')}`,
        prompt: `What's the ${ordinal(degree)} note of the ${scaleName(root, 'major')} scale?`,
        choices: options,
        correct,
        explanation: `The ${scaleName(root, 'major')} scale is ${listNotes(scale)}, so its ${ordinal(degree)} note is ${formatNote(answer)}.`,
      });
    }
    case 'halfStep':
    case 'wholeStep': {
      const size = kind === 'halfStep' ? 1 : 2;
      const up = rng() < 0.5;
      const start = pitchClass(root);
      const answer = mod(start + (up ? size : -size), SEMITONES_PER_OCTAVE);
      const pool = [-3, -2, -1, 1, 2, 3].map((d) => mod(start + d, SEMITONES_PER_OCTAVE));
      const { options, correct } = choicesFrom(rng, answer, pool);
      const step = kind === 'halfStep' ? 'half step' : 'whole step';
      return base({
        type: 'fact',
        item: `fact:${kind}${up ? 'Up' : 'Down'}@${formatNote(root, 'ascii')}`,
        prompt: `What's a ${step} ${up ? 'up' : 'down'} from ${formatNote(root)}?`,
        choices: options.map(bothSpellings),
        correct,
        explanation:
          kind === 'halfStep'
            ? `A half step is the very next key, black or white: ${formatNote(root)} to ${bothSpellings(answer)}.`
            : `A whole step skips one key: ${formatNote(root)} to ${bothSpellings(answer)}.`,
      });
    }
  }
}

export function checkChoice(q: ChoiceQuestion, index: number): Result {
  return { correct: index === q.correct, partial: false };
}

/** The notes a choice stands for, on the question's root (MIDI), for Yours, Correct and A-B. */
export function choiceKeys(q: ChoiceQuestion, index: number): number[] {
  const target = q.choiceTargets?.[index];
  if (!target) return [];
  const octave = q.rootMidi === null ? QUESTION_OCTAVE : pitchFromMidi(q.rootMidi, 'flat').octave;
  return voiceTarget(target, octave);
}

export function choiceFeedback(q: ChoiceQuestion, index: number, result: Result): Feedback {
  const right = choiceWords(q, q.correct);
  const chosen = choiceWords(q, index);
  const answerTarget = q.choiceTargets?.[q.correct];
  const chosenTarget = q.choiceTargets?.[index];
  const yours = choiceKeys(q, index);
  const correct = q.shown.length > 0 ? [...q.shown] : (q.sound?.midis ?? choiceKeys(q, q.correct)).slice();
  const lines: string[] = [];
  if (!result.correct) lines.push(`You chose ${chosen}; it's ${right}.`);
  if (q.explanation) lines.push(q.explanation);
  if (answerTarget?.kind === 'chord' && q.type === 'identify') lines.push(`${chordName(answerTarget.root, answerTarget.chordTypeId)} is ${listNotes(targetNotes(answerTarget))}.`);
  if (!result.correct && answerTarget?.kind === 'chord' && chosenTarget?.kind === 'chord') {
    lines.push(...differenceLines(answerTarget.root, chosenTarget.chordTypeId, answerTarget.chordTypeId));
  }
  if (!result.correct && q.type === 'hearQuality') lines.push('Press A-B to hear the two back to back.');
  return { headline: result.correct ? 'Yes, that\'s it.' : 'Not quite.', lines, yours, correct };
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A choice as it reads mid-sentence: "minor", "a major 3rd", "Dorian", "C minor", "no sharps or flats". */
function choiceWords(q: ChoiceQuestion, index: number): string {
  const target = q.choiceTargets?.[index];
  if (!target) return (q.choices[index] ?? '').replace(/^No /, 'no ');
  switch (target.kind) {
    case 'note':
      return bothSpellings(pitchClass(target.note));
    case 'chord':
      return q.type === 'hearQuality' ? chordTypeOf(target.chordTypeId).name : chordName(target.root, target.chordTypeId);
    case 'interval':
      return `a ${intervalName(intervalOf(target.interval))}`;
    case 'scale':
      return scaleTypeOf(target.scaleTypeId).name;
  }
}
