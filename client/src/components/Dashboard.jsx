import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Files, TrendingUp, Calendar, Github, ArrowRight } from 'lucide-react';
import { getGists } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
import { generateGistPreview } from '../utils/describeGist';
import { logError } from '../utils/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ErrorState } from './ui/error-state';

const Dashboard = () => {
  const [gists, setGists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalGists: 0,
    totalFiles: 0,
    avgFilesPerGist: 0,
    mostRecentUpdate: null,
    fileTypes: {}
  });
  const { user, token, initiateGithubLogin } = useAuth();

  const fetchGists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const gistsData = await getGists(token, setError, user?.id);

      const totalGists = gistsData.length;
      let totalFiles = 0;
      let mostRecentUpdate = null;
      const fileTypes = {};

      gistsData.forEach(gist => {
        const filesCount = Object.keys(gist.files).length;
        totalFiles += filesCount;

        Object.values(gist.files).forEach(file => {
          const extension = file.filename.split('.').pop().toLowerCase() || 'unknown';
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        });

        const updateDate = new Date(gist.updated_at);
        if (!mostRecentUpdate || updateDate > mostRecentUpdate) {
          mostRecentUpdate = updateDate;
        }
      });

      setMetrics({
        totalGists,
        totalFiles,
        avgFilesPerGist: totalGists ? (totalFiles / totalGists).toFixed(1) : 0,
        mostRecentUpdate,
        fileTypes
      });

      setGists(gistsData.slice(0, 5));
    } catch (error) {
      logError('Error fetching gists', error);
      setError('Failed to fetch gists. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (user && token) {
      fetchGists();
    } else {
      setLoading(false);
    }
  }, [user, token, fetchGists]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-8">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">Welcome to Gist Manager</CardTitle>
            <CardDescription className="text-base mt-2">
              A modern tool to create, edit, and organize your GitHub Gists with powerful features
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={initiateGithubLogin} size="lg">
              <Github className="mr-2 h-5 w-5" />
              Connect with GitHub
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Better Editing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and edit with a live Markdown preview and syntax highlighting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Smart Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Find past work quickly with powerful search and filtering capabilities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ArrowRight className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">File Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Convert between Markdown, HTML, Plaintext, and format JSON
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Files className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Community Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Share your gists and discover content from other developers
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorState message={error} variant="card" />;
  }

  const topFileTypes = Object.entries(metrics.fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt="Profile"
                className="w-20 h-20 rounded-full ring-2 ring-border"
              />
            )}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">{user.login || 'Not available'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gists</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalGists}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Your gist collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <Files className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFiles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all gists
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Files per Gist</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgFilesPerGist}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Files per gist average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File Types & Last Updated */}
      {(topFileTypes.length > 0 || metrics.mostRecentUpdate) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topFileTypes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Top File Types</p>
                <div className="flex flex-wrap gap-2">
                  {topFileTypes.map(([type, count]) => (
                    <Badge key={type} variant="secondary">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {metrics.mostRecentUpdate && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last updated: {metrics.mostRecentUpdate.toLocaleDateString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Gists */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Gists</CardTitle>
          <CardDescription>Your 5 most recently updated gists</CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray(gists) && gists.length > 0 ? (
            <div className="space-y-3">
              {gists.map((gist, index) => {
                const preview = generateGistPreview(gist);
                return (
                  <React.Fragment key={gist.id}>
                    {index > 0 && <Separator />}
                    <Link
                      to={`/gist/${gist.id}`}
                      className="block group hover:bg-accent/50 -mx-4 px-4 py-3 rounded-md transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium group-hover:text-primary transition-colors truncate">
                            {gist.description || preview.generatedTitle || 'Untitled Gist'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {preview.preview}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {Object.keys(gist.files).length} {Object.keys(gist.files).length === 1 ? 'file' : 'files'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Updated {new Date(gist.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No gists available</p>
              <Button asChild>
                <Link to="/gist">Create your first gist</Link>
              </Button>
            </div>
          )}

          {gists.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button asChild variant="outline" className="w-full">
                <Link to="/gists">
                  View all gists
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
