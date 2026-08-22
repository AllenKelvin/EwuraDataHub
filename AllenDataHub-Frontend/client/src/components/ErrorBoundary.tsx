import React from 'react';

type State = { hasError: boolean; error?: Error | null };

export class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // log to console (or a telemetry endpoint)
    // keep minimal to avoid new runtime errors
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children as any;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="max-w-2xl w-full bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-red-700">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-600">The application encountered an error while rendering. See details below.</p>
          <pre className="mt-4 p-3 bg-white rounded text-xs text-red-800 overflow-auto max-h-64">{String(this.state.error && this.state.error.stack)}</pre>
          <div className="mt-4 flex gap-2">
            <button onClick={() => window.location.reload()} className="px-3 py-2 bg-red-600 text-white rounded">Reload</button>
            <button onClick={() => { navigator.clipboard.writeText(String(this.state.error)); }} className="px-3 py-2 bg-white border rounded">Copy Error</button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
