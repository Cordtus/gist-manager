// src/components/Sidebar.js

import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaListAlt, FaPlus, FaExchangeAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext.js';
import '../styles/styles.css';

const Sidebar = () => {
  const { user, logout, initiateGithubLogin } = useAuth();

  return (
    <div className="sidebar-container">
      <nav>
        <Link to="/" className="sidebar-link">
          <FaHome className="inline-block mr-2" /> Dashboard
        </Link>
        <Link to="/gists" className="sidebar-link">
          <FaListAlt className="inline-block mr-2" /> My Gists
        </Link>
        <Link to="/gist" className="sidebar-link">
          <FaPlus className="inline-block mr-2" /> New Gist
        </Link>
        <Link to="/convert" className="sidebar-link">
          <FaExchangeAlt className="inline-block mr-2" /> File Converter
        </Link>
      </nav>
      <div className="sidebar-footer">
        {user ? (
          <>
            <p>Logged in as {user.login}</p>
            <button onClick={logout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={initiateGithubLogin}
            className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
          >
            Login with GitHub
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
