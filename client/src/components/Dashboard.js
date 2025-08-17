// Dashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getGists } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
import { generateGistPreview } from '../utils/describeGist';

const Dashboard = () => {
  const [gists, setGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalGists: 0,
    totalFiles: 0,
    avgFilesPerGist: 0,
    mostRecentUpdate: null,
    fileTypes: {}
  });
  const { user, token, initiateGithubLogin } = useAuth();

  const fetchGists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const gistsData = await getGists(token, setError, user?.id);
      
      // Calculate metrics from gists data
      const totalGists = gistsData.length;
      let totalFiles = 0;
      let mostRecentUpdate = null;
      const fileTypes = {};
      
      gistsData.forEach(gist => {
        const filesCount = Object.keys(gist.files).length;
        totalFiles += filesCount;
        
        // Track file types for statistics
        Object.values(gist.files).forEach(file => {
          const extension = file.filename.split('.').pop().toLowerCase() || 'unknown';
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        });
        
        // Track most recent update
        const updateDate = new Date(gist.updated_at);
        if (!mostRecentUpdate || updateDate > mostRecentUpdate) {
          mostRecentUpdate = updateDate;
        }
      });
      
      setMetrics({
        totalGists,
        totalFiles,
        avgFilesPerGist: totalGists ? (totalFiles / totalGists).toFixed(1) : 0,
        mostRecentUpdate,
        fileTypes
      });
      
      // Only display the 5 most recent gists on dashboard
      setGists(gistsData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching gists:', error);
      setError('Failed to fetch gists. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (user && token) {
      fetchGists();
    } else {
      setLoading(false);
    }
  }, [user, token, fetchGists]);


  if (!user) {
    return (
      <div className="flex flex-col space-y-8">
        {/* Hero section */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">Welcome to Gist Manager</h1>
          <p className="text-lg mb-6">
            A tool to create, edit, and organize your GitHub Gists, now with{' '}
            <span className="relative inline-block">
              <span className="relative z-10">advanced</span>
              <span className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
                <span className="absolute w-20 h-[3px] bg-black transform rotate-[25deg]" />
                <span className="absolute w-20 h-[3px] bg-black transform -rotate-[25deg]" />
              </span>
            </span>{' '}
            features!
          </p>
          <button 
            onClick={initiateGithubLogin}
            className="bg-white text-indigo-600 px-6 py-3 rounded-md font-medium hover:bg-indigo-50 transition duration-200"
          >
            Connect with GitHub
          </button>
        </div>
  
        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all duration-300 card-hover">
            <div className="text-indigo-600 text-xl mb-2">✏️ Better Editing</div>
            <p className="text-gray-600">Create and edit with a live Markdown preview.</p>
          </div>
  
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all duration-300 card-hover">
            <div className="text-indigo-600 text-xl mb-2">🔍 Smart Search</div>
            <p className="text-gray-600">Find past work without clicking through 50 pages one-by-one
              <br /> with basic search and filtering.</p>
          </div>
  
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all duration-300 card-hover">
            <div className="text-indigo-600 text-xl mb-2">🔄 File Conversion</div>
            <p className="text-gray-600">
              Convert text and code snippets:
              <br /> - Markdown&lt;&gt;HTML&lt;&gt;Plaintext
              <br /> - JSON(string&lt;&gt;pretty).
            </p>
          </div>
  
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-all duration-300 card-hover">
            <div className="text-indigo-600 text-xl mb-2">👥 Community Sharing</div>
            <p className="text-gray-600">Share gists and discover content from others.</p>
          </div>
        </div>
      </div>
    );
  }


  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-50 rounded-md">{error}</div>;
  }

  // Get top 3 file types
  const topFileTypes = Object.entries(metrics.fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">User Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Username:</p>
            <p className="font-medium">{user.login || 'Not available'}</p>
            
            <p className="text-sm text-gray-600 mt-3">Name:</p>
            <p className="font-medium">{user.name || 'Not provided'}</p>
            
            <p className="text-sm text-gray-600 mt-3">Email:</p>
            <p className="font-medium">{user.email || 'Not provided'}</p>
          </div>
          <div>
            {user.avatar_url && (
              <img 
                src={user.avatar_url} 
                alt="Profile" 
                className="w-24 h-24 rounded-full border-2 border-gray-200 float-right"
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Gist Statistics Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Gist Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-700">Total Gists</p>
            <p className="text-2xl font-bold text-blue-800">{metrics.totalGists}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-700">Total Files</p>
            <p className="text-2xl font-bold text-green-800">{metrics.totalFiles}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-md">
            <p className="text-sm text-purple-700">Avg. Files per Gist</p>
            <p className="text-2xl font-bold text-purple-800">{metrics.avgFilesPerGist}</p>
          </div>
        </div>
        
        {topFileTypes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Top File Types:</p>
            <div className="flex flex-wrap gap-2">
              {topFileTypes.map(([type, count]) => (
                <span key={type} className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                  {type}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {metrics.mostRecentUpdate && (
          <div className="mt-4 text-sm text-gray-600">
            Last updated: {metrics.mostRecentUpdate.toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Recent Gists */}
      <div className="bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold p-6 pb-4 text-gray-800 border-b">Recent Gists</h2>
        {Array.isArray(gists) && gists.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {gists.map(gist => {
              const preview = generateGistPreview(gist);
              return (
                <li key={gist.id}>
                  <Link to={`/gist/${gist.id}`} className="block p-6 hover:bg-gray-50 transition duration-150">
                    <p className="text-lg font-medium text-indigo-600 truncate">
                      {gist.description || preview.generatedTitle || 'Untitled Gist'}
                    </p>
                    <p className="mt-1 text-gray-600 italic text-sm">
                      {preview.preview}
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {Object.keys(gist.files).length} {Object.keys(gist.files).length === 1 ? 'file' : 'files'}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          Updated: {new Date(gist.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                </Link>
              </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>No gists available</p>
            <Link to="/gist" className="inline-block mt-4 text-indigo-600 hover:text-indigo-800">
              Create your first gist
            </Link>
          </div>
        )}
        
        {gists.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <Link to="/gists" className="text-indigo-600 hover:text-indigo-800 font-medium">
              View all gists →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;