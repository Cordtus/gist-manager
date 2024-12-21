// components/Header.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/styles.css';

const Header = () => {
  const { user, initiateGithubLogin } = useAuth();

  return (
    <header className="header">
      <div className="max-w-7xl mx-auto px-4 flex justify-between h-16">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold text-gray-800">Gist Manager</Link>
        </div>
        <div className="header-user">
          {user ? (
            <span>{user.name || user.login}</span>
          ) : (
            <button onClick={initiateGithubLogin}>Login with GitHub</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
