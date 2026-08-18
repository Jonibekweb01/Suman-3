import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-page grid min-h-[65vh] place-items-center text-center">
      <div>
        <p className="font-display text-7xl tracking-tight text-line-strong sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl tracking-tight sm:text-3xl">This page does not exist</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          The link may be out of date, or the piece you were looking for has moved.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-12 items-center rounded-card bg-ink px-8 text-sm font-medium text-canvas transition-colors hover:bg-ink-soft"
          >
            Back to shop
          </Link>
          <Link
            to="/women"
            className="inline-flex h-12 items-center rounded-card border border-line-strong px-8 text-sm font-medium transition-colors hover:border-ink"
          >
            Browse women
          </Link>
        </div>
      </div>
    </div>
  );
}
