// /components/GistList.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGists, deleteGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';
import Spinner from './common/Spinner';

const GistList = () => {
  const [gists, setGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gistToDelete, setGistToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [gistsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
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
      setGists(gistsData);
    } catch (error) {
      console.error('Error fetching gists:', error);
      setError('Failed to fetch gists. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (gist) => {
    setGistToDelete(gist);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (gistToDelete) {
      try {
        await deleteGist(gistToDelete.id);
        setGists(gists.filter(g => g.id !== gistToDelete.id));
      } catch (error) {
        console.error('Error deleting gist:', error);
        setError('Failed to delete gist. Please try again later.');
      }
    }
    setIsConfirmOpen(false);
    setGistToDelete(null);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (option) => {
    if (option === sortOption) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  const filteredGists = gists.filter(gist =>
    gist.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.keys(gist.files).some(filename => 
      filename.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedGists = filteredGists.sort((a, b) => {
    if (sortOption === 'description') {
      return sortDirection === 'asc' 
        ? a.description.localeCompare(b.description)
        : b.description.localeCompare(a.description);
    } else {
      return sortDirection === 'asc'
        ? new Date(a[sortOption]) - new Date(b[sortOption])
        : new Date(b[sortOption]) - new Date(a[sortOption]);
    }
  });

  const indexOfLastGist = currentPage * gistsPerPage;
  const indexOfFirstGist = indexOfLastGist - gistsPerPage;
  const currentGists = sortedGists.slice(indexOfFirstGist, indexOfLastGist);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!user) {
    return <div>Please log in to view your gists.</div>;
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search gists..."
          value={searchTerm}
          onChange={handleSearch}
          className="p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <button onClick={() => handleSort('created_at')} className="mr-2">Sort by Created Date</button>
        <button onClick={() => handleSort('updated_at')} className="mr-2">Sort by Updated Date</button>
        <button onClick={() => handleSort('description')}>Sort Alphabetically</button>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {currentGists.map(gist => (
            <li key={gist.id}>
              <Link to={`/gist/${gist.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {gist.description || 'Untitled Gist'}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {Object.keys(gist.files).length} files
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Updated: {new Date(gist.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteClick(gist);
                      }}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        {Array.from({ length: Math.ceil(sortedGists.length / gistsPerPage) }, (_, i) => (
          <button
            key={i}
            onClick={() => paginate(i + 1)}
            className={`mx-1 px-3 py-1 border rounded ${currentPage === i + 1 ? 'bg-blue-500 text-white' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this gist? This action cannot be undone."
      />
    </div>
  );
};

export default GistList;