// Callback.js

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

        console.log('Saved State (localStorage):', savedState); // Debug log
        console.log('Received State (callback):', state);       // Debug log

        // Validate the presence of code and state
        if (!code || !state) {
          throw new Error('Missing code or state in OAuth callback.');
        }

        // Validate state to ensure security
        if (state !== savedState) {
          console.warn(`State mismatch: Expected ${savedState}, received ${state}`); // Debug warning
          throw new Error('Invalid or missing state parameter. Possible CSRF detected.');
        }

        // Clear the saved state from localStorage immediately after validation
        localStorage.removeItem('oauth_state');

        // Send the code and state to the server
        const response = await fetch('/api/auth/github', {
          method: 'POST',
          credentials: 'include', // Include cookies with the request
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server responded with error:', errorData); // Debug log
          throw new Error(errorData.error || 'Authentication failed.');
        }

        const data = await response.json();
        console.log('GitHub login successful:', data); // Debug log

        // Redirect to the dashboard on success
        navigate('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err); // Debug log
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsProcessing(false); // Stop loading state
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
