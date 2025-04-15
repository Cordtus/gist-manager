// GistList.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getGists, deleteGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';
import Spinner from './common/Spinner';

const GistList = () => {
  const [gists, setGists] = useState([]);
  const [filteredGists, setFilteredGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gistToDelete, setGistToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [gistsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchIndex, setSearchIndex] = useState({});
  const [sortOption, setSortOption] = useState('updated_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const hasDataFetchedRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const [filterOptions, setFilterOptions] = useState({
    fileType: '',
    minFiles: '',
    maxFiles: '',
    dateFrom: '',
    dateTo: ''
  });
  const { user } = useAuth();

  // Build search index for efficient searching
  const buildSearchIndex = useCallback((gistsData) => {
    if (!gistsData || !Array.isArray(gistsData)) return;
    
    const index = {};
    
    gistsData.forEach(gist => {
      // Index gist ID
      index[gist.id] = {
        description: gist.description?.toLowerCase() || '',
        filenames: Object.keys(gist.files).map(name => name.toLowerCase()),
        content: [],
        fileTypes: new Set(),
        filesCount: Object.keys(gist.files).length
      };
      
      // Index file content and types
      Object.entries(gist.files).forEach(([filename, file]) => {
        // Get file extension
        const extension = filename.includes('.') 
          ? filename.split('.').pop().toLowerCase() 
          : '';
          
        if (extension) {
          index[gist.id].fileTypes.add(extension);
        }
        
        // Only index content if it's available and not too large
        if (file.content && file.content.length < 100000) {
          index[gist.id].content.push(file.content.toLowerCase());
        }
      });
    });
    
    setSearchIndex(index);
  }, []);

  // Apply filters, search, and sort
  const applyFiltersAndSort = useCallback((gistsData, search, filters, sort, direction) => {
    if (!gistsData || !Array.isArray(gistsData) || !gistsData.length) {
      setFilteredGists([]);
      return;
    }
    
    let results = [...gistsData];
    
    // Apply search if provided
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase().trim();
      
      results = results.filter(gist => {
        const indexEntry = searchIndex[gist.id];
        if (!indexEntry) return false;
        
        // Search in description
        if (indexEntry.description.includes(searchLower)) return true;
        
        // Search in filenames
        if (indexEntry.filenames.some(name => name.includes(searchLower))) return true;
        
        // Search in content
        if (indexEntry.content.some(content => content.includes(searchLower))) return true;
        
        return false;
      });
    }
    
    // Apply advanced filters
    if (filters) {
      // Filter by file type
      if (filters.fileType && filters.fileType.trim() !== '') {
        const fileType = filters.fileType.toLowerCase().trim();
        results = results.filter(gist => {
          const indexEntry = searchIndex[gist.id];
          return indexEntry && indexEntry.fileTypes.has(fileType);
        });
      }
      
      // Filter by file count
      if (filters.minFiles && !isNaN(parseInt(filters.minFiles))) {
        const minFiles = parseInt(filters.minFiles);
        results = results.filter(gist => {
          return Object.keys(gist.files).length >= minFiles;
        });
      }
      
      if (filters.maxFiles && !isNaN(parseInt(filters.maxFiles))) {
        const maxFiles = parseInt(filters.maxFiles);
        results = results.filter(gist => {
          return Object.keys(gist.files).length <= maxFiles;
        });
      }
      
      // Filter by date range
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        results = results.filter(gist => {
          return new Date(gist.updated_at) >= fromDate;
        });
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        // Set to end of day
        toDate.setHours(23, 59, 59, 999);
        results = results.filter(gist => {
          return new Date(gist.updated_at) <= toDate;
        });
      }
    }
    
    // Apply sorting
    results.sort((a, b) => {
      if (sort === 'description') {
        const aVal = (a.description || '').toLowerCase();
        const bVal = (b.description || '').toLowerCase();
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (sort === 'files_count') {
        const aCount = Object.keys(a.files).length;
        const bCount = Object.keys(b.files).length;
        return direction === 'asc' ? aCount - bCount : bCount - aCount;
      } else {
        // Default: sort by date
        return direction === 'asc'
          ? new Date(a[sort]) - new Date(b[sort])
          : new Date(b[sort]) - new Date(a[sort]);
      }
    });
    
    setFilteredGists(results);
    setCurrentPage(1); // Reset to first page after filtering
  }, [searchIndex]);

// Fetch gists from API
const fetchGists = useCallback(async () => {
  if (hasDataFetchedRef.current) {
    console.log('Gists already fetched, skipping fetch');
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const gistsData = await getGists();
    if (Array.isArray(gistsData)) {
      setGists(gistsData);
      buildSearchIndex(gistsData);
      applyFiltersAndSort(gistsData, searchTerm, filterOptions, sortOption, sortDirection);
    }
  } catch (error) {
    console.error('Error fetching gists:', error);
    setError('Failed to fetch gists.'); // Removed the trailing 'r.'
  } finally {
    // Always set this, so it won't fetch again
    hasDataFetchedRef.current = true;
    setLoading(false);
  }
}, [
  buildSearchIndex,
  applyFiltersAndSort,
  searchTerm,
  filterOptions,
  sortOption,
  sortDirection
]);


useEffect(() => {
  if (user && !hasDataFetchedRef.current) {
    fetchGists();
  }
}, [user, fetchGists]);


