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
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const returnedState = searchParams.get('state'); // State parameter from the URL
      const savedState = localStorage.getItem('oauth_state'); // Saved state from localStorage

      // Validate state and code
      if (!code) {
        console.error('Authorization code missing in callback');
        navigate('/'); // Redirect to home or error page
        return;
      }

      if (!returnedState || returnedState !== savedState) {
        console.error('State mismatch or missing');
        navigate('/'); // Redirect to home or error page
        return;
      }

      // Clear the saved OAuth state as it's no longer needed
      localStorage.removeItem('oauth_state');

      try {
        // Attempt login with the code and state
        const success = await login(code, returnedState);
        if (success) {
          console.log('Authentication successful');
          navigate('/dashboard'); // Navigate to dashboard upon success
        } else {
          console.error('Login failed');
          navigate('/'); // Redirect to home on failure
        }
      } catch (error) {
        console.error('Error during authentication:', error);
        navigate('/'); // Redirect to home on error
      }
    };

    handleCallback();
  }, [login, location.search, navigate]);

  return (
    <div>Processing authentication...</div>
  );
};

export default Callback;
