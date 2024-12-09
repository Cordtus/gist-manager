// Header.js
// Displays the app's header with login/logout functionality.

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, initiateGithubLogin } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* App Title */}
          <div>
            <Link to="/" className="text-xl font-bold text-gray-800">
              Gist Manager
            </Link>
          </div>

          {/* User Info or Login */}
          <div>
            {user ? (
              <span className="text-sm text-gray-700 mr-4">
                {user.name || user.login}
              </span>
            ) : (
              <button
                onClick={initiateGithubLogin}
                className="text-sm text-gray-700 hover:text-gray-900"
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
