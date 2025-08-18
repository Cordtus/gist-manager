import React           from 'react';
import { Link }        from 'react-router-dom';
import { useAuth }     from '../contexts/AuthContext';
import { useTheme }    from '../contexts/ThemeContext';

// Theme toggle icons
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const Header = () => {
  const { user, initiateGithubLogin, error } = useAuth();
  const { theme, toggleTheme }       = useTheme();

  return (
    <>
      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-center">
          {error}
        </div>
      )}
      <header className="flex items-center justify-between px-6 h-16 bg-surface border-b border-default shadow-sm">
      <Link to="/" className="text-xl font-bold text-primary hover:text-primary-light transition-colors">
        Gist Manager
      </Link>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-surface-variant hover:bg-surface-hover transition-all duration-200 text-primary"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        {user
          ? <span className="text-primary font-medium">{user.name || user.login}</span>
          : <button
              onClick={initiateGithubLogin}
              className="button secondary"
            >
              Login with GitHub
            </button>
        }
      </div>
    </header>
    </>
  );
};

export default Header;