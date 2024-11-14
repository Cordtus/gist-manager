import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-800">Gist Manager</Link>
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <>
                <span className="text-sm font-medium text-gray-700 mr-4">Welcome, {user.login}!</span>
                <button onClick={logout} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  Logout
                </button>
              </>
            ) : (
                <a
                  href={`https://github.com/login/oauth/authorize?client_id=${process.env.REACT_APP_GITHUB_CLIENT_ID}&scope=gist`}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Login with GitHub
                </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;