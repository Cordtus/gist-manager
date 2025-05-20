// components/ThemeSandbox.js

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/theme.css';

const ColorSwatch = ({ name, variable, textContrast = false }) => {
  const style = {
    backgroundColor: `var(${variable})`,
    color: textContrast ? `var(--color-text-primary)` : `var(--color-primary-contrast)`,
    padding: '1rem',
    borderRadius: '0.25rem',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
  };

  return (
    <div className="flex flex-col">
      <div style={style}>
        <span>{name}</span>
      </div>
      <div className="text-xs mt-1 text-center">{variable}</div>
    </div>
  );
};

const ThemeSandbox = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="p-6 bg-white dark:bg-dark-bg-primary rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Theme Sandbox</h1>
        <button 
          onClick={toggleTheme}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Toggle Theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4 font-semibold">Primary Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorSwatch name="Primary" variable="--color-primary" />
          <ColorSwatch name="Primary Light" variable="--color-primary-light" />
          <ColorSwatch name="Primary Dark" variable="--color-primary-dark" />
          <ColorSwatch name="Primary Contrast" variable="--color-primary-contrast" textContrast={true} />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4 font-semibold">UI Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorSwatch name="Background" variable="--color-background" textContrast={true} />
          <ColorSwatch name="Surface" variable="--color-surface" textContrast={true} />
          <ColorSwatch name="Surface Variant" variable="--color-surface-variant" textContrast={true} />
          <ColorSwatch name="Border" variable="--color-border" textContrast={true} />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4 font-semibold">Typography</h2>
        <div className="mb-4">
          <h3 className="text-lg mb-2">Text Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div style={{ color: 'var(--color-text-primary)' }}>
              <p className="font-bold">Primary Text</p>
              <p>--color-text-primary</p>
            </div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              <p className="font-bold">Secondary Text</p>
              <p>--color-text-secondary</p>
            </div>
            <div style={{ color: 'var(--color-text-tertiary)' }}>
              <p className="font-bold">Tertiary Text</p>
              <p>--color-text-tertiary</p>
            </div>
            <div style={{ color: 'var(--color-text-disabled)' }}>
              <p className="font-bold">Disabled Text</p>
              <p>--color-text-disabled</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg mb-2">Font Sizes</h3>
          <p style={{ fontSize: 'var(--font-size-xs)' }}>Extra Small Text (--font-size-xs)</p>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>Small Text (--font-size-sm)</p>
          <p style={{ fontSize: 'var(--font-size-base)' }}>Base Text (--font-size-base)</p>
          <p style={{ fontSize: 'var(--font-size-lg)' }}>Large Text (--font-size-lg)</p>
          <p style={{ fontSize: 'var(--font-size-xl)' }}>Extra Large Text (--font-size-xl)</p>
          <p style={{ fontSize: 'var(--font-size-2xl)' }}>2XL Text (--font-size-2xl)</p>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4 font-semibold">Functional Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ColorSwatch name="Success" variable="--color-success" />
          <ColorSwatch name="Warning" variable="--color-warning" />
          <ColorSwatch name="Error" variable="--color-error" />
          <ColorSwatch name="Info" variable="--color-info" />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4 font-semibold">Component Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-dark-bg-secondary rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Card Component</h3>
            <p className="mb-2">This is a sample card using the theme variables.</p>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md">Sample Button</button>
          </div>
          
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-editor-bg)', color: 'var(--color-text-primary)' }}>
            <h3 className="text-lg font-semibold mb-2">Editor Component</h3>
            <p className="mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              This is a sample of the editor styling.
            </p>
            <div style={{ 
              backgroundColor: 'var(--color-inline-code-bg)', 
              color: 'var(--color-text-secondary)',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontFamily: 'var(--font-mono)',
              display: 'inline-block'
            }}>
              let sample = "code";
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl mb-4 font-semibold">Shadows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-white dark:bg-dark-bg-secondary rounded-lg" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p>Small Shadow (--shadow-sm)</p>
          </div>
          <div className="p-4 bg-white dark:bg-dark-bg-secondary rounded-lg" style={{ boxShadow: 'var(--shadow-md)' }}>
            <p>Medium Shadow (--shadow-md)</p>
          </div>
          <div className="p-4 bg-white dark:bg-dark-bg-secondary rounded-lg" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <p>Large Shadow (--shadow-lg)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSandbox;