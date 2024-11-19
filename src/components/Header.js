// Header.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, initiateGithubLogin } = useAuth(); // Access user data and auth functions

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800">Gist Manager</Link>
            </div>
          </div>

          {/* Show login/logout based on authentication status */}
          <div className="flex items-center">
            {user ? (
              /* Show user's GitHub username */
              <span className="text-sm font-medium text-gray-700 mr-4">{user.name || user.login}</span> // Display name or username
            ) : (
              /* Login button */
              <button
                onClick={initiateGithubLogin}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
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