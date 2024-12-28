// Callback.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true); // Loading state

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');

        console.log('Received Code (callback):', code); // Debugging

        if (!code) {
          throw new Error('Missing code in OAuth callback.');
        }

        // Send the code to the server (state is validated on the backend via cookie)
        const response = await fetch('/api/auth/github', {
          method: 'POST',
          credentials: 'include', // Include cookies with the request
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server responded with error:', errorData); // Debugging
          throw new Error(errorData.error || 'Authentication failed.');
        }

        const data = await response.json();
        console.log('GitHub login successful:', data); // Debugging

        // Navigate to the dashboard on successful login
        navigate('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err); // Debugging
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsProcessing(false); // Stop loading
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
