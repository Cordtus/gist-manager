const SESSION_KEY = 'gist_manager_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const saveToken = (token) => {
	sessionStorage.setItem(
		SESSION_KEY,
		JSON.stringify({
			token,
			expiration: Date.now() + SESSION_TTL_MS,
			createdAt: new Date().toISOString(),
		}),
	);
};

export const getStoredToken = () => {
	try {
		const sessionData = sessionStorage.getItem(SESSION_KEY);
		if (!sessionData) return null;

		const { token, expiration } = JSON.parse(sessionData);
		return expiration && Date.now() < expiration ? token : null;
	} catch {
		return null;
	}
};

export const clearSession = () => {
	sessionStorage.removeItem(SESSION_KEY);
};
