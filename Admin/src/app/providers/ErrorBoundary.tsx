import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a bad row of data cannot blank the whole admin.
 * Error boundaries have no hook equivalent — this must stay a class.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Swap for a real reporter (Sentry et al.) in production.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold">Something broke</h1>
          <p className="mt-2 text-sm text-muted">
            An unexpected error interrupted this screen. Reloading usually clears it.
          </p>

          {import.meta.env.DEV && (
            <pre className="mt-4 overflow-x-auto rounded-md bg-danger-soft p-3 text-left text-[12px] text-danger">
              {error.message}
            </pre>
          )}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-10 items-center rounded-md bg-brand px-6 text-sm font-medium text-white"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
