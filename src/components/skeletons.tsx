/** Layout-accurate placeholders. Flat, no slow shimmer — gone in ~100ms. */

function Ph({ className }: { className?: string }) {
  return <span className={className ? `ph ${className}` : "ph"} />;
}

export function ToolCardSkeleton() {
  return (
    <div className="ph-card" aria-hidden="true">
      <div className="ph-thumb ph-thumb-card" />
      <div className="ph-card-body">
        <Ph className="ph-line ph-line-name" />
        <Ph className="ph-line" />
        <Ph className="ph-line ph-line-short" />
      </div>
      <div className="ph-card-footer">
        <Ph className="ph-line ph-line-meta" />
      </div>
    </div>
  );
}

export function JustLandedSkeleton() {
  return (
    <section className="just-landed home-open" aria-hidden="true">
      <div className="section-head">
        <div className="section-heading">
          <Ph className="ph-line ph-line-meta" />
          <Ph className="ph-title" />
        </div>
        <Ph className="ph-link" />
      </div>
      <ol className="just-landed-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="just-landed-card">
              <div className="ph-thumb ph-thumb-landed" />
              <div className="just-landed-body">
                <Ph className="ph-line ph-line-name" />
                <Ph className="ph-line" />
                <Ph className="ph-line ph-line-short" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AislesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="editorial-aisles home-open" aria-hidden="true">
      <div className="section-head">
        <div className="section-heading">
          <Ph className="ph-line ph-line-meta" />
          <Ph className="ph-title" />
        </div>
        <Ph className="ph-link" />
      </div>
      <ul className="editorial-aisles-grid">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <div className="editorial-aisle-card">
              <div className="editorial-aisle-thumbs">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="ph-thumb ph-thumb-aisle" />
                ))}
              </div>
              <div className="editorial-aisle-body">
                <Ph className="ph-line ph-line-meta" />
                <Ph className="ph-line ph-line-name" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DirectorySkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <section className="directory home-band shelf-placeholder" aria-hidden="true">
      <div className="section-head directory-head">
        <div className="directory-heading">
          <Ph className="ph-line ph-line-meta" />
          <Ph className="ph-title ph-title-lg" />
        </div>
        <div className="sort-row">
          <Ph className="ph-sort" />
          <Ph className="ph-sort" />
          <Ph className="ph-sort" />
        </div>
      </div>

      <div className="tool-shelf">
        <div className="tool-grid">
          {Array.from({ length: cards }).map((_, i) => (
            <ToolCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Home data regions under the hero */
export function HomeContentSkeleton() {
  return (
    <>
      <JustLandedSkeleton />
      <AislesSkeleton />
      <DirectorySkeleton />
    </>
  );
}

export function DetailSkeleton() {
  return (
    <main id="main" className="ph-detail" aria-hidden="true">
      <div className="ph-detail-showcase">
        <div className="ph-detail-media">
          <div className="ph-thumb ph-thumb-detail" />
        </div>
        <div className="ph-detail-info">
          <div className="ph-chip-row">
            <Ph className="ph-chip" />
            <Ph className="ph-chip" />
          </div>
          <Ph className="ph-title ph-title-xl" />
          <Ph className="ph-line" />
          <Ph className="ph-line" />
          <Ph className="ph-line ph-line-short" />
          <div className="ph-detail-facts">
            <Ph className="ph-line ph-line-meta" />
            <Ph className="ph-line ph-line-meta" />
          </div>
          <div className="ph-detail-actions">
            <Ph className="ph-btn" />
            <Ph className="ph-btn ph-btn-ghost" />
          </div>
        </div>
      </div>
      <div className="ph-detail-related">
        <Ph className="ph-title" />
        <div className="tool-grid ph-related-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <ToolCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

export function DropSkeleton() {
  return (
    <main id="main" className="page-stack" aria-hidden="true">
      <header className="page-header">
        <Ph className="ph-line ph-line-meta" />
        <Ph className="ph-title ph-title-xl" />
        <Ph className="ph-line" />
        <Ph className="ph-line ph-line-short" />
      </header>
      <div className="ph-drop-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ph-drop-row">
            <div className="ph-thumb ph-thumb-drop" />
            <div className="ph-drop-body">
              <Ph className="ph-line ph-line-name" />
              <Ph className="ph-line" />
              <Ph className="ph-line ph-line-short" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function AislesIndexSkeleton() {
  return (
    <main id="main" className="page-stack" aria-hidden="true">
      <header className="page-header">
        <Ph className="ph-line ph-line-meta" />
        <Ph className="ph-title ph-title-xl" />
        <Ph className="ph-line" />
      </header>
      <AislesSkeleton count={4} />
    </main>
  );
}

export function PageShelfSkeleton() {
  return (
    <main id="main" className="page-stack" aria-hidden="true">
      <header className="page-header">
        <Ph className="ph-line ph-line-meta" />
        <Ph className="ph-title ph-title-xl" />
        <Ph className="ph-line" />
        <Ph className="ph-line ph-line-short" />
      </header>
      <div className="tool-shelf">
        <div className="tool-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <ToolCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

/** @deprecated use DirectorySkeleton */
export function ShelfPlaceholder() {
  return <DirectorySkeleton />;
}
