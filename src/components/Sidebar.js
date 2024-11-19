// components/Sidebar.js

import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaListAlt, FaPlus, FaExchangeAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user, logout, initiateGithubLogin } = useAuth();

  return (
    <div className="bg-gray-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <nav>
        <Link to="/" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          <FaHome className="inline-block mr-2" /> Dashboard
        </Link>
        <Link to="/gists" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          <FaListAlt className="inline-block mr-2" /> My Gists
        </Link>
        <Link to="/gist" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          <FaPlus className="inline-block mr-2" /> New Gist
        </Link>
        <Link to="/convert" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 hover:text-white">
          <FaExchangeAlt className="inline-block mr-2" /> File Converter
        </Link>
      </nav>

      {/* Display login/logout section at the bottom */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gray-900 text-center">
        {user ? (
          <>
            {/* Show user's GitHub username */}
            <p className="text-sm font-medium text-white mb-2">Logged in as {user.login}</p>

            {/* Logout button */}
            <button 
              onClick={logout} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </>
        ) : (
          /* Login with GitHub button */
          <button 
            onClick={initiateGithubLogin} 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Login with GitHub
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;