import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Last line of defence.
 *
 * A render error anywhere below this boundary would otherwise unmount the whole
 * tree and leave a blank white page — far worse than an apology and a reload
 * button. Error boundaries must be class components; there is no hook
 * equivalent.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Replace with a real reporter (Sentry et al.) in production.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted">
            An unexpected error interrupted the page. Reloading usually fixes it.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-4 overflow-x-auto rounded-card bg-surface-sunken p-3 text-left text-xs text-danger">
              {error.message}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-12 items-center rounded-card bg-ink px-8 text-sm font-medium text-canvas"
          >
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
