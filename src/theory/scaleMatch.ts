/**
 * Which scales a set of notes fits (Scale Finder, SPEC §14.1). Scales with the
 * same notes are grouped: C major, A natural minor and D Dorian are one set of
 * notes with different homes, so they come back as one result with three
 * options, not three results.
 */
import { NEAR_MATCH_MAX_COMMONNESS, NEAR_MATCH_MIN_NOTES, SEMITONES_PER_OCTAVE } from '../constants';
import { bitCount, maskOf, mod, pitchClassesOf, rotateMask, simplestSpelling, type Note } from './notes';
import { SCALE_TYPES, buildScale, scalePitchClasses, type ScaleType } from './scales';

export interface ScaleOption {
  readonly root: Note;
  readonly scaleTypeId: string;
}

export interface ScaleGroup {
  /** The scale's pitch classes, lowest first. */
  readonly pitchClasses: readonly number[];
  /** How many of the scale's notes weren't entered. */
  readonly extraNotes: number;
  /** Every scale with exactly these notes, best first. */
  readonly options: readonly ScaleOption[];
}

export interface NearMatch extends ScaleGroup {
  /** The note entered that these scales don't have. */
  readonly missing: number;
}

export interface ScaleMatches {
  /** Scales containing every note entered. */
  readonly exact: readonly ScaleGroup[];
  /** Common scales containing all but one of them ("A natural minor, except G♯"). */
  readonly near: readonly NearMatch[];
}

interface Candidate {
  readonly rootPc: number;
  readonly type: ScaleType;
  readonly typeIndex: number;
}

interface Ranked<T> {
  readonly group: T;
  /** The group's first option, which decides where the group goes. */
  readonly best: Candidate;
}

/** Each scale type's notes on C, as a 12-bit set. */
const C_MASKS: readonly number[] = SCALE_TYPES.map((type) => maskOf(scalePitchClasses({ letter: 'C', accidental: 0 }, type.id)));

/** Home note first, then common scales, then the order of SCALE_TYPES. */
function byPreference(homePc: number | null) {
  return (a: Candidate, b: Candidate) =>
    Number(b.rootPc === homePc) - Number(a.rootPc === homePc) || a.type.commonness - b.type.commonness || a.typeIndex - b.typeIndex;
}

function toGroup(mask: number, candidates: readonly Candidate[], entered: number, homePc: number | null): Ranked<ScaleGroup> {
  const sorted = [...candidates].sort(byPreference(homePc));
  const best = sorted[0];
  if (!best) throw new Error('A scale group needs at least one scale');
  const options = sorted.map(({ rootPc, type }) => ({ root: simplestSpelling(rootPc, (r) => buildScale(r, type.id)), scaleTypeId: type.id }));
  return { group: { pitchClasses: pitchClassesOf(mask), extraNotes: bitCount(mask & ~entered), options }, best };
}

function ranked<T extends ScaleGroup>(items: Ranked<T>[], homePc: number | null): T[] {
  const prefer = byPreference(homePc);
  return items
    .sort(
      (a, b) =>
        Number(b.best.rootPc === homePc) - Number(a.best.rootPc === homePc) || a.group.extraNotes - b.group.extraNotes || prefer(a.best, b.best),
    )
    .map((item) => item.group);
}

/**
 * The scales these pitch classes fit, best first: scales built on the home note
 * (if one is given), then those with the fewest notes that weren't entered, then
 * the common ones.
 */
export function matchScales(pitchClasses: readonly number[], homePc: number | null = null): ScaleMatches {
  const entered = maskOf(pitchClasses);
  const count = bitCount(entered);
  const home = homePc === null ? null : mod(homePc, SEMITONES_PER_OCTAVE);
  if (count === 0) return { exact: [], near: [] };

  const exact = new Map<number, Candidate[]>();
  const near = new Map<number, Candidate[]>();
  SCALE_TYPES.forEach((type, typeIndex) => {
    for (let rootPc = 0; rootPc < SEMITONES_PER_OCTAVE; rootPc++) {
      const mask = rotateMask(C_MASKS[typeIndex] ?? 0, -rootPc);
      const outside = bitCount(entered & ~mask);
      const candidate = { rootPc, type, typeIndex };
      if (outside === 0) exact.set(mask, [...(exact.get(mask) ?? []), candidate]);
      else if (outside === 1 && count >= NEAR_MATCH_MIN_NOTES && type.commonness <= NEAR_MATCH_MAX_COMMONNESS) {
        near.set(mask, [...(near.get(mask) ?? []), candidate]);
      }
    }
  });

  const exactGroups = [...exact].map(([mask, candidates]) => toGroup(mask, candidates, entered, home));
  const nearGroups = [...near].map(([mask, candidates]) => {
    const { group, best } = toGroup(mask, candidates, entered, home);
    return { group: { ...group, missing: pitchClassesOf(entered & ~mask)[0] ?? 0 }, best };
  });
  return { exact: ranked(exactGroups, home), near: ranked(nearGroups, home) };
}
