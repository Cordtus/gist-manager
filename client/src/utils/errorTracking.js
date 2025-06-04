// utils/errorTracking.js

import logger from './logger';

/**
 * Error tracking utility for centralized error handling
 * In production, this would integrate with services like Sentry
 */

// Error categories for better organization
export const ErrorCategory = {
  AUTHENTICATION: 'auth',
  API: 'api',
  NETWORK: 'network',
  UI: 'ui',
  UNKNOWN: 'unknown'
};

/**
 * Track an error
 * @param {Error} error - The error object
 * @param {string} category - Error category (from ErrorCategory)
 * @param {object} context - Additional context information
 */
export const trackError = (error, category = ErrorCategory.UNKNOWN, context = {}) => {
  logger.error(category, error);
  
  // In production, we would send this to an error tracking service
  // For now, we'll just log it with some additional metadata
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    category,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
  
  // Store recent errors in localStorage for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    try {
      const recentErrors = JSON.parse(localStorage.getItem('recent_errors') || '[]');
      recentErrors.unshift(errorInfo);
      localStorage.setItem('recent_errors', JSON.stringify(recentErrors.slice(0, 10)));
    } catch (e) {
      // Do nothing if we can't store the error
    }
  }
  
  // In production, you would integrate with Sentry or another error tracking service
  // Example with Sentry:
  // if (typeof Sentry !== 'undefined') {
  //   Sentry.withScope((scope) => {
  //     scope.setLevel('error');
  //     scope.setTag('category', category);
  //     scope.setExtras(context);
  //     Sentry.captureException(error);
  //   });
  // }
};

/**
 * Create a wrapped version of async functions that automatically 
 * tracks errors
 * @param {Function} fn - The async function to wrap
 * @param {string} category - Error category
 * @param {object} context - Additional context
 */
export const withErrorTracking = (fn, category, context = {}) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      trackError(error, category, {
        ...context,
        arguments: args.map(arg => 
          typeof arg === 'object' ? '(object)' : String(arg).substring(0, 100)
        )
      });
      throw error;
    }
  };
};

/**
 * Create an error boundary component
 * Similar to React's ErrorBoundary but as a hook
 * @param {Function} onError - Callback when an error occurs
 */
export const useErrorBoundary = (onError) => {
  return {
    handleError: (error, info) => {
      trackError(error, ErrorCategory.UI, info);
      if (onError) {
        onError(error, info);
      }
    }
  };
};

const errorTrackingService = {
  trackError,
  withErrorTracking,
  useErrorBoundary,
  ErrorCategory
};

export default errorTrackingService;