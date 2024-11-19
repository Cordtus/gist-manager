// components/UserProfile.js

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserProfile = () => {
  const { user, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>User Profile</h1>
      {user ? (
        <div>
          <p>Name: {user.name}</p>
          <p>Username: {user.login}</p>
          <p>Email: {user.email}</p>
          {/* Add more user details as needed */}
        </div>
      ) : (
        <p>No user data available</p>
      )}
    </div>
  );
};
