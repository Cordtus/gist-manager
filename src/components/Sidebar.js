import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaListAlt, FaPlus, FaExchangeAlt } from 'react-icons/fa';

const Sidebar = () => {
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
    </div>
  );
};

export default Sidebar;