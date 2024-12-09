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
      <div className="text-center bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Welcome to Gist Manager</h2>
        <p className="text-gray-600">Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500 bg-white p-4 rounded shadow-md">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded shadow-md">
      {/* Display full user profile details */}
      <UserProfile />

      {/* Gist list */}
      <h2 className="text-xl font-bold mb-4 text-gray-800">Recent Gists</h2>
      <ul className="divide-y divide-gray-200 bg-white rounded shadow">
        {Array.isArray(gists) && gists.length > 0 ? (
          gists.map(gist => (
            <li key={gist.id} className="hover:bg-gray-100">
              <Link to={`/gist/${gist.id}`} className="block">
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
          <li className="px-4 py-4 text-gray-500">No gists available</li>
        )}
      </ul>

      {/* Link to view all gists */}
      <Link
        to="/gists"
        className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
      >
        View all gists
      </Link>
    </div>
  );
};

export default Dashboard;
