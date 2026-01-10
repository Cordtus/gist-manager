// src/components/ThemeColorSelector.js
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeColorSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 bg-surface rounded shadow-md space-y-4">
      <h2 className="text-lg font-semibold text-primary">Select Theme</h2>
      <div className="flex gap-4">
        <button
          onClick={() => setTheme('light')}
          className={`button secondary ${theme === 'light' ? 'bg-primary text-surface' : ''}`}
        >
          Light
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`button secondary ${theme === 'dark' ? 'bg-primary text-surface' : ''}`}
        >
          Dark
        </button>
      </div>
    </div>
  );
};

export default ThemeColorSelector;
