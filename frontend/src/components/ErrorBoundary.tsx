/**
 * Error Boundary Component (Phase 6-10)
 *
 * Catches React errors and displays a user-friendly fallback UI
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full border-red-200 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                {/* Error Icon */}
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>

                {/* Error Title */}
                <div>
                  <h1 className="text-3xl font-bold text-grey-900">
                    문제가 발생했습니다
                  </h1>
                  <p className="mt-3 text-lg text-grey-600">
                    예상치 못한 오류가 발생하여 페이지를 표시할 수 없습니다.
                  </p>
                </div>

                {/* Error Details (Development Only) */}
                {import.meta.env.DEV && this.state.error && (
                  <div className="bg-grey-50 border border-grey-200 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-grey-900 mb-2">
                      개발자 정보:
                    </h3>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium text-red-600">오류:</span>
                        <pre className="mt-1 text-xs text-grey-700 overflow-x-auto">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <span className="font-medium text-red-600">
                            컴포넌트 스택:
                          </span>
                          <pre className="mt-1 text-xs text-grey-700 overflow-x-auto max-h-40">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={this.handleReset}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                    다시 시도
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-grey-200 text-grey-700 rounded-lg font-medium hover:bg-grey-300 transition-colors"
                  >
                    <Home className="w-5 h-5" />
                    홈으로 이동
                  </button>
                </div>

                {/* Help Text */}
                <div className="pt-4 border-t border-grey-200">
                  <p className="text-sm text-grey-600">
                    문제가 계속 발생하면 페이지를 새로고침하거나 브라우저를
                    다시 시작해보세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
