import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./contexts/AuthContext', () => ({
	AuthProvider: ({ children }) => children,
	useAuth: () => ({
		clearError: vi.fn(),
		error: null,
		initiateGithubLogin: vi.fn(),
		isAuthenticated: false,
		loading: true,
		user: null,
	}),
}));

vi.mock('./contexts/ThemeContext', () => ({
	ThemeProvider: ({ children }) => children,
	useTheme: () => ({
		setTheme: vi.fn(),
		theme: 'dark',
		themes: ['dark'],
	}),
}));

vi.mock('./contexts/GistDataContext', () => ({
	GistDataProvider: ({ children }) => children,
	useGistData: () => ({
		error: null,
		gists: [],
		indexedPageCount: 0,
		isIndexing: false,
		refresh: vi.fn(),
		status: 'idle',
	}),
}));

vi.mock('./contexts/ToastContext', () => ({
	ToastProvider: ({ children }) => children,
}));

describe('App', () => {
	it('keeps navigation available while restoring the session', () => {
		render(<App />);

		expect(screen.getByRole('link', { name: 'gist.md' })).toBeInTheDocument();
		expect(screen.getAllByText('Navigation').length).toBeGreaterThan(0);
		expect(screen.getByRole('status')).toHaveTextContent('Restoring your session');
	});
});
