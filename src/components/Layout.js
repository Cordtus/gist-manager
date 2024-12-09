// Layout.js

import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

// DebugRouter Component (kept local to Layout)
const DebugRouter = () => {
  const location = useLocation();
  console.log('Current route:', location.pathname); // Logs the current route
  return null; // No UI rendering
};

const Layout = ({ children }) => {
  console.log('Rendering Layout');
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Debug Router */}
        <DebugRouter />

        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="main-container">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
