import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, RefreshCw, FileText, Plus, Edit2, Trash2, ArrowUpDown } from 'lucide-react';
import { getGists, deleteGist, updateGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';
import Spinner from './common/Spinner';
import { generateGistPreview } from '../utils/describeGist';
import { logError } from '../utils/logger';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ErrorState } from './ui/error-state';

const GistList = () => {
  const [gists, setGists] = useState([]);
  const [filteredGists, setFilteredGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gistToDelete, setGistToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [gistsPerPage] = useState(12);
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

  // Build search index
  const buildSearchIndex = useCallback((gistsData) => {
    if (!gistsData || !Array.isArray(gistsData)) return;

    const index = {};
    gistsData.forEach(gist => {
      index[gist.id] = {
        description: gist.description?.toLowerCase() || '',
        filenames: Object.keys(gist.files).map(name => name.toLowerCase()),
        content: [],
        fileTypes: new Set(),
        filesCount: Object.keys(gist.files).length
      };

      Object.entries(gist.files).forEach(([filename, file]) => {
        const extension = filename.includes('.')
          ? filename.split('.').pop().toLowerCase()
          : '';
        if (extension) {
          index[gist.id].fileTypes.add(extension);
        }
        if (file.content && file.content.length < 100000) {
          index[gist.id].content.push(file.content.toLowerCase());
        }
      });
    });

    setSearchIndex(index);
  }, []);

  // Apply filters and sort
  const applyFiltersAndSort = useCallback((gistsData, search, filters, sort, direction) => {
    if (!gistsData || !Array.isArray(gistsData) || !gistsData.length) {
      setFilteredGists([]);
      return;
    }

    let results = [...gistsData];

    // Search
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase().trim();
      results = results.filter(gist => {
        const indexEntry = searchIndex[gist.id];
        if (!indexEntry) return false;
        return indexEntry.description.includes(searchLower) ||
               indexEntry.filenames.some(name => name.includes(searchLower)) ||
               indexEntry.content.some(content => content.includes(searchLower));
      });
    }

    // Filters
    if (filters.fileType && filters.fileType.trim() !== '') {
      const fileType = filters.fileType.toLowerCase().trim();
      results = results.filter(gist => {
        const indexEntry = searchIndex[gist.id];
        return indexEntry && indexEntry.fileTypes.has(fileType);
      });
    }

    if (filters.minFiles && !isNaN(parseInt(filters.minFiles))) {
      results = results.filter(gist => Object.keys(gist.files).length >= parseInt(filters.minFiles));
    }

    if (filters.maxFiles && !isNaN(parseInt(filters.maxFiles))) {
      results = results.filter(gist => Object.keys(gist.files).length <= parseInt(filters.maxFiles));
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      results = results.filter(gist => new Date(gist.updated_at) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      results = results.filter(gist => new Date(gist.updated_at) <= toDate);
    }

    // Sort
    results.sort((a, b) => {
      if (sort === 'description') {
        const aVal = (a.description || '').toLowerCase();
        const bVal = (b.description || '').toLowerCase();
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (sort === 'files_count') {
        const aCount = Object.keys(a.files).length;
        const bCount = Object.keys(b.files).length;
        return direction === 'asc' ? aCount - bCount : bCount - aCount;
      } else {
        return direction === 'asc'
          ? new Date(a[sort]) - new Date(b[sort])
          : new Date(b[sort]) - new Date(a[sort]);
      }
    });

    setFilteredGists(results);
    setCurrentPage(1);
  }, [searchIndex]);

  // Fetch gists
  const fetchGists = useCallback(async () => {
    if (hasDataFetchedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const gistsData = await getGists(token, setError, user?.id);
      if (Array.isArray(gistsData)) {
        setGists(gistsData);
        buildSearchIndex(gistsData);
        applyFiltersAndSort(gistsData, '', {}, 'updated_at', 'desc');
      }
    } catch (error) {
      logError('Error fetching gists', error);
      setError('Failed to fetch gists.');
    } finally {
      hasDataFetchedRef.current = true;
      setLoading(false);
    }
  }, [token, user, buildSearchIndex, applyFiltersAndSort]);

  useEffect(() => {
    if (user && !hasDataFetchedRef.current) {
      fetchGists();
    }
  }, [user, fetchGists]);

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
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
        setError('Failed to delete gist.');
      }
    }
    setIsConfirmOpen(false);
    setGistToDelete(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterOptions({ fileType: '', minFiles: '', maxFiles: '', dateFrom: '', dateTo: '' });
    setIsAdvancedSearch(false);
    if (gists.length > 0) {
      applyFiltersAndSort(gists, '', {}, sortOption, sortDirection);
    }
  };

  const refreshGists = async () => {
    hasDataFetchedRef.current = false;
    await fetchGists();
  };

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
      setError('Failed to update description.');
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

  // Pagination
  const indexOfLastGist = currentPage * gistsPerPage;
  const indexOfFirstGist = indexOfLastGist - gistsPerPage;
  const currentGists = filteredGists.slice(indexOfFirstGist, indexOfLastGist);
  const totalPages = Math.ceil(filteredGists.length / gistsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Please log in to view your gists.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading && gists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner />
        <p className="mt-4 text-muted-foreground">Loading your gists...</p>
      </div>
    );
  }

  if (error && gists.length === 0) {
    return (
      <ErrorState message={error} variant="card" onRetry={refreshGists} />
    );
  }

  const allFileTypes = new Set();
  Object.values(searchIndex).forEach(entry => {
    entry.fileTypes.forEach(type => allFileTypes.add(type));
  });
  const fileTypeOptions = Array.from(allFileTypes).sort();

  return (
    <div className="space-y-6">
      {/* Search and Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Gists</CardTitle>
              <CardDescription>
                Manage and search through your gist collection
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAdvancedSearch(!isAdvancedSearch)} variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {isAdvancedSearch ? 'Hide' : 'Show'} Filters
              </Button>
              <Button onClick={refreshGists} variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search gists by title, filename, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {isAdvancedSearch && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <label className="text-sm font-medium mb-1 block">File Type</label>
                <select
                  name="fileType"
                  value={filterOptions.fileType}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, fileType: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Any type</option>
                  {fileTypeOptions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Min Files</label>
                <Input
                  type="number"
                  name="minFiles"
                  value={filterOptions.minFiles}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, minFiles: e.target.value }))}
                  placeholder="Min"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Files</label>
                <Input
                  type="number"
                  name="maxFiles"
                  value={filterOptions.maxFiles}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, maxFiles: e.target.value }))}
                  placeholder="Max"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">From Date</label>
                <Input
                  type="date"
                  name="dateFrom"
                  value={filterOptions.dateFrom}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Date</label>
                <Input
                  type="date"
                  name="dateTo"
                  value={filterOptions.dateTo}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={resetFilters} variant="outline" className="w-full">
                  Reset Filters
                </Button>
              </div>
            </div>
          )}

          {/* Sort Options */}
          <div className="flex flex-wrap gap-2">
            {['updated_at', 'created_at', 'description', 'files_count'].map((option) => (
              <Button
                key={option}
                onClick={() => handleSortChange(option)}
                variant={sortOption === option ? 'default' : 'outline'}
                size="sm"
              >
                {option === 'updated_at' && 'Updated'}
                {option === 'created_at' && 'Created'}
                {option === 'description' && 'Alphabetical'}
                {option === 'files_count' && 'Files'}
                {sortOption === option && (
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>

          {/* Results Stats */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredGists.length} of {gists.length} gists
            {searchTerm && <span> matching "{searchTerm}"</span>}
          </div>
        </CardContent>
      </Card>

      {/* Gists Grid */}
      {currentGists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentGists.map(gist => {
            const preview = generateGistPreview(gist, 120);
            const isEditing = editingGist === gist.id;

            return (
              <Card key={gist.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex gap-2">
                      <Badge variant={gist.public ? 'default' : 'secondary'}>
                        {gist.public ? 'Public' : 'Private'}
                      </Badge>
                      <Badge variant="outline">
                        {preview.fileCount} {preview.fileCount === 1 ? 'file' : 'files'}
                      </Badge>
                    </div>
                    <Badge variant="secondary">{preview.primaryLanguage}</Badge>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveDescription(gist, e);
                          if (e.key === 'Escape') handleCancelEdit(e);
                        }}
                        onBlur={() => handleSaveDescription(gist)}
                        placeholder="Enter description..."
                        autoFocus
                      />
                    </div>
                  ) : (
                    <Link to={`/gist/${gist.id}`}>
                      <CardTitle className="text-base hover:text-primary transition-colors line-clamp-1">
                        {gist.description || preview.generatedTitle || 'Untitled Gist'}
                      </CardTitle>
                    </Link>
                  )}
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                  <Link to={`/gist/${gist.id}`}>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {preview.preview}
                    </p>
                  </Link>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {preview.fileTypes.slice(0, 3).map((fileType, index) => {
                      const filename = Object.keys(gist.files)[index];
                      return (
                        <Badge key={filename} variant="outline" className="text-xs">
                          {fileType.icon} {filename.split('.').pop()}
                        </Badge>
                      );
                    })}
                    {preview.fileCount > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{preview.fileCount - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>

                <Separator />

                <CardFooter className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Updated {new Date(gist.updated_at).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleEditDescription(gist, e)}
                      className="h-8 px-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(gist, e)}
                      className="h-8 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? 'No matches found' : 'No gists yet'}
            </h3>
            <p className="text-muted-foreground mb-6 text-center">
              {searchTerm
                ? `No gists found matching "${searchTerm}"`
                : 'Get started by creating your first gist'}
            </p>
            <Button asChild>
              <Link to="/gist">
                <Plus className="mr-2 h-4 w-4" />
                Create new gist
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => paginate(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            variant="outline"
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
              <Button
                key={pageNum}
                onClick={() => paginate(pageNum)}
                variant={currentPage === pageNum ? 'default' : 'outline'}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
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
