import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-5xl font-semibold tracking-tight text-line-strong">404</p>
        <h1 className="mt-3 text-lg font-semibold">This screen does not exist</h1>
        <p className="mt-1 text-sm text-muted">The link may be out of date.</p>
        <Link
          to="/"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-brand px-6 text-sm font-medium text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
