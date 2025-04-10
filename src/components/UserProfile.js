// components/UserProfile.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserProfile = () => {
  const auth = useAuth();
  
  // Return early if auth is undefined
  if (!auth) return null;
  
  const { user, loading, error } = auth;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>User Profile</h1>
      {user ? (
        <div>
          <p>Name: {user.name || 'No name provided'}</p>
          <p>Username: {user.login || 'No username'}</p>
          <p>Email: {user.email || 'No email provided'}</p>
        </div>
      ) : (
        <p>No user data available</p>
      )}
    </div>
  );
};