// components/SharedGistDetail.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAllSharedGists } from '../services/api/sharedGists';
// Remove unused import: import { useAuth } from '../contexts/AuthContext';
import MarkdownPreview from './markdown/MarkdownPreview';
import Spinner from './common/Spinner';

const SharedGistDetail = () => {
  const [gist, setGist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const { sharedId } = useParams();
  const navigate = useNavigate();
  // Remove unused variable: const { user } = useAuth();

  // Fetch the shared gist
  const fetchSharedGist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllSharedGists();
      
      if (response && response.gists) {
        const foundGist = response.gists.find(g => g.sharedId === sharedId);
        
        if (foundGist) {
          setGist(foundGist);
          // Set the first file as active by default
          const firstFilename = Object.keys(foundGist.files)[0];
          setActiveFile(firstFilename);
        } else {
          setError('Shared gist not found');
        }
      }
    } catch (error) {
      console.error('Error fetching shared gist:', error);
      setError('Failed to fetch shared gist. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [sharedId]);

  // Initial fetch
  useEffect(() => {
    fetchSharedGist();
  }, [fetchSharedGist]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine file type/language
  const getFileType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'js':
        return 'JavaScript';
      case 'jsx':
        return 'React JSX';
      case 'ts':
        return 'TypeScript';
      case 'tsx':
        return 'React TypeScript';
      case 'py':
        return 'Python';
      case 'rb':
        return 'Ruby';
      case 'java':
        return 'Java';
      case 'c':
        return 'C';
      case 'cpp':
        return 'C++';
      case 'cs':
        return 'C#';
      case 'go':
        return 'Go';
      case 'php':
        return 'PHP';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'scss':
        return 'SCSS';
      case 'md':
        return 'Markdown';
      case 'mdx':
        return 'MDX';
      case 'json':
        return 'JSON';
      case 'yml':
      case 'yaml':
        return 'YAML';
      case 'sh':
        return 'Shell';
      case 'bat':
        return 'Batch';
      case 'ps1':
        return 'PowerShell';
      case 'sql':
        return 'SQL';
      default:
        return 'Plain Text';
    }
  };

  // Get file badge style based on extension
  const getFileBadgeStyle = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'bg-yellow-100 text-yellow-800';
      case 'ts':
      case 'tsx':
        return 'bg-blue-100 text-blue-800';
      case 'py':
        return 'bg-green-100 text-green-800';
      case 'rb':
        return 'bg-red-100 text-red-800';
      case 'java':
        return 'bg-orange-100 text-orange-800';
      case 'html':
        return 'bg-red-100 text-red-800';
      case 'css':
      case 'scss':
        return 'bg-purple-100 text-purple-800';
      case 'md':
      case 'mdx':
        return 'bg-indigo-100 text-indigo-800';
      case 'json':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="p-6 bg-white shadow rounded-lg">
        <div className="p-4 bg-red-50 text-red-500 rounded-md mb-4">
          {error}
        </div>
        <button 
          onClick={() => navigate('/shared')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Back to Shared Gists
        </button>
      </div>
    );
  }

  if (!gist) {
    return (
      <div className="p-6 bg-white shadow rounded-lg">
        <p className="mb-4">Gist not found or has been removed.</p>
        <button 
          onClick={() => navigate('/shared')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Back to Shared Gists
        </button>
      </div>
    );
  }

  // Check if active file is markdown
  const isMarkdown = activeFile && (activeFile.endsWith('.md') || activeFile.endsWith('.markdown'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {gist.description || 'Untitled Gist'}
            </h2>
            <p className="text-sm text-gray-600">
              Shared by <strong>{gist.username}</strong> on {formatDate(gist.sharedAt)}
            </p>
            <p className="text-sm text-gray-600">
              Last updated: {formatDate(gist.updatedAt)}
            </p>
          </div>
          <div className="flex space-x-2">
            <a 
              href={`https://gist.github.com/${gist.username}/${gist.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              View on GitHub
            </a>
            <Link
              to="/shared"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Back to Shared Gists
            </Link>
          </div>
        </div>
      </div>
      
      {/* File tabs and content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* File tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 overflow-x-auto">
          <div className="flex space-x-2">
            {Object.keys(gist.files).map(filename => (
              <button
                key={filename}
                onClick={() => setActiveFile(filename)}
                className={`px-3 py-2 text-sm rounded-md whitespace-nowrap ${
                  activeFile === filename
                    ? 'bg-white text-indigo-700 border border-gray-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filename}
              </button>
            ))}
          </div>
        </div>
        
        {/* File information */}
        {activeFile && (
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              <span className={`px-2 py-1 text-xs rounded-full ${getFileBadgeStyle(activeFile)}`}>
                {getFileType(activeFile)}
              </span>
              <span className="ml-2 text-sm text-gray-700">
                {gist.files[activeFile].size || 'Unknown'} bytes
              </span>
            </div>
          </div>
        )}
        
        {/* File content */}
        {activeFile && (
          <div className="p-4">
            {isMarkdown ? (
              <div className="markdown-preview bg-white rounded-lg p-6 border border-gray-200">
                <MarkdownPreview content={gist.files[activeFile].content} />
              </div>
            ) : (
              <div className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {gist.files[activeFile].content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedGistDetail;