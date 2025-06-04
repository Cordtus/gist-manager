// src/components/DeleteGist.js
import React from 'react';
import ConfirmationDialog from './ConfirmationDialog';

const DeleteGist = ({ gistId, onDelete, onCancel }) => (
  <ConfirmationDialog
    title="Delete Gist?"
    message="This action cannot be undone."
    onConfirm={() => onDelete(gistId)}
    onCancel={onCancel}
  />
);

export default DeleteGist;
