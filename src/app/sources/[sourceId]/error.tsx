"use client";

/** Shown when the ranking cannot be read, for instance when the database is unreachable. */
export default function RankingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="container screen">
      <section className="empty" aria-labelledby="error-head" role="alert">
        <h2 id="error-head">The ranking could not be read</h2>
        <p>The database did not answer. Try again in a moment; the last collected ranking is kept until it does.</p>
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
