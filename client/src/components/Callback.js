// components/Callback.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';

const isDevelopment = process.env.NODE_ENV === 'development';

const Callback = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsProcessing(true);
        
        // Parse URL parameters
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const returnedState = searchParams.get('state');
        
        if (!code) {
          setError('No authorization code received from GitHub. Authentication failed.');
          setIsProcessing(false);
          return;
        }
        
        // Call login function with code and state
        const success = await login(code, returnedState);
        
        if (success) {
          navigate('/');
        } else {
          setError('Authentication failed. Please try again.');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setError(`Authentication failed: ${isDevelopment ? error.message : 'Please try again later.'}`);
        setIsProcessing(false);
      }
    };
    
    handleCallback();
  }, [login, location, navigate]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Authentication Error</p>
          <p>{error}</p>
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