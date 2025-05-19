// components/Sidebar.js

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaListAlt, FaPlus, FaExchangeAlt, FaUsers, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const NAV_ITEMS = [
  { path: '/',        label: 'Dashboard',      icon: FaHome },
  { path: '/gists',   label: 'My Gists',        icon: FaListAlt },
  { path: '/gist',    label: 'New Gist',        icon: FaPlus },
  { path: '/convert', label: 'File Converter',  icon: FaExchangeAlt },
  { path: '/shared',  label: 'Community Gists', icon: FaUsers }
];

export default function Sidebar() {
  const { user, logout, initiateGithubLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = path =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <aside className="flex flex-col bg-gray-800 text-white w-64 h-full">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Gist Manager</h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200
              ${isActive(item.path)
                ? 'bg-gray-700'
                : 'hover:bg-gray-700'}
            `}
          >
            <item.icon className="mr-3" />
            <span>{item.label}</span>
          </Link>
        ))}
        {user && (
          <Link
            to="/profile"
            className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200
              ${isActive('/profile') ? 'bg-gray-700' : 'hover:bg-gray-700'}
            `}
          >
            <FaUser className="mr-3" />
            <span>My Profile</span>
          </Link>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>

        {user ? (
          <>
            <div className="text-sm text-center">Logged in as {user.login}</div>
            <button
              onClick={logout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={initiateGithubLogin}
            className="w-full px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg"
          >
            Login with GitHub
          </button>
        )}
      </div>
    </aside>
  );
}
