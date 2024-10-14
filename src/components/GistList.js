import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGists } from '../services/api/gists';

const GistList = () => {
  const [gists, setGists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGists();
  }, []);

  const fetchGists = async () => {
    try {
      setLoading(true);
      const gistsData = await getGists();
      setGists(gistsData);
    } catch (error) {
      console.error('Error fetching gists:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {gists.map(gist => (
          <li key={gist.id}>
            <Link to={`/gist/${gist.id}`} className="block hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600 truncate">
                    {gist.description || 'Untitled Gist'}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {Object.keys(gist.files).length} files
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {new Date(gist.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GistList;