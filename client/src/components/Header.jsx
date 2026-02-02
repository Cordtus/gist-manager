import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Terminal, Sparkles, Github, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { ErrorState } from './ui/error-state';

const themeIcons = {
	light: Sun,
	dark: Moon,
	terminal: Terminal,
	retro: Sparkles
};

const themeLabels = {
	light: 'Light',
	dark: 'Dark',
	terminal: 'Terminal',
	retro: 'Retro'
};

const Header = () => {
	const { user, initiateGithubLogin, error, clearError } = useAuth();
	const { theme, themes, setTheme } = useTheme();
	const [showThemeMenu, setShowThemeMenu] = useState(false);
	const menuRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setShowThemeMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const CurrentIcon = themeIcons[theme] || Moon;

	return (
		<>
			{error && (
				<ErrorState message={error} variant="banner" onDismiss={clearError} />
			)}
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex h-14 items-center justify-between px-4">
					<Link
						to="/"
						className="font-semibold text-lg hover:opacity-80 transition-opacity"
					>
						gist.md
					</Link>

					<div className="flex items-center gap-2">
						{/* Theme selector */}
						<div className="relative" ref={menuRef}>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowThemeMenu(!showThemeMenu)}
								className="gap-1"
							>
								<CurrentIcon className="h-4 w-4" />
								<span className="hidden sm:inline text-xs">{themeLabels[theme]}</span>
								<ChevronDown className="h-3 w-3" />
							</Button>

							{showThemeMenu && (
								<div className="absolute right-0 top-full mt-1 py-1 bg-popover border rounded-[var(--radius)] shadow-lg min-w-[120px]">
									{themes.map((t) => {
										const Icon = themeIcons[t];
										return (
											<button
												key={t}
												onClick={() => {
													setTheme(t);
													setShowThemeMenu(false);
												}}
												className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors ${
													theme === t ? 'text-primary bg-accent' : ''
												}`}
											>
												<Icon className="h-4 w-4" />
												{themeLabels[t]}
											</button>
										);
									})}
								</div>
							)}
						</div>

						{user ? (
							<div className="flex items-center gap-2 pl-2 border-l">
								{user.avatar_url && (
									<img
										src={user.avatar_url}
										alt={user.login}
										className="h-7 w-7 rounded-full"
									/>
								)}
								<span className="text-sm hidden sm:inline">
									{user.login}
								</span>
							</div>
						) : (
							<Button onClick={initiateGithubLogin} size="sm">
								<Github className="h-4 w-4 sm:mr-2" />
								<span className="hidden sm:inline">Login</span>
							</Button>
						)}
					</div>
				</div>
			</header>
		</>
	);
};

export default Header;
