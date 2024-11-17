// Dashboard.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGists } from '../services/api/github';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';

const Dashboard = () => {
  const [gists, setGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchGists();
    }
  }, [user]);

  const fetchGists = async () => {
    try {
      setLoading(true);
      setError(null);
      const gistsData = await getGists();
      setGists(gistsData.slice(0, 5)); // Show only the 5 most recent gists
    } catch (error) {
      console.error('Error fetching gists:', error);
      setError('Failed to fetch gists. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Recent Gists</h3>
          <ul className="bg-white shadow overflow-hidden sm:rounded-md">
            {gists.map(gist => (
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
            ))}
          </ul>
          <Link to="/gists" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
            View all gists
          </Link>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Quick Actions</h3>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              <li>
                <Link to="/gist" className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <p className="text-sm font-medium text-indigo-600">Create New Gist</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/convert" className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <p className="text-sm font-medium text-indigo-600">Convert File</p>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;