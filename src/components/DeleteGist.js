// components/DeleteGist.js

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
    return <div className="card card-body">Please log in to delete gists.</div>;
  }

  if (loading) {
    return <div className="card card-body">Loading...</div>;
  }

  if (!gist) {
    return <div className="card card-body">Gist not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="heading-primary">Delete Gist</h2>
      <div className="card card-body mb-4">
        <h3 className="heading-tertiary">
          {gist.description || 'Untitled Gist'}
        </h3>
        <p className="text-secondary">
          Created: {new Date(gist.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => navigate('/gists')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn btn-danger"
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