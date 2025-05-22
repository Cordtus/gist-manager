// utils/errorHandler.js

/**
 * Handle API errors and update state with appropriate error messages
 * 
 * @param {Error} error - The error object from an API call
 * @param {Function} setError - State setter function to update error message
 * @param {Function} [onError] - Optional callback for additional error handling
 */
export const handleApiError = (error, setError, onError) => {
  console.error('API Error:', error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with an error status code
    const status = error.response.status;
    const serverMessage = error.response.data?.message || error.response.data?.error || 'Unknown server error';
    
    if (status === 401) {
      errorMessage = 'Authentication error: Your session may have expired. Please log in again.';
      // Could trigger logout action here
    } else if (status === 403) {
      errorMessage = 'Access denied: You do not have permission to perform this action.';
    } else if (status === 404) {
      errorMessage = 'Resource not found: The requested item could not be found.';
    } else if (status === 422) {
      errorMessage = `Validation error: ${serverMessage}`;
    } else if (status >= 500) {
      errorMessage = `Server error (${status}): ${serverMessage}`;
    } else {
      errorMessage = `Error: ${serverMessage} (${status})`;
    }
  } else if (error.request) {
    // Request was made but no response received
    errorMessage = 'No response received from the server. Please check your network connection.';
  } else {
    // Something else happened while setting up the request
    errorMessage = error.message || 'Error setting up the request';
  }
  
  // Update error state if setError function was provided
  if (typeof setError === 'function') {
    setError(errorMessage);
  }
  
  // Call optional callback if provided
  if (typeof onError === 'function') {
    onError(errorMessage, error);
  }
  
  return errorMessage;
};