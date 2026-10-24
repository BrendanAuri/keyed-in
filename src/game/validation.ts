/**
 * Content checks, run over every shipped pack in a test: ids, intros whose
 * keys exist, and question specs the question types can make (each checked
 * against `exercises/catalogue.ts`).
 */
import type { IntroTarget, Level, Pack } from '../content/schema';
import { EXERCISES, setOptions } from '../exercises/catalogue';
import { generateQuestion } from '../exercises/questions';
import type { QuestionSpec } from '../exercises/types';
import { getChordType } from '../theory/chords';
import { parseInterval } from '../theory/intervals';
import { parseNote, parsePitch } from '../theory/notes';
import { getScaleType } from '../theory/scales';
import { createRng } from './rng';

const PACK_ID = /^[a-z0-9][a-z0-9.-]*$/;
const LEVEL_ID = /^[a-z0-9][a-z0-9-]*$/;
/** Questions made from each spec to be sure it can make them. */
const SAMPLE_QUESTIONS = 20;

function duplicates(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, i) => values.indexOf(value) !== i))];
}

/** A spec the question types can make questions from. */
export function checkSpec(spec: QuestionSpec, where: string, errors: string[]): void {
  const info = EXERCISES.find((e) => e.type === spec.type);
  if (!info) {
    errors.push(`${where}: unknown question type "${spec.type}"`);
    return;
  }
  if (!info.abouts.includes(spec.about)) {
    errors.push(`${where}: ${spec.type} can't be about ${spec.about}`);
    return;
  }
  const before = errors.length;
  const allowed = setOptions(spec.type, spec.about).map((o) => o.id);
  if (spec.about === 'notes' && spec.set.length > 0) errors.push(`${where}: questions about notes take no set`);
  if (spec.about !== 'notes' && spec.set.length === 0) errors.push(`${where}: the set is empty`);
  for (const id of spec.set) if (!allowed.includes(id)) errors.push(`${where}: "${id}" can't go in a ${spec.type} set about ${spec.about}`);
  for (const id of duplicates(spec.set)) errors.push(`${where}: "${id}" is in the set twice`);
  if (spec.roots !== undefined) {
    if (spec.roots.length === 0) errors.push(`${where}: roots is empty (leave it out for every root)`);
    for (const root of spec.roots) if (!parseNote(root)) errors.push(`${where}: "${root}" isn't a note`);
  }
  if (spec.guide !== undefined && spec.guide !== 'none' && !info.guided) errors.push(`${where}: ${spec.type} takes no help`);
  if (spec.choices === 'root' && (spec.type !== 'identify' || spec.about !== 'chords')) errors.push(`${where}: only naming chords can choose between roots`);
  if (errors.length > before) return;
  try {
    for (let seed = 0; seed < SAMPLE_QUESTIONS; seed++) generateQuestion(spec, createRng(seed));
  } catch (error) {
    errors.push(`${where}: can't make a question: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkTarget(target: IntroTarget, where: string, errors: string[]): void {
  switch (target.kind) {
    case 'notes':
      if (target.notes.length === 0) errors.push(`${where}: no notes`);
      for (const n of target.notes) if (!parsePitch(n)) errors.push(`${where}: "${n}" isn't a note with an octave`);
      return;
    case 'chord':
      if (!parseNote(target.root)) errors.push(`${where}: "${target.root}" isn't a note`);
      if (!getChordType(target.chord)) errors.push(`${where}: unknown chord type "${target.chord}"`);
      return;
    case 'interval':
      if (!parseNote(target.root)) errors.push(`${where}: "${target.root}" isn't a note`);
      if (!parseInterval(target.interval)) errors.push(`${where}: "${target.interval}" isn't an interval`);
      return;
    case 'scale':
      if (!parseNote(target.root)) errors.push(`${where}: "${target.root}" isn't a note`);
      if (!getScaleType(target.scale)) errors.push(`${where}: unknown scale type "${target.scale}"`);
      return;
  }
}

function checkIntro(level: Level, where: string, errors: string[]): void {
  if (level.intro.length === 0) errors.push(`${where}: the intro has no steps`);
  level.intro.forEach((step, i) => {
    const at = `${where} intro step ${i + 1}`;
    if (step.text.trim() === '') errors.push(`${at}: no text`);
    switch (step.kind) {
      case 'read':
        return;
      case 'see':
        checkTarget(step.target, at, errors);
        return;
      case 'hear':
        if (step.sounds.length === 0) errors.push(`${at}: nothing to hear`);
        for (const sound of step.sounds) {
          if (sound.label.trim() === '') errors.push(`${at}: a sound has no label`);
          checkTarget(sound.target, at, errors);
        }
        return;
      case 'play':
        checkTarget(step.target, at, errors);
        for (const n of step.start ?? []) if (!parsePitch(n)) errors.push(`${at}: start "${n}" isn't a note with an octave`);
        return;
    }
  });
}

function checkLevel(level: Level, where: string, errors: string[]): void {
  if (!LEVEL_ID.test(level.id)) errors.push(`${where}: bad id "${level.id}"`);
  if (level.title.trim() === '' || level.summary.trim() === '') errors.push(`${where}: needs a title and a summary`);
  checkIntro(level, where, errors);
  if (level.questions.length === 0) errors.push(`${where}: no questions`);
  level.questions.forEach((q, i) => {
    if (!(Number.isFinite(q.weight) && q.weight > 0)) errors.push(`${where} question ${i + 1}: weight must be above 0`);
    checkSpec(q.spec, `${where} question ${i + 1}`, errors);
  });
  if (level.placement?.length === 0) errors.push(`${where}: placement is empty (leave it out to skip the level)`);
  level.placement?.forEach((spec, i) => checkSpec(spec, `${where} placement ${i + 1}`, errors));
}

/** Everything wrong with a pack, in words; empty when it's fine. */
export function validatePack(pack: Pack): string[] {
  const errors: string[] = [];
  if (!PACK_ID.test(pack.id)) errors.push(`pack: bad id "${pack.id}"`);
  if (!(Number.isInteger(pack.version) && pack.version > 0)) errors.push(`${pack.id}: version must be a whole number above 0`);
  if (pack.title.trim() === '' || pack.description.trim() === '') errors.push(`${pack.id}: needs a title and a description`);
  if (pack.levels.length === 0) errors.push(`${pack.id}: no levels`);
  for (const id of duplicates(pack.levels.map((l) => l.id))) errors.push(`${pack.id}: level id "${id}" is used twice`);
  pack.levels.forEach((level, i) => checkLevel(level, `${pack.id} level ${i + 1} (${level.id})`, errors));
  return errors;
}

/** Packs need different ids too. */
export function validatePacks(packs: readonly Pack[]): string[] {
  return [...duplicates(packs.map((p) => p.id)).map((id) => `pack id "${id}" is used twice`), ...packs.flatMap(validatePack)];
}
