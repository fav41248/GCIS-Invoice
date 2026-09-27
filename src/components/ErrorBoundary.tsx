import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 text-[#212529]">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8 max-w-lg w-full text-center">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h1 className="text-xl font-bold mb-2">Portal Display Issue</h1>
            <p className="text-sm text-gray-600 mb-6">
              The application encountered a display issue. This can happen when cached data or an interrupted session gets out of sync.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 bg-[#198754] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#0F5132] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Portal
              </button>
              <button
                onClick={this.handleResetSession}
                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors border border-gray-200"
              >
                <LogOut className="w-4 h-4" />
                Reset &amp; Sign In Again
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-gray-50 p-3 rounded border border-gray-200 text-xs text-gray-600 overflow-auto max-h-36">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-1">
                  Error Details
                </summary>
                <p className="font-mono text-[11px] text-red-600 mt-1 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
