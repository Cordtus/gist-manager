// DeleteGist.js
// Handles deleting a single gist with confirmation modal.

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGist, deleteGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';

const DeleteGist = () => {
  const [gist, setGist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchGist = useCallback(async () => {
    try {
      const gistData = await getGist(id);
      setGist(gistData);
    } catch (error) {
      console.error('Error fetching gist:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      fetchGist();
    }
  }, [user, id, fetchGist]);

  const handleDelete = () => {
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteGist(id);
      navigate('/gists');
    } catch (error) {
      console.error('Error deleting gist:', error);
      setDeleting(false);
    }
    setIsConfirmOpen(false);
  };

  if (!user) {
    return <div className="text-center text-gray-700">Please log in to delete gists.</div>;
  }

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!gist) {
    return <div className="text-center text-gray-700">Gist not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Delete Gist</h2>
      <div className="mb-4">
        <div className="bg-gray-100 p-4 rounded shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">
            {gist.description || 'Untitled Gist'}
          </h3>
          <p className="text-sm text-gray-500">
            Created: {new Date(gist.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => navigate('/gists')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 text-white rounded shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
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

export default DeleteGist;
