/**
 * A level intro's keys, apart from React (SPEC §9.1): what a step lights and
 * calls each key, how it sounds, whether the keys chosen in a "your turn"
 * step are right, and one keyboard size for the whole intro, so the keyboard
 * keeps its size from step to step.
 */
import { chordEvents, eventsEnd, scaleEvents, type NoteEvent } from '../audio/schedule';
import { AB_GAP_SECONDS, KEYBOARD_MAX_OCTAVES, QUESTION_OCTAVE, SEMITONES_PER_OCTAVE } from '../constants';
import type { IntroStep, IntroTarget } from '../content/schema';
import { spellKeys } from '../exercises/feedback';
import { listNotes, recipe, rootNote, targetName, targetNotes, voiceTarget, whereIs } from '../exercises/targets';
import type { Target } from '../exercises/types';
import { formatNote, midi, mod, parsePitch, pitchClass, type Note } from '../theory/notes';
import { cAtOrBelow, octavesToShow } from './keyboardLayout';
import { lowestNoteForOctave } from './keyboardMap';

/** The question types' own target, for everything but a list of notes. */
function asTarget(t: IntroTarget): Target | null {
  switch (t.kind) {
    case 'notes':
      return null;
    case 'chord':
      return { kind: 'chord', root: rootNote(t.root), chordTypeId: t.chord };
    case 'interval':
      return { kind: 'interval', root: rootNote(t.root), interval: t.interval };
    case 'scale':
      return { kind: 'scale', root: rootNote(t.root), scaleTypeId: t.scale };
  }
}

/** Pitches from content; content is checked, so a typo is a bug. */
function pitchMidi(text: string): number {
  const p = parsePitch(text);
  if (!p) throw new Error(`Not a pitch: "${text}"`);
  return midi(p);
}

/** The target's notes, spelled. */
function spelledNotes(t: IntroTarget): Note[] {
  const target = asTarget(t);
  if (target) return targetNotes(target);
  return t.kind === 'notes' ? t.notes.flatMap((n) => parsePitch(n) ?? []) : [];
}

export interface IntroKeys {
  /** MIDI, lowest first. */
  readonly keys: readonly number[];
  /** Each key's spelled name. */
  readonly labels: ReadonlyMap<number, string>;
  /** The root, drawn stronger; none for a list of notes. */
  readonly roots: ReadonlySet<number>;
}

export function introKeys(t: IntroTarget): IntroKeys {
  const target = asTarget(t);
  const keys = target ? voiceTarget(target, QUESTION_OCTAVE) : t.kind === 'notes' ? t.notes.map(pitchMidi).sort((a, b) => a - b) : [];
  const spelled = spelledNotes(t);
  const labels = new Map(
    keys.map((m) => {
      const n = spelled.find((s) => pitchClass(s) === mod(m, SEMITONES_PER_OCTAVE));
      return [m, n ? formatNote(n) : ''] as const;
    }),
  );
  return { keys, labels, roots: new Set(target ? keys.slice(0, 1) : []) };
}

/** How a target sounds: a chord together (or one note at a time), an interval one note then both, notes and scales one after another. */
export function introEvents(t: IntroTarget, oneAtATime = false): NoteEvent[] {
  const { keys } = introKeys(t);
  if (t.kind === 'chord') return chordEvents(keys, oneAtATime ? 'arpeggio' : 'together');
  if (t.kind === 'interval') {
    const apart = chordEvents(keys, 'arpeggio');
    return [...apart, ...chordEvents(keys).map((e) => ({ ...e, at: e.at + eventsEnd(apart) }))];
  }
  return keys.length === 1 ? chordEvents(keys) : scaleEvents(keys);
}

/** Several targets one after another, with a short gap, for comparing them. */
export function introSequence(targets: readonly IntroTarget[]): NoteEvent[] {
  const events: NoteEvent[] = [];
  let at = 0;
  for (const t of targets) {
    const next = introEvents(t);
    events.push(...next.map((e) => ({ ...e, at: e.at + at })));
    at += eventsEnd(next) + AB_GAP_SECONDS;
  }
  return events;
}

function targetPitchClasses(t: IntroTarget): Set<number> {
  return new Set(introKeys(t).keys.map((m) => mod(m, SEMITONES_PER_OCTAVE)));
}

/** Right when the keys chosen are exactly the target's notes, in any octave. */
export function isPlayRight(t: IntroTarget, chosen: Iterable<number>): boolean {
  const wanted = targetPitchClasses(t);
  const played = new Set([...chosen].map((m) => mod(m, SEMITONES_PER_OCTAVE)));
  return played.size === wanted.size && [...played].every((pc) => wanted.has(pc));
}

/** What to say when a key that isn't part of the target is chosen: "That's D. C is the white key just left of the two black keys." */
export function playTip(t: IntroTarget, key: number): string | null {
  if (targetPitchClasses(t).has(mod(key, SEMITONES_PER_OCTAVE))) return null;
  const answer = spelledNotes(t);
  const [tapped] = spellKeys([key], answer);
  if (!tapped) return null;
  const target = asTarget(t);
  if (!target) {
    const only = answer.length === 1 ? answer[0] : undefined;
    return only ? `That's ${formatNote(tapped)}. ${whereIs(only)}` : `That's ${formatNote(tapped)}, which isn't one of them.`;
  }
  return `${formatNote(tapped)} isn't in ${targetName(target)}. ${recipe(target)}`;
}

/** "Yes, that's it. D major is D, F♯ and A." */
export function playDone(t: IntroTarget): string {
  const target = asTarget(t);
  const notes = spelledNotes(t);
  if (!target) return notes.length === 1 ? `Yes, that's ${listNotes(notes)}.` : "Yes, that's it.";
  const name = targetName(target);
  return `Yes, that's it. ${name.charAt(0).toUpperCase()}${name.slice(1)} is ${listNotes(notes)}.`;
}

/** Every key an intro lights, plays or starts chosen. */
function introKeysUsed(steps: readonly IntroStep[]): number[] {
  return steps.flatMap((step) => {
    switch (step.kind) {
      case 'read':
        return [];
      case 'see':
        return [...introKeys(step.target).keys];
      case 'hear':
        return step.sounds.flatMap((s) => introKeys(s.target).keys);
      case 'play':
        return [...introKeys(step.target).keys, ...(step.start ?? []).map(pitchMidi)];
    }
  });
}

/** One keyboard for the whole intro: from the question octave's C (or lower if needed), wide enough for every step. */
export function introKeyboard(steps: readonly IntroStep[], minimumOctaves: number): { readonly lowestNote: number; readonly octaves: number } {
  const home = lowestNoteForOctave(QUESTION_OCTAVE);
  const used = introKeysUsed(steps);
  const lowestNote = Math.min(home, cAtOrBelow(Math.min(home, ...used)));
  return { lowestNote, octaves: octavesToShow(lowestNote, Math.max(lowestNote, ...used), minimumOctaves, KEYBOARD_MAX_OCTAVES) };
}

/** The keys a "your turn" step starts with chosen. */
export function playStart(step: Extract<IntroStep, { kind: 'play' }>): number[] {
  return (step.start ?? []).map(pitchMidi);
}
