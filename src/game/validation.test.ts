import { describe, expect, it } from 'vitest';
import { PACKS } from '../content';
import type { Pack } from '../content/schema';
import { checkAnswer, generateQuestion } from '../exercises/questions';
import { voiceTarget } from '../exercises/targets';
import { isKeysQuestion } from '../exercises/types';
import { createRng } from './rng';
import { validatePack, validatePacks } from './validation';

describe('shipped packs', () => {
  it('pass every content check', () => {
    expect(validatePacks(PACKS)).toEqual([]);
  });

  it('only ask questions that accept their own right answer', () => {
    for (const pack of PACKS) {
      for (const level of pack.levels) {
        const specs = [...level.questions.map((q) => q.spec), ...(level.placement ?? [])];
        for (const spec of specs) {
          for (let seed = 0; seed < 100; seed++) {
            const q = generateQuestion(spec, createRng(seed));
            const answer = isKeysQuestion(q) ? { kind: 'keys' as const, midis: voiceTarget(q.target, 4) } : { kind: 'choice' as const, index: q.correct };
            expect(checkAnswer(q, answer).correct, `${level.id} ${spec.type}: ${q.prompt}`).toBe(true);
          }
        }
      }
    }
  });

  it('end every intro with something to read, so the round never starts by surprise', () => {
    for (const pack of PACKS) for (const level of pack.levels) expect(level.intro[level.intro.length - 1]?.kind, level.id).toBe('read');
  });
});

describe('content checks', () => {
  const good = PACKS[0] as Pack;
  const level = good.levels[0];
  if (!level) throw new Error('no level');

  it('catch question specs the question types can’t make', () => {
    const bad: Pack = {
      ...good,
      levels: [
        {
          ...level,
          questions: [
            { spec: { type: 'spell', about: 'facts', set: [] }, weight: 1 },
            { spec: { type: 'identify', about: 'chords', set: ['nope'] }, weight: 1 },
            { spec: { type: 'hearQuality', about: 'chords', set: ['major'], guide: 'full' }, weight: 1 },
            { spec: { type: 'spell', about: 'chords', set: ['major'], roots: ['H'] }, weight: 0 },
            { spec: { type: 'hearQuality', about: 'chords', set: ['major'], choices: 'root' }, weight: 1 },
          ],
        },
      ],
    };
    const errors = validatePack(bad);
    expect(errors.some((e) => e.includes("can't be about facts"))).toBe(true);
    expect(errors.some((e) => e.includes('"nope"'))).toBe(true);
    expect(errors.some((e) => e.includes('takes no help'))).toBe(true);
    expect(errors.some((e) => e.includes('"H" isn\'t a note'))).toBe(true);
    expect(errors.some((e) => e.includes('weight'))).toBe(true);
    expect(errors.some((e) => e.includes('choose between roots'))).toBe(true);
  });

  it('catch intros with keys that don’t exist, and repeated ids', () => {
    const bad: Pack = {
      ...good,
      levels: [
        {
          ...level,
          intro: [
            { kind: 'see', text: 'x', target: { kind: 'notes', notes: ['C'] } },
            { kind: 'hear', text: 'x', sounds: [] },
            { kind: 'play', text: '', target: { kind: 'chord', root: 'C', chord: 'mystery' } },
          ],
        },
        level,
      ],
    };
    const errors = validatePack(bad);
    expect(errors.some((e) => e.includes('"C" isn\'t a note with an octave'))).toBe(true);
    expect(errors.some((e) => e.includes('nothing to hear'))).toBe(true);
    expect(errors.some((e) => e.includes('no text'))).toBe(true);
    expect(errors.some((e) => e.includes('"mystery"'))).toBe(true);
    expect(errors.some((e) => e.includes('used twice'))).toBe(true);
  });
});
