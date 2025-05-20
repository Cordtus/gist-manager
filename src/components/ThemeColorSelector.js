// components/ThemeColorSelector.js

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ColorInput = ({ label, variable, value, onChange }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(variable, e.target.value)}
          className="w-10 h-10 mr-2"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(variable, e.target.value)}
          className="flex-1 p-2 border rounded"
        />
      </div>
    </div>
  );
};

const ThemeColorSelector = () => {
  const { theme } = useTheme();
  
  // Get initial colors from CSS variables
  const getInitialColor = (variable) => {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  };
  
  const [colors, setColors] = useState({
    '--color-primary': getInitialColor('--color-primary'),
    '--color-primary-light': getInitialColor('--color-primary-light'),
    '--color-primary-dark': getInitialColor('--color-primary-dark'),
    '--color-background': getInitialColor('--color-background'),
    '--color-surface': getInitialColor('--color-surface'),
    '--color-surface-variant': getInitialColor('--color-surface-variant'),
    '--color-border': getInitialColor('--color-border'),
    '--color-text-primary': getInitialColor('--color-text-primary'),
    '--color-text-secondary': getInitialColor('--color-text-secondary'),
  });
  
  const handleColorChange = (variable, value) => {
    setColors({
      ...colors,
      [variable]: value
    });
    
    // Update CSS variable
    document.documentElement.style.setProperty(variable, value);
  };
  
  const exportTheme = () => {
    const themeObj = {};
    Object.entries(colors).forEach(([key, value]) => {
      themeObj[key.replace('--', '')] = value;
    });
    
    const json = JSON.stringify(themeObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const importTheme = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const themeObj = JSON.parse(event.target.result);
        const newColors = { ...colors };
        
        Object.entries(themeObj).forEach(([key, value]) => {
          const cssVariable = `--${key}`;
          if (newColors[cssVariable] !== undefined) {
            newColors[cssVariable] = value;
            document.documentElement.style.setProperty(cssVariable, value);
          }
        });
        
        setColors(newColors);
      } catch (error) {
        console.error('Error importing theme:', error);
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="p-6 bg-white dark:bg-dark-bg-primary rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Theme Color Picker</h1>
      
      <div className="mb-4 flex justify-between">
        <button 
          onClick={exportTheme}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Export Theme
        </button>
        
        <label className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer">
          Import Theme
          <input 
            type="file" 
            accept=".json"
            onChange={importTheme}
            className="hidden"
          />
        </label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Primary Colors</h2>
          <ColorInput 
            label="Primary" 
            variable="--color-primary" 
            value={colors['--color-primary']} 
            onChange={handleColorChange}
          />
          <ColorInput 
            label="Primary Light" 
            variable="--color-primary-light" 
            value={colors['--color-primary-light']} 
            onChange={handleColorChange}
          />
          <ColorInput 
            label="Primary Dark" 
            variable="--color-primary-dark" 
            value={colors['--color-primary-dark']} 
            onChange={handleColorChange}
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">UI Colors</h2>
          <ColorInput 
            label="Background" 
            variable="--color-background" 
            value={colors['--color-background']} 
            onChange={handleColorChange}
          />
          <ColorInput 
            label="Surface" 
            variable="--color-surface" 
            value={colors['--color-surface']} 
            onChange={handleColorChange}
          />
          <ColorInput 
            label="Surface Variant" 
            variable="--color-surface-variant" 
            value={colors['--color-surface-variant']} 
            onChange={handleColorChange}
          />
          <ColorInput 
            label="Border" 
            variable="--color-border" 
            value={colors['--color-border']} 
            onChange={handleColorChange}
          />
        </div>
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Text Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ColorInput 
            label="Text Primary" 
            variable="--color-text-primary" 
            value={colors['--color-text-primary']} 
            onChange={handleColorChange}
          />
          <ColorInput 
            label="Text Secondary" 
            variable="--color-text-secondary" 
            value={colors['--color-text-secondary']} 
            onChange={handleColorChange}
          />
        </div>
      </div>
      
      <div className="mt-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ backgroundColor: colors['--color-background'], padding: '1rem', borderRadius: '0.5rem' }}>
            <p style={{ color: colors['--color-text-primary'] }}>Primary Text</p>
            <p style={{ color: colors['--color-text-secondary'] }}>Secondary Text</p>
            <button style={{ 
              backgroundColor: colors['--color-primary'], 
              color: '#ffffff', 
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              marginTop: '0.5rem'
            }}>
              Button
            </button>
          </div>
          
          <div style={{ 
            backgroundColor: colors['--color-surface'], 
            padding: '1rem', 
            borderRadius: '0.5rem',
            border: `1px solid ${colors['--color-border']}`
          }}>
            <h4 style={{ color: colors['--color-text-primary'], fontWeight: 'bold', marginBottom: '0.5rem' }}>Card Title</h4>
            <p style={{ color: colors['--color-text-secondary'] }}>Card content with some text.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeColorSelector;