/** The master bus that voices connect to, with a safety limiter (from Dial In). */
import { LIMITER_ATTACK, LIMITER_KNEE_DB, LIMITER_RATIO, LIMITER_RELEASE, LIMITER_THRESHOLD_DB, MASTER_GAIN } from '../constants';

/** Create the fixed-gain master bus feeding `ctx.destination`. Returns its input. */
export function createOutputBus(ctx: BaseAudioContext): GainNode {
  const master = new GainNode(ctx, { gain: MASTER_GAIN });
  const limiter = new DynamicsCompressorNode(ctx, {
    threshold: LIMITER_THRESHOLD_DB,
    knee: LIMITER_KNEE_DB,
    ratio: LIMITER_RATIO,
    attack: LIMITER_ATTACK,
    release: LIMITER_RELEASE,
  });
  master.connect(limiter).connect(ctx.destination);
  return master;
}