// Handle search with debounce
useEffect(() => {
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }
  
  // skip if no data yet
  if (gists.length === 0) return;
  
  searchTimeoutRef.current = setTimeout(() => {
    applyFiltersAndSort(gists, searchTerm, filterOptions, sortOption, sortDirection);
  }, 300);
  
  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, [searchTerm, filterOptions, sortOption, sortDirection, gists, applyFiltersAndSort]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSortChange = (option) => {
    if (option === sortOption) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  const handleDeleteClick = (gist, e) => {
    e.preventDefault();
    e.stopPropagation();
    setGistToDelete(gist);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (gistToDelete) {
      try {
        await deleteGist(gistToDelete.id);
        setGists(gists.filter(g => g.id !== gistToDelete.id));
        setFilteredGists(filteredGists.filter(g => g.id !== gistToDelete.id));
      } catch (error) {
        console.error('Error deleting gist:', error);
        setError('Failed to delete gist. Please try again later.');
      }
    }
    setIsConfirmOpen(false);
    setGistToDelete(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      fileType: '',
      minFiles: '',
      maxFiles: '',
      dateFrom: '',
      dateTo: ''
    });
    setIsAdvancedSearch(false);
    
    // re-sort without filters
    if (gists.length > 0) {
      applyFiltersAndSort(gists, '', {}, sortOption, sortDirection);
    }
  };

  // force refresh of data
  const refreshGists = async () => {
    hasDataFetchedRef.current = false;
    await fetchGists();
  };

  // get gist preview
  const getGistPreview = (gist) => {
    // Get first file content preview
    const firstFile = Object.values(gist.files)[0];
    if (!firstFile || !firstFile.content) return 'No content available';
    
    // get first line up to 50 char
    const content = firstFile.content;
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine;
  };

  // Pagination
  const indexOfLastGist = currentPage * gistsPerPage;
  const indexOfFirstGist = indexOfLastGist - gistsPerPage;
  const currentGists = filteredGists.slice(indexOfFirstGist, indexOfLastGist);
  const totalPages = Math.ceil(filteredGists.length / gistsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!user) {
    return <div className="p-6 bg-white rounded-lg shadow">Please log in to view your gists.</div>;
  }

  if (loading && gists.length === 0) {
    return <Spinner />;
  }

  if (error && gists.length === 0) {
    return (
      <div className="p-4 bg-red-50 text-red-500 rounded-lg">
        {error}
        <button 
          onClick={refreshGists}
          className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  // get all unique file extensions
  const allFileTypes = new Set();
  Object.values(searchIndex).forEach(entry => {
    entry.fileTypes.forEach(type => allFileTypes.add(type));
  });
  const fileTypeOptions = Array.from(allFileTypes).sort();

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search gists by title, filename, or content..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full p-3 border rounded-lg pl-10 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 outline-none"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
            >
              <span>{isAdvancedSearch ? 'Simple Search' : 'Advanced Search'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-2 transform ${isAdvancedSearch ? 'rotate-180' : ''} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <button
              onClick={refreshGists}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
              title="Refresh gists"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isAdvancedSearch && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                <select
                  name="fileType"
                  value={filterOptions.fileType}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                >
                  <option value="">Any file type</option>
                  {fileTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Files</label>
                <input
                  type="number"
                  name="minFiles"
                  value={filterOptions.minFiles}
                  onChange={handleFilterChange}
                  placeholder="Min files"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Files</label>
                <input
                  type="number"
                  name="maxFiles"
                  value={filterOptions.maxFiles}
                  onChange={handleFilterChange}
                  placeholder="Max files"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={filterOptions.dateFrom}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  name="dateTo"
                  value={filterOptions.dateTo}
                  onChange={handleFilterChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full p-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sort Options */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => handleSortChange('created_at')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'created_at' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Created Date
            {sortOption === 'created_at' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('updated_at')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'updated_at' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Updated Date
            {sortOption === 'updated_at' && (
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
            Alphabetical
            {sortOption === 'description' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('files_count')} 
            className={`px-3 py-2 text-sm rounded-md transition ${
              sortOption === 'files_count' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            File Count
            {sortOption === 'files_count' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        </div>
        
        {/* Search Results Stats */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredGists.length} of {gists.length} gists
          {searchTerm && <span> matching "{searchTerm}"</span>}
        </div>
      </div>

      {/* Gists List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && gists.length > 0 && (
          <div className="py-4 text-center text-gray-500">
            <Spinner />
            <p className="mt-2">Updating gists...</p>
          </div>
        )}
        
        {currentGists.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {currentGists.map(gist => (
              <li key={gist.id}>
                <Link to={`/gist/${gist.id}`} className="block hover:bg-gray-50 transition-colors duration-150">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-indigo-600 truncate">
                        {gist.description || 'Untitled Gist'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          Object.keys(gist.files).length > 1 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {Object.keys(gist.files).length} {Object.keys(gist.files).length === 1 ? 'file' : 'files'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteClick(gist, e)}
                          className="text-sm text-red-600 hover:text-red-900 transition-colors"
                          aria-label="Delete gist"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-gray-600 italic text-sm">
                      {getGistPreview(gist)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
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
                    <p className="mt-2 text-xs text-gray-500">
                      Updated: {new Date(gist.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 px-6 text-center text-gray-500">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <p>No gists found{searchTerm ? ` matching "${searchTerm}"` : ''}.</p>
                <Link to="/gist" className="inline-block mt-4 text-indigo-600 hover:text-indigo-800">
                  Create a new gist
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => paginate(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-l-md border ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Adjust page numbers shown based on current page
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => paginate(pageNum)}
                  className={`px-4 py-2 border-t border-b ${
                    currentPage === pageNum
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  } ${i === 0 ? '' : 'border-l'}`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-r-md border ${
                currentPage === totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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