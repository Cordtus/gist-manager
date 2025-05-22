import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => (
  <nav className="w-64 bg-surface-variant shadow-lg overflow-auto">
    <div className="p-4">
      <h2 className="text-lg font-semibold text-primary mb-4">Gist Manager</h2>
      <ul className="flex flex-col gap-2">
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            📊 Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/my-gists"
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            📝 My Gists
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/gist"
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            ✏️ New Gist
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/shared"
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            🌐 Community Gists
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/convert"
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            🔄 File Converter
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            👤 Profile
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
              `block px-3 py-2 rounded transition-colors ${
                isActive 
                  ? 'bg-surface shadow-sm text-primary font-medium' 
                  : 'text-secondary hover:bg-surface hover:text-primary'
              }`
            }
          >
            🎨 Theme Sandbox
          </NavLink>
        </li>
      </ul>
    </div>
  </nav>
);

export default Sidebar;