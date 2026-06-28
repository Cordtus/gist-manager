import { useTheme } from '../contexts/ThemeContext';

const themeLabels = {
	light: 'Light',
	dark: 'Dark',
	terminal: 'Terminal',
	retro: 'Retro',
	'retro-dark': 'Retro Dark',
};

const ThemeColorSelector = () => {
	const { theme, themes, setTheme } = useTheme();

	return (
		<div className="p-6 bg-surface rounded shadow-md space-y-4">
			<h2 className="text-lg font-semibold text-primary">Select Theme</h2>
			<div className="flex gap-4 flex-wrap">
				{themes.map((themeName) => (
					<button
						key={themeName}
						type="button"
						onClick={() => setTheme(themeName)}
						className={`button secondary ${theme === themeName ? 'bg-primary text-surface' : ''}`}
					>
						{themeLabels[themeName] || themeName}
					</button>
				))}
			</div>
		</div>
	);
};

export default ThemeColorSelector;
