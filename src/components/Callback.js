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
      const returnedState = searchParams.get('state'); // Get state from URL
  
      const savedState = sessionStorage.getItem('oauth_state'); // Get saved state from sessionStorage
      console.log(`Saved state: ${savedState}, Returned state: ${returnedState}`);

      if (!code || !returnedState || returnedState !== savedState) {
        console.error(`Invalid state parameter: expected ${savedState}, got ${returnedState}`);
        navigate('/');
        return;
      }
  
      try {
        const success = await login(code, returnedState);
        if (success) {
          navigate('/dashboard');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/');
      }
    };
  
    handleCallback();
  }, [login, location, navigate]);
  
  return (
    <div>Processing authentication...</div>
  );
};

export default Callback;
