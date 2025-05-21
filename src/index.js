// index,js
import './styles/theme.css';
import './styles/index.css';
import './styles/gistEditor.css';
import './styles/markdownPreview.css';
import './styles/markdownExtras.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


// Log that app is initializing
console.log('Gist Manager app initializing...');

// Add error boundary for the entire app
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white dark:bg-dark-bg-primary rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h2>
          <p className="mb-4 dark:text-gray-300">Please try refreshing the page. If the problem persists, please contact support.</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
              <summary className="cursor-pointer font-semibold dark:text-gray-200">Error Details</summary>
              <pre className="mt-2 p-2 bg-gray-800 dark:bg-black text-white rounded overflow-auto">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Log that app has mounted
console.log('Gist Manager app mounted successfully');