import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  details: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      details: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    let parsedMessage = error.message || 'An unexpected error occurred.';
    let details: string | null = null;
    try {
      const obj = JSON.parse(error.message);
      if (obj && typeof obj === 'object' && obj.error) {
        parsedMessage = String(obj.error);
        details = `${obj.operationType ?? 'operation'} on ${obj.path ?? 'unknown path'}`;
      }
    } catch {
      // standard error message
    }
    return {
      hasError: true,
      message: parsedMessage,
      details,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('MediSlot AI ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-surface-container-lowest rounded-2xl p-8 editorial-shadow border border-outline-variant/40">
            <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[24px]">error_outline</span>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Something interrupted this clinical view</h2>
            <p className="text-sm text-on-surface-variant mb-4">{this.state.message}</p>
            {this.state.details && (
              <p className="text-xs font-mono bg-surface-container-low text-on-surface-variant px-3 py-2 rounded-lg mb-5">
                {this.state.details}
              </p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary-container transition-colors cursor-pointer"
            >
              Reload MediSlot AI
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
