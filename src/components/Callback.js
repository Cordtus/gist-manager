// components/Callback.js

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Callback = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract query parameters
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const returnedState = searchParams.get('state'); // State parameter from the URL
        const savedState = localStorage.getItem('oauth_state'); // Saved state from localStorage

        // Debugging logs
        console.debug('Location search:', location.search);
        console.debug('Authorization code:', code);
        console.debug('Returned state:', returnedState);
        console.debug('Saved state:', savedState);

        // Validate the presence of code
        if (!code) {
          console.error('Authorization code is missing in callback');
          navigate('/'); // Redirect to home or error page
          return;
        }

        // Validate the state parameter
        if (!returnedState || returnedState !== savedState) {
          console.error('State mismatch or missing. Potential CSRF attempt.');
          navigate('/'); // Redirect to home or error page
          return;
        }

        // Clear the saved OAuth state as it's no longer needed
        localStorage.removeItem('oauth_state');

        // Attempt to log in using the authorization code and state
        const success = await login(code, returnedState);
        if (success) {
          console.info('Authentication successful');
          navigate('/dashboard'); // Navigate to the dashboard upon success
        } else {
          console.warn('Login failed. Check server response or token validity.');
          navigate('/'); // Redirect to home on failure
        }
      } catch (error) {
        // Log unexpected errors
        console.error('Unexpected error during authentication:', error);
        navigate('/'); // Redirect to home on error
      }
    };

    handleCallback();
  }, [login, location.search, navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h2>Processing Authentication...</h2>
      <p>Please wait while we complete your login.</p>
    </div>
  );
};

export default Callback;
