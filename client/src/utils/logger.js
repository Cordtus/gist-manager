/**
 * Client-side Logger
 * Provides consistent logging utilities across the React application.
 * Includes error tracking, API error handling, and debug utilities.
 * @module utils/logger
 */

/**
 * Error category constants for classification
 * @readonly
 * @enum {string}
 */
export const ErrorCategory = {
	AUTHENTICATION: 'auth',
	API: 'api',
	NETWORK: 'network',
	UI: 'ui',
	UNKNOWN: 'unknown'
};

/**
 * Log an informational message
 * @param {string} message - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
export const logInfo = (message, meta = {}) => {
	console.info(message, meta); // eslint-disable-line no-console
};

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
export const logWarning = (message, meta = {}) => {
	console.warn(message, meta); // eslint-disable-line no-console
};

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
export const logError = (message, meta = {}) => {
	console.error(message, meta); // eslint-disable-line no-console
};

/**
 * Log a debug message (development only)
 * @param {string} message - Log message
 * @param {Object} [meta={}] - Additional metadata
 */
export const logDebug = (message, meta = {}) => {
	if (process.env.NODE_ENV !== 'production') {
		console.debug(message, meta); // eslint-disable-line no-console
	}
};

/**
 * Track an error with category and context
 * Stores recent errors in localStorage for debugging in development
 * @param {Error} error - The error object
 * @param {string} [category=ErrorCategory.UNKNOWN] - Error category
 * @param {Object} [context={}] - Additional context
 */
export const trackError = (error, category = ErrorCategory.UNKNOWN, context = {}) => {
	console.error(`[${category}] ${error.message}`, { stack: error.stack, ...context }); // eslint-disable-line no-console

	if (process.env.NODE_ENV !== 'production') {
		try {
			const errors = JSON.parse(localStorage.getItem('recent_errors') || '[]');
			errors.unshift({
				message: error.message,
				stack: error.stack,
				category,
				context,
				timestamp: new Date().toISOString()
			});
			localStorage.setItem('recent_errors', JSON.stringify(errors.slice(0, 10)));
		} catch (e) {
			// Ignore localStorage errors
		}
	}
};

/**
 * Handle API errors with consistent messaging
 * @param {Error} error - Axios error object
 * @param {Function} [setError] - State setter for error message
 * @param {Function} [onError] - Callback for error handling
 * @returns {string} Formatted error message
 */
export const handleApiError = (error, setError, onError) => {
	let errorMessage = 'An unexpected error occurred';

	if (error.response) {
		const status = error.response.status;
		const serverMessage = error.response.data?.message || error.response.data?.error || 'Unknown server error';

		if (status === 401) {
			errorMessage = 'Authentication error: Your session may have expired. Please log in again.';
		} else if (status === 403) {
			errorMessage = 'Access denied: You do not have permission to perform this action.';
		} else if (status === 404) {
			errorMessage = 'Resource not found: The requested item could not be found.';
		} else if (status >= 500) {
			errorMessage = `Server error (${status}): ${serverMessage}`;
		} else {
			errorMessage = `Error: ${serverMessage} (${status})`;
		}
	} else if (error.request) {
		errorMessage = 'No response received from the server. Please check your network connection.';
	} else {
		errorMessage = error.message || 'Error setting up the request';
	}

	if (typeof setError === 'function') {
		setError(errorMessage);
	}

	if (typeof onError === 'function') {
		onError(errorMessage, error);
	}

	return errorMessage;
};

/**
 * Hook helper for error boundary integration
 * @param {Function} [onError] - Error callback
 * @returns {Object} Object with handleError function
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

const loggerModule = {
	handleApiError,
	logInfo,
	logWarning,
	logError,
	logDebug,
	trackError,
	useErrorBoundary,
	ErrorCategory
};

export default loggerModule;
