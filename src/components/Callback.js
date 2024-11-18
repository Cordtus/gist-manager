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
      const state = searchParams.get('state'); 

      if (!code) {
        console.error('No code received from GitHub');
        navigate('/');
        return;
      }

      try {
        // Pass both code and state to login function
        const success = await login(code, state);
        if (success) {
          navigate('/dashboard');  // Redirect to dashboard after successful login
        } else {
          navigate('/');  // Redirect to home if login fails
        }
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/');  // Redirect to home on error
      }
    };

    handleCallback();
  }, [login, location, navigate]);

  return (
    <div>Processing authentication...</div>
  );
};

export default Callback;