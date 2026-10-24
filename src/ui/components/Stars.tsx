import { STAR_THRESHOLDS } from '../../constants';

/** Stars earned out of three, as ★★☆, read out as "2 of 3 stars". */
export function Stars({ count, large = false }: { readonly count: number; readonly large?: boolean }) {
  const most = STAR_THRESHOLDS.length;
  return (
    <span className={large ? 'stars large' : 'stars'} role="img" aria-label={`${count} of ${most} stars`}>
      {Array.from({ length: most }, (_, i) => (
        <span key={i} className={i < count ? 'star earned' : 'star'} aria-hidden="true">
          {i < count ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

/** A dot for each question of a round: right, wrong, or still to come. Always the same height, so nothing below it moves. */
export function RoundDots({ results, total }: { readonly results: readonly boolean[]; readonly total: number }) {
  return (
    <ol className="round-dots" aria-label={`${results.filter(Boolean).length} right of ${results.length} answered, out of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        return <li key={i} className={result === undefined ? 'round-dot' : result ? 'round-dot right' : 'round-dot wrong'} />;
      })}
    </ol>
  );
}
