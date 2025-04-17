// components/Header.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Header = () => {
  const { user, initiateGithubLogin } = useAuth(); // Access user data and auth functions
  const { theme, toggleTheme } = useTheme(); // Access theme context

  return (
    <header className="bg-white dark:bg-dark-bg-primary shadow-md dark:shadow-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800 dark:text-gray-100">Gist Manager</Link>
            </div>
          </div>

          {/* Actions area with theme toggle and login/user info */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle button */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-secondary" 
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* User info or login button */}
            {user ? (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name || user.login}</span>
            ) : (
              <button
                onClick={initiateGithubLogin}
                className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                Login with GitHub
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;