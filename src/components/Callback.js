import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const savedState = localStorage.getItem('oauth_state');

        // Debug logs to track flow
        console.log('Saved State:', savedState);
        console.log('Received State:', state);
        console.log('Authorization Code:', code);

        if (!code || !state) {
          throw new Error('Missing code or state in OAuth callback.');
        }

        if (state !== savedState) {
          console.warn(`State mismatch: Expected "${savedState}", received "${state}"`);
          throw new Error('Invalid or missing state parameter. Possible CSRF detected.');
        }

        // Clear the saved state from localStorage after validation
        localStorage.removeItem('oauth_state');

        // Send the code to the backend for token exchange
        const response = await fetch('/api/auth/github', {
          method: 'POST',
          credentials: 'include', // Include cookies in the request
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server Authentication Error:', errorData);
          throw new Error(errorData.error || 'Authentication failed.');
        }

        const data = await response.json();
        console.log('GitHub login successful:', data);

        // Redirect to the dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="container flex-center">
      {isProcessing ? (
        <div className="shadow rounded p-2 text-center">
          <p>Processing authentication... Please wait.</p>
        </div>
      ) : error ? (
        <div className="error-message shadow rounded p-2 text-center">{error}</div>
      ) : null}
    </div>
  );
};

export default Callback;
