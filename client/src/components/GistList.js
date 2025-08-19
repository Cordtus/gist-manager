// GistList.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getGists, deleteGist, updateGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';
import Spinner from './common/Spinner';
import { generateGistPreview } from '../utils/describeGist';
import { logError } from '../utils/logger';
import { FiFileText, FiPlus, FiSearch, FiFilter } from 'react-icons/fi';

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
  const [editingGist, setEditingGist] = useState(null);
  const [editingDescription, setEditingDescription] = useState('');
  const hasDataFetchedRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const [filterOptions, setFilterOptions] = useState({
    fileType: '',
    minFiles: '',
    maxFiles: '',
    dateFrom: '',
    dateTo: ''
  });
  const { user, token } = useAuth();

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

// Fetch gists from API with progressive loading
const fetchGists = useCallback(async () => {
  if (hasDataFetchedRef.current) {
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const gistsData = await getGists(token, setError, user?.id);
    if (Array.isArray(gistsData)) {
      // Set gists immediately so they appear as they load
      setGists(gistsData);
      buildSearchIndex(gistsData);
      // Apply initial sort without filters
      applyFiltersAndSort(gistsData, '', {}, 'updated_at', 'desc');
    }
  } catch (error) {
    logError('Error fetching gists', error);
    setError('Failed to fetch gists.');
  } finally {
    // Always set this, so it won't fetch again
    hasDataFetchedRef.current = true;
    setLoading(false);
  }
}, [
  token,
  user,
  buildSearchIndex,
  applyFiltersAndSort
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
        await deleteGist(gistToDelete.id, token, setError, user?.id);
        setGists(gists.filter(g => g.id !== gistToDelete.id));
        setFilteredGists(filteredGists.filter(g => g.id !== gistToDelete.id));
      } catch (error) {
        logError('Error deleting gist', error);
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

  // Handle inline editing
  const handleEditDescription = (gist, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingGist(gist.id);
    setEditingDescription(gist.description || '');
  };

  const handleSaveDescription = async (gist, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const updatedGist = { ...gist, description: editingDescription };
      await updateGist(gist.id, updatedGist, token, setError, user?.id);
      
      // Update local state
      setGists(prevGists => 
        prevGists.map(g => g.id === gist.id ? { ...g, description: editingDescription } : g)
      );
      setFilteredGists(prevGists => 
        prevGists.map(g => g.id === gist.id ? { ...g, description: editingDescription } : g)
      );
      
      setEditingGist(null);
      setEditingDescription('');
    } catch (error) {
      logError('Error updating description', error);
      setError('Failed to update description. Please try again.');
    }
  };

  const handleCancelEdit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingGist(null);
    setEditingDescription('');
  };

  const handleKeyPress = (e, gist) => {
    if (e.key === 'Enter') {
      handleSaveDescription(gist, e);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
  };

  // Pagination
  const indexOfLastGist = currentPage * gistsPerPage;
  const indexOfFirstGist = indexOfLastGist - gistsPerPage;
  const currentGists = filteredGists.slice(indexOfFirstGist, indexOfLastGist);
  const totalPages = Math.ceil(filteredGists.length / gistsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!user) {
    return <div className="card p-6">Please log in to view your gists.</div>;
  }

  if (loading && gists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner />
        <p className="mt-4 text-secondary">Loading your gists...</p>
      </div>
    );
  }

  if (error && gists.length === 0) {
    return (
      <div className="alert danger">
        {error}
        <button 
          onClick={refreshGists}
          className="ml-4 button danger small"
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
      <div className="card p-6">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search gists by title, filename, or content..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full p-3 border border-default rounded-lg pl-10 focus:ring-2 focus:ring-primary outline-none"
              />
              <FiSearch className="h-5 w-5 absolute left-3 top-3.5 text-muted" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
              className="btn btn-secondary"
            >
              <FiFilter className="h-5 w-5" />
              <span>{isAdvancedSearch ? 'Hide Filters' : 'Show Filters'}</span>
            </button>
            
            <button
              onClick={refreshGists}
              className="btn btn-ghost"
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
          <div className="bg-surface-secondary p-4 rounded-lg mb-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">File Type</label>
                <select
                  name="fileType"
                  value={filterOptions.fileType}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-default rounded focus:ring-2 focus:ring-primary"
                >
                  <option value="">Any file type</option>
                  {fileTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Min Files</label>
                <input
                  type="number"
                  name="minFiles"
                  value={filterOptions.minFiles}
                  onChange={handleFilterChange}
                  placeholder="Min files"
                  className="w-full p-2 border border-default rounded focus:ring-2 focus:ring-primary"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Max Files</label>
                <input
                  type="number"
                  name="maxFiles"
                  value={filterOptions.maxFiles}
                  onChange={handleFilterChange}
                  placeholder="Max files"
                  className="w-full p-2 border border-default rounded focus:ring-2 focus:ring-primary"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">From Date</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={filterOptions.dateFrom}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-default rounded focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">To Date</label>
                <input
                  type="date"
                  name="dateTo"
                  value={filterOptions.dateTo}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-default rounded focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full p-2 button secondary text-sm"
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
            className={`btn ${sortOption === 'created_at' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            Created Date
            {sortOption === 'created_at' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('updated_at')} 
            className={`btn ${sortOption === 'updated_at' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            Updated Date
            {sortOption === 'updated_at' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('description')} 
            className={`btn ${sortOption === 'description' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            Alphabetical
            {sortOption === 'description' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          
          <button 
            onClick={() => handleSortChange('files_count')} 
            className={`btn ${sortOption === 'files_count' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          >
            File Count
            {sortOption === 'files_count' && (
              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        </div>
        
        {/* Search Results Stats */}
        <div className="mt-4 text-sm text-secondary">
          Showing {filteredGists.length} of {gists.length} gists
          {searchTerm && <span> matching "{searchTerm}"</span>}
        </div>
      </div>

{/* Gists List */}
      <div className="card overflow-hidden p-6">
        {loading && (
          <div className="py-4 text-center text-secondary animate-pulse">
            <div className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading gists...</span>
            </div>
          </div>
        )}
        
        {currentGists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentGists.map(gist => {
              const preview = generateGistPreview(gist, 120);
              const isEditing = editingGist === gist.id;
              
              return (
                <div key={gist.id} className="card overflow-hidden hover:shadow-lg transition-all duration-300 border border-default card-hover fade-in">
                  <div className="p-4 flex flex-col h-full">
                    {/* Header with badges and primary language */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${gist.public ? 'success' : 'secondary'}`}>
                          {gist.public ? 'Public' : 'Private'}
                        </span>
                        <span className={`badge ${preview.fileCount > 1 ? 'primary' : 'accent'}`}>
                          {preview.fileCount} {preview.fileCount === 1 ? 'file' : 'files'}
                        </span>
                      </div>
                      <span className="badge primary">
                        {preview.primaryLanguage}
                      </span>
                    </div>
                    
                    {/* Gist title/description - with inline editing */}
                    <div className="mb-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, gist)}
                            onBlur={() => handleSaveDescription(gist)}
                            className="w-full px-2 py-1 text-sm border border-default rounded focus:ring-2 focus:ring-primary"
                            placeholder="Enter a description..."
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleSaveDescription(gist, e)}
                              className="button success small"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="button secondary small"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex items-start justify-between">
                          <Link to={`/gist/${gist.id}`} className="flex-1">
                            <h3 className="text-lg font-medium text-primary hover:text-primary-dark transition-colors">
                              {gist.description || preview.generatedTitle || 'Untitled Gist'}
                              {!preview.hasDescription && preview.generatedTitle && (
                                <span className="text-xs text-muted ml-2">(auto-generated)</span>
                              )}
                            </h3>
                          </Link>
                          <button
                            onClick={(e) => handleEditDescription(gist, e)}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                            title="Edit description"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced preview */}
                    <Link to={`/gist/${gist.id}`} className="flex-1 block">
                      <div className="mb-3">
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                          {preview.preview}
                        </p>
                      </div>
                      
                      {/* File type indicators with icons */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {preview.fileTypes.slice(0, 4).map((fileType, index) => {
                          const filename = Object.keys(gist.files)[index];
                          return (
                            <span key={filename} className="inline-flex items-center text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded dark:text-gray-300">
                              <span className="mr-1">{fileType.icon}</span>
                              {filename}
                            </span>
                          );
                        })}
                        {preview.fileCount > 4 && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded dark:text-gray-300">
                            +{preview.fileCount - 4} more
                          </span>
                        )}
                      </div>
                    </Link>
                    
                    {/* Footer with date and actions */}
                    <div className="mt-auto flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Updated: {new Date(gist.updated_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleEditDescription(gist, e)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                          title="Edit description"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(gist, e)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          aria-label="Delete gist"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-6 text-center fade-in">
            {loading ? (
              <Spinner />
            ) : (
              <div className="max-w-sm mx-auto">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiFileText className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchTerm ? 'No matches found' : 'No gists yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm ? `No gists found matching "${searchTerm}"` : 'Get started by creating your first gist'}
                </p>
                <Link 
                  to="/gist" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 no-underline"
                >
                  <FiPlus className="w-4 h-4" />
                  Create new gist
                </Link>
              </div>
            )}
          </div>
        )}

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
  </div>
  );
};

export default GistList;