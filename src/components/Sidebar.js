// Sidebar.js
// Displays the app's navigation menu and login/logout functionality.

import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaListAlt, FaPlus, FaExchangeAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user, logout, initiateGithubLogin } = useAuth();

  return (
    <div className="sidebar-container bg-gray-800 text-white w-64 space-y-6 py-7 px-2 fixed inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-200 ease-in-out">
      <nav className="space-y-4">
        <Link
          to="/"
          className="block py-2.5 px-4 rounded hover:bg-gray-700 transition-all"
        >
          <FaHome className="inline-block mr-2" /> Dashboard
        </Link>
        <Link
          to="/gists"
          className="block py-2.5 px-4 rounded hover:bg-gray-700 transition-all"
        >
          <FaListAlt className="inline-block mr-2" /> My Gists
        </Link>
        <Link
          to="/gist"
          className="block py-2.5 px-4 rounded hover:bg-gray-700 transition-all"
        >
          <FaPlus className="inline-block mr-2" /> New Gist
        </Link>
        <Link
          to="/convert"
          className="block py-2.5 px-4 rounded hover:bg-gray-700 transition-all"
        >
          <FaExchangeAlt className="inline-block mr-2" /> File Converter
        </Link>
      </nav>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-gray-900 text-center">
        {user ? (
          <>
            <p className="text-sm mb-2">Logged in as {user.login}</p>
            <button
              onClick={logout}
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-sm rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={initiateGithubLogin}
            className="w-full py-2 bg-green-500 hover:bg-green-600 text-sm rounded"
          >
            Login with GitHub
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
