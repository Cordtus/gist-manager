import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getStoredToken, saveToken } from './session';

describe('session storage', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it('returns the saved token before expiry', () => {
		saveToken('test-token');

		expect(getStoredToken()).toBe('test-token');
	});

	it('rejects an expired session', () => {
		sessionStorage.setItem(
			'gist_manager_session',
			JSON.stringify({ token: 'test-token', expiration: Date.now() - 1000 }),
		);

		expect(getStoredToken()).toBeNull();
	});

	it('returns null for corrupt session data', () => {
		sessionStorage.setItem('gist_manager_session', '{not-json');

		expect(getStoredToken()).toBeNull();
	});

	it('clears the stored session', () => {
		saveToken('test-token');
		clearSession();

		expect(getStoredToken()).toBeNull();
	});
});
