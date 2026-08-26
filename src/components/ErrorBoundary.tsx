import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error captured by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 shadow-xl shadow-red-950/30">
            <AlertTriangle size={32} />
          </div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            An unhandled error occurred in the application view. Please try reloading the page.
          </p>
          {this.state.error && (
            <pre className="mt-4 max-w-lg overflow-x-auto rounded-xl border border-white/10 bg-slate-900 p-4 text-left text-xs font-mono text-slate-300">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="mt-6 flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-950/40 transition hover:bg-brand-500"
          >
            <RotateCcw size={16} /> Reload application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
