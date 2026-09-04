import manifestData from '@/rebuild/route-manifest.json';

type RebuildRouteEntry = {
  id: string;
  path: string;
  source: string;
  title: string;
  category: string;
  audience: string;
  status: string;
  requiredSections: string[];
  interactions: string[];
  features: string[];
  states: Record<string, string>;
  contracts: string[];
};

type RebuildManifest = {
  categories: Array<{ id: string; label: string }>;
  routes: RebuildRouteEntry[];
};

const manifest = manifestData as RebuildManifest;

function humanize(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function DetailList({ items }: { items: string[] }) {
  return (
    <ul className="rebuild-detail-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function RebuildRoute({ routeId }: { routeId: string }) {
  const route = manifest.routes.find((candidate) => candidate.id === routeId);

  if (!route) {
    throw new Error(`Unknown league-sites rebuild route ID: ${routeId}`);
  }

  const category = manifest.categories.find(
    (candidate) => candidate.id === route.category
  );
  const titleId = `rebuild-title-${route.id.toLowerCase()}`;

  return (
    <main id="rebuild-content" className="rebuild-route" aria-labelledby={titleId}>
      <article className="rebuild-card">
        <header className="rebuild-hero">
          <div className="rebuild-kicker-row">
            <span className="rebuild-kicker">League sites rebuild</span>
            <span className="rebuild-status" data-status={route.status}>
              {humanize(route.status)}
            </span>
          </div>
          <h1 id={titleId}>{route.title}</h1>
          <p className="rebuild-path">
            <span>Route</span>
            <code>{route.path}</code>
          </p>
        </header>

        <dl className="rebuild-metadata" aria-label="Route details">
          <div>
            <dt>Tracker ID</dt>
            <dd>
              <code>{route.id}</code>
            </dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{route.audience}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{category?.label ?? humanize(route.category)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{humanize(route.status)}</dd>
          </div>
        </dl>

        <div className="rebuild-grid">
          <section className="rebuild-section" aria-labelledby={`${titleId}-sections`}>
            <h2 id={`${titleId}-sections`}>Required sections</h2>
            <DetailList items={route.requiredSections} />
          </section>

          <section className="rebuild-section" aria-labelledby={`${titleId}-features`}>
            <h2 id={`${titleId}-features`}>Features to preserve</h2>
            <DetailList items={route.features} />
          </section>

          <section className="rebuild-section" aria-labelledby={`${titleId}-interactions`}>
            <h2 id={`${titleId}-interactions`}>Interactions</h2>
            <DetailList items={route.interactions} />
          </section>
        </div>

        <section className="rebuild-section rebuild-section--wide" aria-labelledby={`${titleId}-states`}>
          <h2 id={`${titleId}-states`}>Required states</h2>
          <ul className="rebuild-chip-list">
            {Object.entries(route.states).map(([name, requirement]) => (
              <li className="rebuild-chip rebuild-chip--state" key={name}>
                <strong>{humanize(name)}</strong>
                <span>{requirement}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rebuild-section rebuild-section--wide" aria-labelledby={`${titleId}-contracts`}>
          <h2 id={`${titleId}-contracts`}>Contracts</h2>
          <ul className="rebuild-chip-list" aria-label="Required contract identifiers">
            {route.contracts.map((contract) => (
              <li className="rebuild-chip" key={contract}>
                <code>{contract}</code>
              </li>
            ))}
          </ul>
        </section>

        <footer className="rebuild-source">
          <span>Source</span>
          <code>{route.source}</code>
        </footer>
      </article>
    </main>
  );
}
