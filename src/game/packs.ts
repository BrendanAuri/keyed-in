/** Looking up packs and levels. Progress is keyed by "packId/levelId", never by position. */
import { PACKS } from '../content';
import type { Level, Pack } from '../content/schema';

export interface LevelRef {
  readonly pack: Pack;
  readonly level: Level;
  /** Where the level sits in its pack, from 0. */
  readonly index: number;
}

export function levelKey(packId: string, levelId: string): string {
  return `${packId}/${levelId}`;
}

export function refKey(ref: LevelRef): string {
  return levelKey(ref.pack.id, ref.level.id);
}

export function findLevel(packId: string, levelId: string, packs: readonly Pack[] = PACKS): LevelRef | null {
  const pack = packs.find((p) => p.id === packId);
  const index = pack ? pack.levels.findIndex((l) => l.id === levelId) : -1;
  const level = pack?.levels[index];
  return pack && level ? { pack, level, index } : null;
}

/** A "packId/levelId" key back to its level. */
export function resolveLevel(key: string, packs: readonly Pack[] = PACKS): LevelRef | null {
  const [packId = '', levelId = ''] = key.split('/');
  return findLevel(packId, levelId, packs);
}

/** "Foundations 3". */
export function levelLabel(ref: LevelRef): string {
  return `${ref.pack.title} ${ref.index + 1}`;
}

export function nextLevel(ref: LevelRef): LevelRef | null {
  const level = ref.pack.levels[ref.index + 1];
  return level ? { pack: ref.pack, level, index: ref.index + 1 } : null;
}

/** Every level of every pack, in order. */
export function allLevels(packs: readonly Pack[] = PACKS): LevelRef[] {
  return packs.flatMap((pack) => pack.levels.map((level, index) => ({ pack, level, index })));
}
