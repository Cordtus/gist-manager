import React from 'react';
import { NavLink } from 'react-router-dom';

// SVG Icon Components
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const GistIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const NewGistIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const CommunityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const ConvertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const ProfileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ThemeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
  </svg>
);

const Sidebar = () => (
  <nav className="w-64 bg-surface-variant shadow-lg overflow-auto">
    <div className="p-4">
      <h2 className="text-lg font-semibold text-primary mb-4">Gist Manager</h2>
      <ul className="flex flex-col gap-2">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <DashboardIcon />
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/my-gists"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <GistIcon />
            My Gists
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/gist"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <NewGistIcon />
            New Gist
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/shared"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <CommunityIcon />
            Community Gists
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/convert"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <ConvertIcon />
            File Converter
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <ProfileIcon />
            Profile
          </NavLink>
        </li>
        
        {/* Development Tools */}
        <li className="pt-4 mt-4 border-t border-default">
          <span className="text-xs text-secondary font-medium px-3 py-1">Development</span>
        </li>
        <li>
          <NavLink
            to="/theme-sandbox"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            <ThemeIcon />
            Theme Sandbox
          </NavLink>
        </li>
      </ul>
    </div>
  </nav>
);

export default Sidebar;