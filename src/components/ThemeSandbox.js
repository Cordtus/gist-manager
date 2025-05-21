// src/components/ThemeSandbox.js
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSandbox = () => {
  // Keep the theme variable to display current theme information
  const { theme, setTheme } = useTheme();
  const [primary, setPrimary] = useState('');
  const [bg, setBg] = useState('');
  const [customTheme, setCustomTheme] = useState(null);

  // Initialize color inputs with current CSS variables when component mounts
  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    setPrimary(rootStyles.getPropertyValue('--color-primary').trim() || '#3b82f6');
    setBg(rootStyles.getPropertyValue('--color-bg').trim() || '#ffffff');
  }, [theme]); // Re-initialize when theme changes

  const applyCustom = () => {
    document.documentElement.style.setProperty('--color-primary', primary);
    document.documentElement.style.setProperty('--color-bg', bg);
    setCustomTheme('custom');
  };

  const resetCustom = () => {
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-bg');
    setCustomTheme(null);
    
    // Re-initialize inputs with default theme values
    const rootStyles = getComputedStyle(document.documentElement);
    setPrimary(rootStyles.getPropertyValue('--color-primary').trim() || '#3b82f6');
    setBg(rootStyles.getPropertyValue('--color-bg').trim() || '#ffffff');
  };

  // Determine actual active theme (could be custom or one of the defaults)
  const activeTheme = customTheme || theme;

  return (
    <div className="p-6 bg-surface rounded shadow-md space-y-4">
      <h2 className="text-lg font-semibold text-primary">Theme Sandbox</h2>
      
      {/* Display current theme info */}
      <div className="p-3 bg-surface-secondary rounded text-secondary">
        <span className="font-medium">Current Theme: </span>
        <span className="px-2 py-1 ml-2 rounded bg-primary text-white text-sm font-medium">
          {activeTheme}
        </span>
      </div>
      
      {/* Theme Switcher */}
      <div className="space-y-2">
        <label className="block text-secondary font-medium">Theme Selection</label>
        <div className="flex gap-3">
          <button
            onClick={() => { setTheme('light'); setCustomTheme(null); }}
            className={`button ${activeTheme === 'light' ? 'primary' : 'secondary'}`}
          >
            Light
          </button>
          <button
            onClick={() => { setTheme('dark'); setCustomTheme(null); }}
            className={`button ${activeTheme === 'dark' ? 'primary' : 'secondary'}`}
          >
            Dark
          </button>
          {customTheme && (
            <button
              onClick={resetCustom}
              className="button danger ml-auto"
            >
              Reset Custom
            </button>
          )}
        </div>
      </div>
      
      {/* Custom Color Controls */}
      <div className="p-4 border border-default rounded">
        <h3 className="text-md font-medium mb-3 text-primary">Custom Colors</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-32">
              <label className="text-secondary text-sm">Primary Color</label>
            </div>
            <input
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="block w-10 h-8 p-0 border-none"
            />
            <input
              type="text"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="w-28 p-1 text-sm border border-default rounded"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-32">
              <label className="text-secondary text-sm">Background Color</label>
            </div>
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="block w-10 h-8 p-0 border-none"
            />
            <input
              type="text"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="w-28 p-1 text-sm border border-default rounded"
            />
          </div>
          
          <button 
            onClick={applyCustom} 
            className="button primary w-full mt-2"
          >
            Apply Custom Colors
          </button>
        </div>
      </div>
      
      {/* Theme Preview */}
      <div className="p-4 border border-default rounded">
        <h3 className="text-md font-medium mb-3 text-primary">Theme Preview</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button className="button primary">Primary Button</button>
            <button className="button secondary">Secondary Button</button>
            <button className="button danger">Danger Button</button>
          </div>
          <div className="p-3 bg-surface-secondary rounded">
            <p className="text-primary">Primary text color</p>
            <p className="text-secondary">Secondary text color</p>
            <div className="mt-2 p-2 bg-surface border border-default rounded">
              Content box with surface background
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default ThemeSandbox;