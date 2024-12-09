// UserProfile.js
// Displays the user's profile details.

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserProfile = () => {
  const { user, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      {user ? (
        <div>
          <p>
            <span className="font-medium">Name:</span> {user.name}
          </p>
          <p>
            <span className="font-medium">Username:</span> {user.login}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
        </div>
      ) : (
        <p className="text-gray-500">No user data available.</p>
      )}
    </div>
  );
};
