import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import { getGists } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './common/Spinner';
import { generateGistPreview } from '../utils/describeGist';
import { logError } from '../utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-2">gist.md</h1>
          <p className="text-muted-foreground mb-8">
            Manage your GitHub Gists
          </p>
          <Button onClick={initiateGithubLogin} size="lg">
            <Github className="mr-2 h-5 w-5" />
            Connect with GitHub
          </Button>
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
      {/* Stats */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Gists</span>
          <span className="ml-2 font-mono font-bold">{metrics.totalGists}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Files</span>
          <span className="ml-2 font-mono font-bold">{metrics.totalFiles}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Avg</span>
          <span className="ml-2 font-mono font-bold">{metrics.avgFilesPerGist}</span>
        </div>
        {metrics.mostRecentUpdate && (
          <div>
            <span className="text-muted-foreground">Updated</span>
            <span className="ml-2 font-mono">{metrics.mostRecentUpdate.toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* File Types */}
      {topFileTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topFileTypes.map(([type, count]) => (
            <Badge key={type} variant="secondary">
              .{type} ({count})
            </Badge>
          ))}
        </div>
      )}

      {/* Recent Gists */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Gists</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(gists) && gists.length > 0 ? (
            <div className="divide-y divide-border">
              {gists.map((gist) => {
                const preview = generateGistPreview(gist);
                return (
                  <Link
                    key={gist.id}
                      to={`/gist/${gist.id}`}
                      className="block group hover:bg-accent/50 -mx-4 px-4 py-3 transition-colors"
                    >
                      <p className="font-medium group-hover:text-primary transition-colors truncate">
                        {gist.description || preview.generatedTitle || 'Untitled'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {preview.preview}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{Object.keys(gist.files).length} {Object.keys(gist.files).length === 1 ? 'file' : 'files'}</span>
                        <span>&middot;</span>
                        <span>{new Date(gist.updated_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No gists yet</p>
              <Button asChild>
                <Link to="/gist">Create one</Link>
              </Button>
            </div>
          )}

          {gists.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button asChild variant="ghost" size="sm">
                <Link to="/gists">View all</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
