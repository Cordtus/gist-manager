// Custom hook for managing API call states
import { useState, useCallback } from 'react';
import { logError } from '../utils/logger';

/**
 * Custom hook for managing API calls with loading, error, and data states
 * @param {Function} apiFunction - The API function to call
 * @returns {Object} - { data, loading, error, execute, reset }
 */
export const useApiCall = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      logError('API call failed', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

/**
 * Custom hook for managing paginated API calls
 * @param {Function} apiFunction - The API function to call
 * @param {number} initialPage - Initial page number
 * @returns {Object} - Extended API call state with pagination
 */
export const usePaginatedApiCall = (apiFunction, initialPage = 1) => {
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState([]);
  
  const { loading, error, execute, reset } = useApiCall(apiFunction);

  const fetchPage = useCallback(async (pageNum = page) => {
    const result = await execute(pageNum);
    if (result) {
      setItems(prev => pageNum === 1 ? result.items : [...prev, ...result.items]);
      setHasMore(result.hasMore || false);
      setPage(pageNum);
    }
    return result;
  }, [execute, page]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return fetchPage(page + 1);
    }
  }, [loading, hasMore, page, fetchPage]);

  const refresh = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    reset();
    return fetchPage(1);
  }, [fetchPage, reset]);

  return {
    items,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refresh
  };
};