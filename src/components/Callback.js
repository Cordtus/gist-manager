// components/Callback.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';

// Same constant as in AuthContext
const OAUTH_STATE_KEY = 'gist_manager_oauth_state';

const Callback = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsProcessing(true);
        
        // Parse the URL parameters
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const returnedState = searchParams.get('state');
        
        // Get the stored state from various storage locations
        const savedStateLocal = localStorage.getItem(OAUTH_STATE_KEY);
        const savedStateSession = sessionStorage.getItem(OAUTH_STATE_KEY);
        
        // Try to get state from cookie as well
        const savedStateCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${OAUTH_STATE_KEY}=`))
          ?.split('=')[1];
      
        // Store debug info for display
        setDebugInfo({
          code: code ? `${code.substring(0, 5)}...` : 'none',
          returnedState,
          savedStates: {
            localStorage: savedStateLocal,
            sessionStorage: savedStateSession,
            cookie: savedStateCookie
          },
          url: window.location.href,
          time: new Date().toISOString()
        });
        
        // Debug logging
        console.log('==== GitHub OAuth Callback Debug ====');
        console.log(`Code: ${code ? `${code.substring(0, 5)}...` : 'none'}`);
        console.log(`Returned state: ${returnedState}`);
        console.log('Saved states:', {
          localStorage: savedStateLocal,
          sessionStorage: savedStateSession,
          cookie: savedStateCookie
        });
        
        if (!code) {
          setError('No authorization code received from GitHub. Authentication failed.');
          setIsProcessing(false);
          return;
        }
        
        // Attempt login with the code and state
        const success = await login(code, returnedState);
        
        if (success) {
          navigate('/dashboard');
        } else {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setError(`Authentication error: ${error.message}`);
        setIsProcessing(false);
      }
    };
    
    // Execute the callback handler when component mounts
    handleCallback();
  }, [login, location, navigate]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Authentication Error</p>
          <p>{error}</p>
        </div>
        
        {/* Show debug info to help troubleshoot */}
        <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Debug Information:</p>
          <pre className="text-xs mt-2 overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="flex space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Return to Homepage
          </button>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <Spinner />
      <p className="mt-4 text-lg font-medium">
        {isProcessing ? 'Processing GitHub authentication...' : 'Redirecting...'}
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Please wait while we complete the GitHub authentication process.
      </p>
    </div>
  );
};

export default Callback;