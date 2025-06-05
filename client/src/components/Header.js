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
  const { user, initiateGithubLogin } = useAuth();
  const { theme, toggleTheme }       = useTheme();

  return (
    <header className="flex items-center justify-between px-6 h-16 bg-surface shadow-md">
      <Link to="/" className="text-xl font-bold text-primary">
        Gist Manager
      </Link>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-surface-variant hover:bg-surface transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        {user
          ? <span className="text-secondary">{user.name || user.login}</span>
          : <button
              onClick={initiateGithubLogin}
              className="text-secondary hover:text-primary"
            >
              Login with GitHub
            </button>
        }
      </div>
    </header>
  );
};

export default Header;