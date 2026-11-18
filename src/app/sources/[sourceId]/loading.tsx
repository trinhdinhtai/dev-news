const ROWS = 12;

/** A skeleton in the shape of the ledger that is coming. */
export default function Loading() {
  return (
    <main id="main" className="container screen" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading the ranking
      </p>
      <div className="screen__head" aria-hidden="true">
        <div className="screen__title">
          <span className="skeleton skeleton--head" />
          <span className="skeleton skeleton--line" />
        </div>
      </div>
      <div className="ledger-panel ledger-skeleton" aria-hidden="true">
        {Array.from({ length: ROWS }, (_, i) => (
          <span key={i} className="skeleton skeleton--row" />
        ))}
      </div>
    </main>
  );
}
