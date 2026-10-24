/**
 * What a pack is (SPEC §9): levels, each with a short guided intro, the
 * questions its rounds ask, and the few it adds to the placement check.
 * Everything here is plain, JSON-serialisable data; `game/validation.ts`
 * checks every shipped pack in a test.
 */
import type { QuestionSpec } from '../exercises/types';

/**
 * Keys an intro step lights, plays or asks for. Notes are pitches ("C4",
 * "Eb4"); chords, intervals and scales start from a root in the question
 * octave, as questions do.
 */
export type IntroTarget =
  | { readonly kind: 'notes'; readonly notes: readonly string[] }
  | { readonly kind: 'chord'; readonly root: string; readonly chord: string }
  /** `interval` is written like "M3". */
  | { readonly kind: 'interval'; readonly root: string; readonly interval: string }
  | { readonly kind: 'scale'; readonly root: string; readonly scale: string };

/** One sound in a step that compares a few, with its button's label. */
export interface IntroSound {
  readonly label: string;
  readonly target: IntroTarget;
}

/**
 * One step of an intro: read something, see it lit and hear it, compare a
 * few sounds, or play it yourself. Every step has a short text in plain words.
 */
export type IntroStep =
  | { readonly kind: 'read'; readonly text: string }
  /** Lit on the keyboard with its names, and played as the step opens. */
  | { readonly kind: 'see'; readonly text: string; readonly target: IntroTarget }
  /** A button for each sound; pressing one plays it and lights its keys. */
  | { readonly kind: 'hear'; readonly text: string; readonly sounds: readonly IntroSound[] }
  /**
   * Choose the keys yourself. Nothing is lit; `start` keys begin chosen,
   * `listen` plays the target first, and `hideNames` takes the letters off the keys.
   */
  | {
      readonly kind: 'play';
      readonly text: string;
      readonly target: IntroTarget;
      readonly start?: readonly string[];
      readonly listen?: boolean;
      readonly hideNames?: boolean;
    };

/** A kind of question a level's rounds ask, and how often compared with its others. */
export interface LevelQuestion {
  readonly spec: QuestionSpec;
  readonly weight: number;
}

export interface Level {
  /** Unique within the pack; progress is saved under it, so it never changes. */
  readonly id: string;
  readonly title: string;
  /** One line for the level list. */
  readonly summary: string;
  readonly intro: readonly IntroStep[];
  /**
   * What its rounds ask. Questions with more help come first in a round, so
   * list them with the help they give; later levels go back over these with
   * no more than a hint.
   */
  readonly questions: readonly LevelQuestion[];
  /** Asked in the placement check, one question each, usually without help. Left out of the check when missing. */
  readonly placement?: readonly QuestionSpec[];
}

export interface Pack {
  /** e.g. "foundations". Progress is saved under it, so it never changes. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /**
   * Bump whenever levels or questions change: a round left halfway is made
   * again from its seed, which only gives the same questions on the same content.
   */
  readonly version: number;
  readonly levels: readonly Level[];
  /** A line about levels still to come, under the list. */
  readonly comingSoon?: string;
}
