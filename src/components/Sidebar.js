import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => (
  <nav className="w-64 bg-surface-variant shadow-lg overflow-auto">
    <ul className="flex flex-col p-4 gap-2">
      <li>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `block px-3 py-2 rounded ${isActive ? 'bg-surface shadow-sm text-accent' : 'text-secondary hover:bg-surface'}`
          }
        >Dashboard</NavLink>
      </li>
      <li>
        <NavLink
          to="/my-gists"
          className={({ isActive }) =>
            `block px-3 py-2 rounded ${isActive ? 'bg-surface shadow-sm text-accent' : 'text-secondary hover:bg-surface'}`
          }
        >My Gists</NavLink>
      </li>
      <li>
        <NavLink
          to="/shared"
          className={({ isActive }) =>
            `block px-3 py-2 rounded ${isActive ? 'bg-surface shadow-sm text-accent' : 'text-secondary hover:bg-surface'}`
          }
        >Community Gists</NavLink>
      </li>
      <li>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `block px-3 py-2 rounded ${isActive ? 'bg-surface shadow-sm text-accent' : 'text-secondary hover:bg-surface'}`
          }
        >Profile</NavLink>
      </li>
    </ul>
  </nav>
);

export default Sidebar;