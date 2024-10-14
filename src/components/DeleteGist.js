import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { getGist, deleteGist } from '../services/api/github';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationDialog from './ConfirmationDialog';

const DeleteGist = () => {
  const [gist, setGist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { id } = useParams();
  const history = useHistory();
  const { user } = useAuth();

  useEffect(() => {
    if (user && id) {
      fetchGist();
    }
  }, [user, id]);

  const fetchGist = async () => {
    try {
      const gistData = await getGist(id);
      setGist(gistData);
    } catch (error) {
      console.error('Error fetching gist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteGist(id);
      history.push('/gists');
    } catch (error) {
      console.error('Error deleting gist:', error);
      setDeleting(false);
    }
    setIsConfirmOpen(false);
  };

  if (!user) {
    return <div>Please log in to delete gists.</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!gist) {
    return <div>Gist not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Delete Gist</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-4">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {gist.description || 'Untitled Gist'}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Created: {new Date(gist.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => history.push('/gists')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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