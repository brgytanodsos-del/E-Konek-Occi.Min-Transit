import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DataErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 my-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div>
            <h3 className="text-lg font-bold text-red-400">Failed to load component</h3>
            <p className="text-red-400/80 text-sm mt-1">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
