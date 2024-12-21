// components/Callback.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';

const Callback = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null); // Add state for error handling

  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const savedState = localStorage.getItem('oauth_state');
    
      if (!code || !state) {
        setError('Missing code or state in OAuth callback.');
        return;
      }
    
      if (state !== savedState) {
        setError('Invalid state parameter.');
        return;
      }
    
      try {
        const response = await fetch('/api/auth/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
    
        if (!response.ok) {
          const { error } = await response.json();
          setError(error || 'Failed to authenticate with GitHub.');
          return;
        }
    
        const data = await response.json();
        console.log('GitHub login success:', data); // Log success for debugging
        navigate('/dashboard');
      } catch (err) {
        console.error('Error during GitHub login:', err);
        setError('Failed to authenticate. Please try again.');
      }
    };

    handleCallback();
  }, [login, location, navigate]);

  return (
    <div>
      {error ? (
        <div className="error-message text-red-500">{error}</div>
      ) : (
        <div>Processing authentication...</div>
      )}
    </div>
  );
};

export default Callback;
