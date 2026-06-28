import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import Header from './Header';

vi.mock('../contexts/AuthContext', () => ({
	useAuth: vi.fn(() => ({
		user: null,
		initiateGithubLogin: vi.fn(),
		error: null,
		clearError: vi.fn(),
	})),
}));

const renderHeader = () =>
	render(
		<BrowserRouter>
			<ThemeProvider>
				<Header />
			</ThemeProvider>
		</BrowserRouter>,
	);

describe('Header theme selector', () => {
	beforeEach(() => {
		document.documentElement.className = '';
		document.documentElement.removeAttribute('data-theme');
	});

	it('lets users select and persist the retro dark theme', async () => {
		const user = userEvent.setup();

		renderHeader();

		await user.click(screen.getByRole('button', { name: /dark/i }));
		await user.click(screen.getByRole('button', { name: /retro dark/i }));

		expect(document.documentElement).toHaveClass('retro-dark');
		expect(document.documentElement).toHaveClass('dark');
		expect(document.documentElement).toHaveAttribute('data-theme', 'retro-dark');
		expect(localStorage.getItem('theme')).toBe('retro-dark');
		expect(screen.getByRole('button', { name: /retro dark/i })).toBeInTheDocument();
	});
});
