// components/Sidebar.js

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaListAlt, FaPlus, FaExchangeAlt, FaUsers, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = () => {
  const { user, logout, initiateGithubLogin } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  // Helper function to determine active link
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="bg-gray-800 dark:bg-gray-900 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <div className="px-4">
        <h2 className="text-xl font-bold">Gist Manager</h2>
      </div>
      
      <nav className="space-y-1">
        <Link 
          to="/" 
          className={`block py-2.5 px-4 rounded transition duration-200 ${
            isActive('/') 
              ? 'bg-gray-700 dark:bg-gray-800 text-white' 
              : 'hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'
          }`}
        >
          <FaHome className="inline-block mr-2" /> Dashboard
        </Link>
        
        <Link 
          to="/gists" 
          className={`block py-2.5 px-4 rounded transition duration-200 ${
            isActive('/gists') 
              ? 'bg-gray-700 dark:bg-gray-800 text-white' 
              : 'hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'
          }`}
        >
          <FaListAlt className="inline-block mr-2" /> My Gists
        </Link>
        
        <Link 
          to="/gist" 
          className={`block py-2.5 px-4 rounded transition duration-200 ${
            location.pathname === '/gist' 
              ? 'bg-gray-700 dark:bg-gray-800 text-white' 
              : 'hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'
          }`}
        >
          <FaPlus className="inline-block mr-2" /> New Gist
        </Link>
        
        <Link 
          to="/convert" 
          className={`block py-2.5 px-4 rounded transition duration-200 ${
            isActive('/convert') 
              ? 'bg-gray-700 dark:bg-gray-800 text-white' 
              : 'hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'
          }`}
        >
          <FaExchangeAlt className="inline-block mr-2" /> File Converter
        </Link>
        
        <Link 
          to="/shared" 
          className={`block py-2.5 px-4 rounded transition duration-200 ${
            isActive('/shared') 
              ? 'bg-gray-700 dark:bg-gray-800 text-white' 
              : 'hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'
          }`}
        >
          <FaUsers className="inline-block mr-2" /> Community Gists
        </Link>
        
        {user && (
          <Link 
            to="/profile" 
            className={`block py-2.5 px-4 rounded transition duration-200 ${
              isActive('/profile') 
                ? 'bg-gray-700 dark:bg-gray-800 text-white' 
                : 'hover:bg-gray-700 hover:text-white dark:hover:bg-gray-800'
            }`}
          >
            <FaUser className="inline-block mr-2" /> My Profile
          </Link>
        )}
      </nav>

      {/* Display login/logout section at the bottom */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gray-900 dark:bg-black text-center">
        {user ? (
          <>
            {/* Show user's GitHub username */}
            <p className="text-sm font-medium text-white mb-2">Logged in as {user.login}</p>

            {/* Logout button */}
            <button 
              onClick={logout} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 w-full transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          /* Login with GitHub button */
          <button 
            onClick={initiateGithubLogin} 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 w-full transition-colors"
          >
            Login with GitHub
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;