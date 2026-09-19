import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const THEMES = ['light', 'dark', 'terminal', 'retro', 'retro-dark', 'winmx'];
const DARK_MODE_THEMES = new Set(['dark', 'retro-dark', 'winmx']);

export const ThemeProvider = ({ children }) => {
	const getInitialTheme = () => {
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return 'dark';
		}

		const storedTheme = localStorage.getItem('theme');
		return storedTheme && THEMES.includes(storedTheme) ? storedTheme : 'dark';
	};

	const [theme, setThemeState] = useState(getInitialTheme);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const root = window.document.documentElement;

		// Remove all theme classes
		THEMES.forEach((t) => root.classList.remove(t));

		// Add current theme class. Dark variants also opt into Tailwind's .dark utilities.
		if (DARK_MODE_THEMES.has(theme) && theme !== 'dark') {
			root.classList.add('dark');
		}
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

	return (
		<ThemeContext.Provider value={{ theme, themes: THEMES, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};
