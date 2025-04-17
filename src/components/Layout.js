// components/Layout.js
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useTheme } from '../contexts/ThemeContext';

const Layout = ({ children }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-dark-bg-primary transition-colors duration-200 ${theme}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="bg-gray-200 dark:bg-dark-bg-secondary p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;