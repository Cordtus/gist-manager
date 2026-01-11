// Error boundary component for catching React errors
import React from 'react';
import { logError } from '../../utils/logger';
import { ErrorState } from '../ui/error-state';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logError('React Error Boundary caught error', { error, errorInfo });
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full">
            <ErrorState
              title="Something went wrong"
              message="An unexpected error occurred. Please refresh the page and try again."
              variant="fullpage"
              onRetry={this.handleRetry}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;