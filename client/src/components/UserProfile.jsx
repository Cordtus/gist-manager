import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculateUserTenure } from '../utils/dateUtils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import Spinner from './common/Spinner';

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

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth || !auth.user || !auth.token) return;

      setIsLoading(true);
      try {
        setUserStats({
          publicRepos: auth.user.public_repos || 0,
          followers: auth.user.followers || 0,
          following: auth.user.following || 0,
          gistCount: auth.user.public_gists || 0,
          userSince: calculateUserTenure(auth.user.created_at)
        });
      } catch (error) {
        // Non-critical data
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [auth]);

  if (!auth) return null;

  const { user, error } = auth;

  if (error) return (
    <Card>
      <CardContent className="pt-6 text-destructive">{error}</CardContent>
    </Card>
  );

  if (!user) return null;

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-24 h-24 rounded-full ring-2 ring-border"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {(user.login || '?').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-2xl font-bold">{user.login}</h2>
              {user.name && user.name !== user.login && (
                <p className="text-muted-foreground">{user.name}</p>
              )}
              {user.bio && (
                <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>
              )}
              {user.html_url && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <a href={user.html_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    GitHub
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{userStats.publicRepos}</p>
            <p className="text-sm text-muted-foreground">Repos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{userStats.gistCount}</p>
            <p className="text-sm text-muted-foreground">Gists</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{userStats.followers}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{userStats.following}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            )}
            {user.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{user.location}</p>
              </div>
            )}
            {user.company && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{user.company}</p>
              </div>
            )}
            {userStats.userSince && (
              <div>
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="font-medium">{userStats.userSince}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};