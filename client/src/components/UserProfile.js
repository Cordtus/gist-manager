// components/UserProfile.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserProfile = () => {
  const auth = useAuth();
  const [userStats, setUserStats] = useState({
    publicRepos: 0,
    followers: 0,
    following: 0,
    gistCount: 0,
    userSince: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch additional user data from GitHub API
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth || !auth.user || !auth.token) return;
      
      setIsLoading(true);
      try {
        const createdAt = new Date(auth.user.created_at);
        const now = new Date();
        const yearDiff = now.getFullYear() - createdAt.getFullYear();
        
        let userSince;
        if (yearDiff > 0) {
          userSince = `${yearDiff} ${yearDiff === 1 ? 'year' : 'years'}`;
        } else {
          const monthDiff = now.getMonth() - createdAt.getMonth() + 
            (now.getFullYear() - createdAt.getFullYear()) * 12;
          userSince = `${monthDiff} ${monthDiff === 1 ? 'month' : 'months'}`;
        }
        
        // generate stats from available user data
        setUserStats({
          publicRepos: auth.user.public_repos || 0,
          followers: auth.user.followers || 0,
          following: auth.user.following || 0,
          gistCount: auth.user.public_gists || 0,
          userSince
        });
      } catch (error) {
        console.error('Error fetching additional user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [auth]);
  
  // Return early if auth is undefined
  if (!auth) return null;
  
  const { user, error } = auth;
  
  if (error) return (
    <div className="alert danger">
      <p className="font-bold">Error</p>
      <p>{error}</p>
    </div>
  );
  
  if (!user) return null;

  return (
    <div className="card overflow-hidden">
      {isLoading && (
        <div className="p-4 bg-surface-secondary text-center text-secondary">
          Loading user profile data...
        </div>
      )}
      <div className="md:flex">
        {/* Profile Image Column */}
        <div className="md:w-1/3 bg-surface-secondary p-6 flex flex-col items-center justify-center">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={`${user.login}'s avatar`}
              className="w-32 h-32 rounded-full border-4 border-default shadow-md"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold">
              {(user.login || '?').charAt(0).toUpperCase()}
            </div>
          )}
          
          <h2 className="mt-4 text-xl font-bold text-primary">{user.login}</h2>
          
          {user.name && user.name !== user.login && (
            <p className="text-secondary">{user.name}</p>
          )}
          
          {user.bio && (
            <p className="mt-2 text-center text-secondary text-sm">{user.bio}</p>
          )}
          
          {user.html_url && (
            <a 
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View GitHub Profile
            </a>
          )}
        </div>
        
        {/* User Details Column */}
        <div className="md:w-2/3 p-6">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Profile Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Username</p>
              <p className="font-medium">{user.login || 'Not available'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{user.name || 'Not provided'}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user.email || 'Not provided'}</p>
            </div>
            
            {user.location && (
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">{user.location}</p>
              </div>
            )}
            
            {user.company && (
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-medium">{user.company}</p>
              </div>
            )}
            
            {userStats.userSince && (
              <div>
                <p className="text-sm text-gray-600">GitHub User Since</p>
                <p className="font-medium">{userStats.userSince}</p>
              </div>
            )}
          </div>
          
          {/* Stats Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">GitHub Stats</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{userStats.publicRepos}</p>
                <p className="text-sm text-gray-600">Repositories</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{userStats.gistCount}</p>
                <p className="text-sm text-gray-600">Public Gists</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{userStats.followers}</p>
                <p className="text-sm text-gray-600">Followers</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{userStats.following}</p>
                <p className="text-sm text-gray-600">Following</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};