// Dashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getGists } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
import { UserProfile } from './UserProfile';

const Dashboard = () => {
  const [gists, setGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, token } = useAuth();

  const fetchGists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const gistsData = await getGists(token);
      setGists(gistsData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching gists:', error);
      setError('Failed to fetch gists. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchGists();
    }
  }, [user, token, fetchGists]);

  if (!user) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to Gist Manager</h2>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Display full user profile details */}
      <UserProfile /> {/* Reuse UserProfile component */}

      {/* Gist list */}
      <h2 className="text-xl font-bold mb-4">Recent Gists</h2>
      <ul className="bg-white shadow overflow-hidden sm:rounded-md">
        {Array.isArray(gists) && gists.length > 0 ? (
          gists.map(gist => (
            <li key={gist.id}>
              <Link to={`/gist/${gist.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <p className="text-sm font-medium text-indigo-600 truncate">
                    {gist.description || 'Untitled Gist'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Updated: {new Date(gist.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            </li>
          ))
        ) : (
          <p>No gists available</p>
        )}
      </ul>

      {/* Link to view all gists */}
      <Link to="/gists" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
        View all gists
      </Link>

    </div>
  );
};

export default Dashboard;