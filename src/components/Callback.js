// src/components/Callback.js
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Callback = () => {
  const { handleCallback } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const run = async () => {
      try {
        await handleCallback(search);
        navigate('/');
      } catch {
        navigate('/error');
      }
    };
    run();
  }, [search, handleCallback, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="p-6 bg-surface rounded shadow-md text-center">
        <p className="text-secondary">Signing you in…</p>
      </div>
    </div>
  );
};

export default Callback;
