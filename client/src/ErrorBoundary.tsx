// 에러 바운더리 — React 트리에서 발생한 런타임 에러를 잡아 사용자에게 에러 화면을 보여주고, 콘솔에 에러를 기록한다.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Capture the error with Sentry
    const errorId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
    
    this.setState({ errorId });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg 
                className="w-10 h-10 text-red-500 dark:text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              앗, 문제가 발생했어요!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              예상치 못한 오류가 발생했습니다. 불편을 드려 죄송합니다. 
              문제가 자동으로 신고되었으며, 빠르게 해결하도록 하겠습니다.
            </p>

            {/* Error ID */}
            {this.state.errorId && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">오류 ID</p>
                <code className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {this.state.errorId}
                </code>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl font-medium transition-colors duration-200"
                data-testid="button-reload-page"
              >
                🔄 페이지 새로고침
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium transition-colors duration-200"
                data-testid="button-go-home"
              >
                🏠 홈으로 돌아가기
              </button>
            </div>

            {/* Additional Help */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                문제가 계속 발생하면 지원팀에 문의해 주세요.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;