import React           from 'react';
import { Link }        from 'react-router-dom';
import { useAuth }     from '../contexts/AuthContext';
import { useTheme }    from '../contexts/ThemeContext';

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
          className="p-2 rounded-full bg-surface-variant hover:bg-surface"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' 
            ? <span className="text-light-accent">☀️</span> 
            : <span className="text-accent">🌙</span>
          }
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