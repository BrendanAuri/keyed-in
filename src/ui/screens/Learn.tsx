import type { ReactNode } from 'react';
import { PACKS } from '../../content';
import { allLevels, refKey, type LevelRef } from '../../game/packs';
import { chooseStart, isPassed, isUnlocked, levelRecord, packSummary, runFor, suggestedLevel } from '../../game/progress';
import { Stars } from '../components/Stars';
import { progressStore, useProgress } from '../progress';
import type { Navigate } from '../router';

/**
 * Learn (SPEC §9): the first time, a choice between starting from scratch and
 * the placement check; then each pack as one list of levels, with stars,
 * locks and where to go next.
 */
export function Learn({ navigate }: { readonly navigate: Navigate }) {
  const progress = useProgress();
  const suggested = suggestedLevel(progress);
  const open = (ref: LevelRef) => navigate({ name: 'learn', pack: ref.pack.id, level: ref.level.id });

  return (
    <main className="screen learn">
      <div className="screen-head">
        <h1 className="screen-title">Learn</h1>
        <p className="screen-note">Short levels, from the very beginning. Each one starts with a quick intro, then 10 questions.</p>
      </div>

      {progress.start === null && (
        <section className="card" aria-labelledby="start-title">
          <h2 id="start-title" className="card-kicker">
            Where to start
          </h2>
          <p className="card-title">Have you learned any music before?</p>
          <ul className="feature-list start-choice">
            <li>
              <button
                type="button"
                className="feature-card ready"
                onClick={() => {
                  progressStore().update((p) => chooseStart(p, 'beginner'));
                  const first = allLevels()[0];
                  if (first) open(first);
                }}
              >
                <span className="feature-title">New to music</span>
                <span className="feature-description">Start at the very beginning, with the keys and their names.</span>
              </button>
            </li>
            <li>
              <button type="button" className="feature-card ready" onClick={() => navigate({ name: 'placement' })}>
                <span className="feature-title">I know some basics</span>
                <span className="feature-description">Answer a few questions and skip what you already know. It takes a few minutes.</span>
              </button>
            </li>
          </ul>
        </section>
      )}

      {PACKS.map((pack) => {
        const summary = packSummary(progress, pack);
        return (
          <section key={pack.id} className="pack" aria-labelledby={`pack-${pack.id}`}>
            <h2 id={`pack-${pack.id}`} className="section-title">
              {pack.title}
            </h2>
            <p className="pack-description">{pack.description}</p>
            <p className="pack-summary">
              {summary.passed} of {summary.total} passed · {summary.stars} of {summary.maxStars} stars
            </p>
            <ol className="level-list">
              {pack.levels.map((level, index) => {
                const ref = { pack, level, index };
                const record = levelRecord(progress, ref);
                const unlocked = isUnlocked(progress, ref);
                const next = suggested !== null && refKey(suggested) === refKey(ref);
                const running = runFor(progress, ref) !== null;
                let status: ReactNode = null;
                if (running) status = <span className="tag ready">Unfinished</span>;
                else if (next && progress.start !== null) status = <span className="tag ready">Next</span>;
                // Passed in the placement check, or by testing out of a later level: no stars yet.
                else if (isPassed(progress, ref)) status = record?.stars ? <Stars count={record.stars} /> : <span className="tag">Passed</span>;
                else if (!unlocked) status = <span className="tag">Locked</span>;
                return (
                  <li key={level.id}>
                    <button type="button" className={unlocked ? 'level-row' : 'level-row locked'} onClick={() => open(ref)}>
                      <span className="level-number" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="level-text">
                        <span className="level-head">
                          <span className="level-title">
                            <span className="visually-hidden">Level {index + 1}: </span>
                            {level.title}
                          </span>
                          {status && <span className="level-status">{status}</span>}
                        </span>
                        <span className="level-summary">{level.summary}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {pack.comingSoon && <p className="card-note">{pack.comingSoon}</p>}
          </section>
        );
      })}

      {progress.start !== null && (
        <p className="card-note">
          Locked levels can be tested out of: open one to try. Or{' '}
          <button type="button" className="link-button" onClick={() => navigate({ name: 'placement' })}>
            take the placement check
          </button>{' '}
          again.
        </p>
      )}
    </main>
  );
}
