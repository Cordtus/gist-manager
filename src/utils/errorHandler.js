export const handleApiError = (error, setError) => {
  if (error.response) {
    setError(`Error: ${error.response.data.message || 'Something went wrong'}`);
  } else if (error.request) {
    setError('No response received from the server');
  } else {
    setError('Error setting up the request');
  }
  console.error('Error:', error);
};