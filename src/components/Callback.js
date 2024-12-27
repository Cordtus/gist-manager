import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const savedState = localStorage.getItem('oauth_state');
      console.log('Saved State:', savedState); // Debug log
      console.log('Received State:', state);   // Debug log
    
      if (!code || !state) {
        console.error('OAuth callback error: Missing code or state.');
        setError('Missing code or state in OAuth callback.');
        return;
      }
    
      if (state !== savedState) {
        console.error('OAuth callback error: Invalid state parameter.');
        setError('Invalid state parameter.');
        return;
      }
    
      try {
        const response = await fetch('/api/auth/github', {
          method: 'POST',
          credentials: 'include', // Include cookies with the request
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });
    
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          setError(errorData.error || 'Authentication failed.');
          return;
        }
    
        const data = await response.json();
        console.log('GitHub login successful:', data);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error during GitHub login:', err);
        setError('Failed to authenticate. Please try again.');
      }
    };
    
    handleCallback();
  }, [location, navigate]);
  
  return (
    <div className="container flex-center">
      {error ? (
        <div className="error-message shadow rounded p-2 text-center">{error}</div>
      ) : (
        <div className="shadow rounded p-2 text-center">
          <p>Processing authentication... Please wait.</p>
        </div>
      )}
    </div>
  );
};

export default Callback;
