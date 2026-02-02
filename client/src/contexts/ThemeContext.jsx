import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const THEMES = ['light', 'dark', 'terminal', 'retro'];

export const ThemeProvider = ({ children }) => {
	const getInitialTheme = () => {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return 'dark';
		}

		const storedTheme = localStorage.getItem('theme');
		if (storedTheme && THEMES.includes(storedTheme)) {
			return storedTheme;
		}

		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}

		return 'dark';
	};

	const [theme, setThemeState] = useState(getInitialTheme);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const root = window.document.documentElement;

		// Remove all theme classes
		THEMES.forEach(t => root.classList.remove(t));

		// Add current theme class
		root.classList.add(theme);
		root.setAttribute('data-theme', theme);

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('theme', theme);
		}
	}, [theme]);

	const setTheme = (newTheme) => {
		if (THEMES.includes(newTheme)) {
			setThemeState(newTheme);
		}
	};

	const cycleTheme = () => {
		const currentIndex = THEMES.indexOf(theme);
		const nextIndex = (currentIndex + 1) % THEMES.length;
		setThemeState(THEMES[nextIndex]);
	};

	const toggleTheme = () => {
		// Simple toggle between light and dark for compatibility
		setThemeState(prev => prev === 'light' ? 'dark' : 'light');
	};

	return (
		<ThemeContext.Provider value={{
			theme,
			themes: THEMES,
			setTheme,
			cycleTheme,
			toggleTheme
		}}>
			{children}
		</ThemeContext.Provider>
	);
};

export default ThemeContext;
