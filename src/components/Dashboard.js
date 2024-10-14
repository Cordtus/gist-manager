import React from 'react';
import { Link } from 'react-router-dom';
import { FaListAlt, FaPlus, FaExchangeAlt } from 'react-icons/fa';

const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Link
        to="/gists"
        className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-gray-50"
      >
        <div className="flex items-center">
          <FaListAlt className="text-gray-500 mr-3 h-6 w-6" />
          <h3 className="text-lg font-medium text-gray-900">My Gists</h3>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          View and manage your GitHub Gists
        </div>
      </Link>
      <Link
        to="/gist"
        className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-gray-50"
      >
        <div className="flex items-center">
          <FaPlus className="text-gray-500 mr-3 h-6 w-6" />
          <h3 className="text-lg font-medium text-gray-900">New Gist</h3>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Create a new GitHub Gist
        </div>
      </Link>
      <Link
        to="/convert"
        className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-gray-50"
      >
        <div className="flex items-center">
          <FaExchangeAlt className="text-gray-500 mr-3 h-6 w-6" />
          <h3 className="text-lg font-medium text-gray-900">File Converter</h3>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Convert files to and from various formats
        </div>
      </Link>
    </div>
  );
};

export default Dashboard;