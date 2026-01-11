import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Github, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const Header = () => {
  const { user, initiateGithubLogin, error, clearError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {error && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-center gap-4">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="hover:bg-destructive-foreground/20 rounded p-1 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center space-x-2 font-semibold text-xl hover:opacity-80 transition-opacity"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Gist Manager</span>
          </Link>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium">
                    {user.name || user.login}
                  </span>
                </div>
              </div>
            ) : (
              <Button onClick={initiateGithubLogin} variant="default">
                <Github className="mr-2 h-4 w-4" />
                Login with GitHub
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
