import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Callback from './Callback';

const mocks = vi.hoisted(() => ({
	login: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
	useAuth: () => ({
		isAuthenticated: false,
		loading: false,
		login: (...args) => mocks.login(...args),
	}),
}));

vi.mock('react-router-dom', () => ({
	useLocation: () => ({ search: '?code=oauth-code&state=oauth-state' }),
	useNavigate: () => mocks.navigate,
}));

describe('Callback', () => {
	it('exchanges one OAuth return code only once across rerenders', async () => {
		sessionStorage.setItem('code_verifier', 'verifier');
		mocks.login.mockResolvedValue(true);

		const view = render(<Callback />);
		await vi.waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));

		view.rerender(<Callback />);

		expect(mocks.login).toHaveBeenCalledTimes(1);
	});
});
