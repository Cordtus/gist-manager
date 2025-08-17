// components/SharedGistList.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllSharedGists } from '../services/api/sharedGists';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
import { generateGistPreview } from '../utils/describeGist';

const SharedGistList = () => {
  const [sharedGists, setSharedGists] = useState([]);
  const [filteredGists, setFilteredGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const { user } = useAuth();

  // Fetch all shared gists
  const fetchSharedGists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllSharedGists();
      
      if (response && response.gists) {
        setSharedGists(response.gists);
        setFilteredGists(response.gists);
      }
    } catch (error) {
      console.error('Error fetching shared gists:', error);
      setError('Failed to fetch shared gists. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSharedGists();
  }, [fetchSharedGists]);

  // Handle search and filtering
  useEffect(() => {
    if (!sharedGists.length) return;
    
    // Filter based on search term
    let filtered = [...sharedGists];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(gist => 
        (gist.description && gist.description.toLowerCase().includes(term)) ||
        (gist.username && gist.username.toLowerCase().includes(term)) ||
        Object.keys(gist.files).some(filename => filename.toLowerCase().includes(term))
      );
    }
    
    // Sort the results
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortOption) {
        case 'description':
          valueA = (a.description || '').toLowerCase();
          valueB = (b.description || '').toLowerCase();
          return sortDirection === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        case 'username':
          valueA = (a.username || '').toLowerCase();
          valueB = (b.username || '').toLowerCase();
          return sortDirection === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        case 'filesCount':
          valueA = Object.keys(a.files).length;
          valueB = Object.keys(b.files).length;
          return sortDirection === 'asc' 
            ? valueA - valueB 
            : valueB - valueA;
        case 'sharedAt':
          return sortDirection === 'asc' 
            ? new Date(a.sharedAt) - new Date(b.sharedAt) 
            : new Date(b.sharedAt) - new Date(a.sharedAt);
        case 'updatedAt':
        default:
          return sortDirection === 'asc' 
            ? new Date(a.updatedAt) - new Date(b.updatedAt) 
            : new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });
    
    setFilteredGists(filtered);
  }, [sharedGists, searchTerm, sortOption, sortDirection]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle sort option change
  const handleSortChange = (option) => {
    if (option === sortOption) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };


  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-md">
        {error}
        <button 
          onClick={fetchSharedGists}
          className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Community Shared Gists</h2>
        
        {/* Search and filters */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search shared gists by title, username, or filename..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full p-3 border rounded-lg pl-10 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 outline-none"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Sort options */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            onClick={() => handleSortChange('updatedAt')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'updatedAt' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last Updated
            {sortOption === 'updatedAt' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('sharedAt')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'sharedAt' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Date Shared
            {sortOption === 'sharedAt' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('description')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'description' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Description
            {sortOption === 'description' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('username')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'username' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Username
            {sortOption === 'username' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('filesCount')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'filesCount' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            File Count
            {sortOption === 'filesCount' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        </div>
        
        {/* Results count */}
        <div className="text-sm text-gray-500 mb-4">
          Showing {filteredGists.length} shared gists
          {searchTerm && <span> matching "{searchTerm}"</span>}
        </div>
      </div>
      
      {/* Shared Gists List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredGists.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredGists.map(gist => {
              const preview = generateGistPreview(gist);
              return (
              <div key={gist.sharedId} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-indigo-600 truncate">
                    {gist.description || preview.generatedTitle || 'Untitled Gist'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      Object.keys(gist.files).length > 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {Object.keys(gist.files).length} {Object.keys(gist.files).length === 1 ? 'file' : 'files'}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 italic text-sm mb-2">
                  {preview.preview}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.keys(gist.files).slice(0, 3).map(filename => (
                    <span key={filename} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {filename}
                    </span>
                  ))}
                  {Object.keys(gist.files).length > 3 && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      +{Object.keys(gist.files).length - 3} more
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-500 mt-3">
                  <div>
                    <span className="font-medium text-gray-700">Shared by:</span> {gist.username}
                  </div>
                  <div>
                    <span>Shared: {formatDate(gist.sharedAt)}</span>
                    <span className="mx-2">•</span>
                    <span>Updated: {formatDate(gist.updatedAt)}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <a 
                    href={`https://gist.github.com/${gist.username}/${gist.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 mr-2"
                  >
                    View on GitHub
                  </a>
                  <Link 
                    to={`/shared/${gist.sharedId}`}
                    className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    View Details
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-6 text-center text-gray-500">
            <p>No shared gists found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
            
            {user && (
              <div className="mt-4">
                <p>Be the first to share a gist with the community!</p>
                <Link to="/gists" className="inline-block mt-2 text-indigo-600 hover:text-indigo-800">
                  View your gists to share one
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedGistList;