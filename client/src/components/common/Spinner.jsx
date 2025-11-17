// src/components/Spinner.js
import React from 'react';

const Spinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="h-8 w-8 border-4 border-solid border-muted border-t-primary rounded-full animate-spin" />
  </div>
);

export default Spinner;
