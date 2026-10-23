/** One way in to every question type: make a question, check an answer, say what it means. */
import type { Rng } from '../game/rng';
import { checkChoice, choiceFeedback, generateFact, generateHearQuality, generateIdentify } from './choices';
import { checkKeys, generateChange, generateEcho, generateFix, generateSpell, keysFeedback } from './keys';
import { isKeysQuestion, type Answer, type Feedback, type Question, type QuestionSpec, type Result } from './types';

export function generateQuestion(spec: QuestionSpec, rng: Rng): Question {
  switch (spec.type) {
    case 'spell':
      return generateSpell(spec, rng);
    case 'change':
      return generateChange(spec, rng);
    case 'fix':
      return generateFix(spec, rng);
    case 'echo':
      return generateEcho(spec, rng);
    case 'identify':
      return generateIdentify(spec, rng);
    case 'hearQuality':
      return generateHearQuality(spec, rng);
    case 'fact':
      return generateFact(spec, rng);
  }
}

/** An answer of the wrong kind for the question (keys for a buttons question) is simply wrong. */
export function checkAnswer(q: Question, answer: Answer): Result {
  if (isKeysQuestion(q)) return answer.kind === 'keys' ? checkKeys(q, answer.midis) : { correct: false, partial: false };
  return answer.kind === 'choice' ? checkChoice(q, answer.index) : { correct: false, partial: false };
}

export function feedbackFor(q: Question, answer: Answer, result: Result): Feedback {
  if (isKeysQuestion(q)) return keysFeedback(q, answer.kind === 'keys' ? answer.midis : [], result);
  return choiceFeedback(q, answer.kind === 'choice' ? answer.index : -1, result);
}
