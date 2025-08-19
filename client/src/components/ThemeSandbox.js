// src/components/ThemeSandbox.js
import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSandbox = () => {
  const { theme, setTheme } = useTheme();
  const [customColors, setCustomColors] = useState({
    primary: '',
    primaryLight: '',
    primaryDark: '',
    background: '',
    surface: '',
    surfaceSecondary: '',
    textPrimary: '',
    textSecondary: '',
    border: '',
    success: '',
    warning: '',
    danger: ''
  });

  // Default colors for each theme
  const defaultColors = useMemo(() => ({
    light: {
      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryDark: '#2563eb',
      background: '#ffffff',
      surface: '#f9fafb',
      surfaceSecondary: '#f3f4f6',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    },
    dark: {
      primary: '#60a5fa',
      primaryLight: '#93c5fd',
      primaryDark: '#3b82f6',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceSecondary: '#334155',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#475569',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171'
    }
  }), []);

  // Initialize color inputs with current CSS variables when component mounts or theme changes
  useEffect(() => {
    const rootStyles = getComputedStyle(document.documentElement);
    setCustomColors({
      primary: rootStyles.getPropertyValue('--color-primary').trim() || defaultColors[theme === 'custom' ? 'light' : theme].primary,
      primaryLight: rootStyles.getPropertyValue('--color-primary-light').trim() || defaultColors[theme === 'custom' ? 'light' : theme].primaryLight,
      primaryDark: rootStyles.getPropertyValue('--color-primary-dark').trim() || defaultColors[theme === 'custom' ? 'light' : theme].primaryDark,
      background: rootStyles.getPropertyValue('--color-bg').trim() || defaultColors[theme === 'custom' ? 'light' : theme].background,
      surface: rootStyles.getPropertyValue('--color-surface').trim() || defaultColors[theme === 'custom' ? 'light' : theme].surface,
      surfaceSecondary: rootStyles.getPropertyValue('--color-surface-secondary').trim() || defaultColors[theme === 'custom' ? 'light' : theme].surfaceSecondary,
      textPrimary: rootStyles.getPropertyValue('--color-text-primary').trim() || defaultColors[theme === 'custom' ? 'light' : theme].textPrimary,
      textSecondary: rootStyles.getPropertyValue('--color-text-secondary').trim() || defaultColors[theme === 'custom' ? 'light' : theme].textSecondary,
      border: rootStyles.getPropertyValue('--color-border').trim() || defaultColors[theme === 'custom' ? 'light' : theme].border,
      success: rootStyles.getPropertyValue('--color-success').trim() || defaultColors[theme === 'custom' ? 'light' : theme].success,
      warning: rootStyles.getPropertyValue('--color-warning').trim() || defaultColors[theme === 'custom' ? 'light' : theme].warning,
      danger: rootStyles.getPropertyValue('--color-danger').trim() || defaultColors[theme === 'custom' ? 'light' : theme].danger
    });
  }, [theme, defaultColors]);

  const applyColors = () => {
    // Apply colors to CSS variables - this modifies the current theme
    Object.entries(customColors).forEach(([key, value]) => {
      const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      document.documentElement.style.setProperty(cssVar, value);
    });
    
    // If we're not already on custom theme, switch to it
    if (theme !== 'custom') {
      // Store the custom colors in localStorage
      localStorage.setItem('customThemeColors', JSON.stringify(customColors));
      setTheme('custom');
    } else {
      // Update stored custom colors
      localStorage.setItem('customThemeColors', JSON.stringify(customColors));
    }
  };

  const resetCurrentTheme = () => {
    const targetTheme = theme === 'custom' ? 'light' : theme;
    const defaults = defaultColors[targetTheme];
    
    // Reset all CSS variables to defaults for the current theme
    Object.entries(defaults).forEach(([key, value]) => {
      const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      document.documentElement.style.setProperty(cssVar, value);
    });
    
    // Update the state with default values
    setCustomColors(defaults);
    
    // Clear custom theme from localStorage if we're on custom
    if (theme === 'custom') {
      localStorage.removeItem('customThemeColors');
      setTheme('light'); // Reset custom to light theme
    }
  };

  const switchTheme = (newTheme) => {
    if (newTheme === 'custom') {
      // Load custom colors from localStorage if available
      const storedColors = localStorage.getItem('customThemeColors');
      if (storedColors) {
        const colors = JSON.parse(storedColors);
        setCustomColors(colors);
        // Apply the stored custom colors
        Object.entries(colors).forEach(([key, value]) => {
          const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          document.documentElement.style.setProperty(cssVar, value);
        });
      } else {
        // No custom theme saved, start with light theme as base
        setCustomColors(defaultColors.light);
      }
    } else {
      // Clear any custom CSS variable overrides when switching to preset themes
      Object.keys(defaultColors.light).forEach(key => {
        const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        document.documentElement.style.removeProperty(cssVar);
      });
    }
    setTheme(newTheme);
  };

  const updateColor = (key, value) => {
    setCustomColors(prev => ({ ...prev, [key]: value }));
  };

  const colorGroups = [
    {
      title: 'Primary Colors',
      description: 'Main brand colors used for buttons, links, and highlights',
      colors: [
        { key: 'primary', label: 'Primary', example: 'Buttons, links, icons' },
        { key: 'primaryLight', label: 'Primary Light', example: 'Hover states, highlights' },
        { key: 'primaryDark', label: 'Primary Dark', example: 'Active states, shadows' }
      ]
    },
    {
      title: 'Background & Surface',
      description: 'Page backgrounds and card surfaces',
      colors: [
        { key: 'background', label: 'Page Background', example: 'Main page background' },
        { key: 'surface', label: 'Card Surface', example: 'Cards, modals, dropdowns' },
        { key: 'surfaceSecondary', label: 'Secondary Surface', example: 'Nested cards, code blocks' }
      ]
    },
    {
      title: 'Text Colors',
      description: 'Text hierarchy and readability',
      colors: [
        { key: 'textPrimary', label: 'Primary Text', example: 'Headings, important text' },
        { key: 'textSecondary', label: 'Secondary Text', example: 'Descriptions, labels' }
      ]
    },
    {
      title: 'UI Elements',
      description: 'Borders and status colors',
      colors: [
        { key: 'border', label: 'Borders', example: 'Dividers, input borders' },
        { key: 'success', label: 'Success', example: 'Success messages, checkmarks' },
        { key: 'warning', label: 'Warning', example: 'Warning alerts, caution icons' },
        { key: 'danger', label: 'Danger/Error', example: 'Error messages, delete buttons' }
      ]
    }
  ];

  return (
    <div className="p-6 bg-surface rounded shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-primary">Theme Customization</h2>
      
      {/* Current Theme Display */}
      <div className="p-4 bg-surface-secondary rounded">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-secondary">Current Theme: </span>
            <span className="px-3 py-1 ml-2 rounded bg-primary text-white text-sm font-medium">
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </span>
          </div>
          <button
            onClick={resetCurrentTheme}
            className="button danger"
            title={theme === 'custom' ? 'Reset to light theme' : `Reset ${theme} theme to defaults`}
          >
            Reset {theme === 'custom' ? 'to Light' : 'Theme'}
          </button>
        </div>
      </div>
      
      {/* Theme Switcher */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-primary">Select Theme</h3>
        <div className="flex gap-3">
          <button
            onClick={() => switchTheme('light')}
            className={`button ${theme === 'light' ? 'primary' : 'secondary'}`}
          >
            ☀️ Light
          </button>
          <button
            onClick={() => switchTheme('dark')}
            className={`button ${theme === 'dark' ? 'primary' : 'secondary'}`}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => switchTheme('custom')}
            className={`button ${theme === 'custom' ? 'primary' : 'secondary'}`}
          >
            🎨 Custom
          </button>
        </div>
      </div>
      
      {/* Theme Editor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            {theme === 'custom' ? 'Custom Theme Editor' : `Edit ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
          </h3>
          <p className="text-sm text-secondary">
            {theme === 'custom' 
              ? 'Customize your unique theme' 
              : `Temporarily modify the ${theme} theme (changes won't persist)`}
          </p>
        </div>
        
        {colorGroups.map(group => (
          <div key={group.title} className="p-4 border border-default rounded">
            <h4 className="text-md font-semibold mb-1 text-primary">{group.title}</h4>
            <p className="text-sm text-secondary mb-4">{group.description}</p>
            
            <div className="space-y-3">
              {group.colors.map(({ key, label, example }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-primary">{label}</label>
                    <p className="text-xs text-secondary">{example}</p>
                  </div>
                  <input
                    type="color"
                    value={customColors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="w-12 h-10 p-0 border-2 border-default rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customColors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="w-28 px-2 py-1 text-sm border border-default rounded font-mono"
                    placeholder="#000000"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button 
          onClick={applyColors} 
          className="button primary w-full"
        >
          {theme === 'custom' ? 'Update Custom Theme' : 'Save as Custom Theme'}
        </button>
      </div>
      
      {/* Live Preview */}
      <div className="p-4 border border-default rounded">
        <h3 className="text-lg font-semibold mb-4 text-primary">Live Preview</h3>
        <div className="space-y-4">
          {/* Button Examples */}
          <div>
            <p className="text-sm text-secondary mb-2">Buttons</p>
            <div className="flex gap-2 flex-wrap">
              <button className="button primary">Primary Button</button>
              <button className="button secondary">Secondary</button>
              <button className="button danger">Danger</button>
              <button className="button success">Success</button>
              <button className="button warning">Warning</button>
            </div>
          </div>
          
          {/* Card Example */}
          <div>
            <p className="text-sm text-secondary mb-2">Card & Surface</p>
            <div className="card p-4">
              <h4 className="text-lg font-semibold text-primary mb-2">Sample Card</h4>
              <p className="text-secondary mb-3">This is secondary text in a card component.</p>
              <div className="p-3 bg-surface-secondary rounded">
                <p className="text-sm">Nested surface with content</p>
              </div>
            </div>
          </div>
          
          {/* Alerts Example */}
          <div>
            <p className="text-sm text-secondary mb-2">Alerts & Messages</p>
            <div className="space-y-2">
              <div className="alert success">✓ Success message example</div>
              <div className="alert warning">⚠ Warning message example</div>
              <div className="alert danger">✕ Error message example</div>
            </div>
          </div>
          
          {/* Form Elements */}
          <div>
            <p className="text-sm text-secondary mb-2">Form Elements</p>
            <div className="space-y-2">
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-default rounded focus:border-primary" 
                placeholder="Text input example"
              />
              <select className="w-full px-3 py-2 border border-default rounded">
                <option>Select dropdown example</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSandbox;