const DATABASE_NAME = 'gist-manager';
const DATABASE_VERSION = 1;
const STORE_NAME = 'gist-page-metadata';
const USER_INDEX = 'by-user';

const canUseIndexedDb = () => typeof indexedDB !== 'undefined';

const requestResult = (request) =>
	new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
	});

const transactionResult = (transaction) =>
	new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () =>
			reject(transaction.error || new Error('IndexedDB transaction failed'));
		transaction.onabort = () =>
			reject(transaction.error || new Error('IndexedDB transaction aborted'));
	});

const openDatabase = async () => {
	if (!canUseIndexedDb()) return null;

	const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
	request.onupgradeneeded = () => {
		const database = request.result;
		if (database.objectStoreNames.contains(STORE_NAME)) return;

		const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
		store.createIndex(USER_INDEX, 'userId', { unique: false });
	};

	return requestResult(request);
};

const toGistMetadata = (gist) => ({
	id: gist.id,
	node_id: gist.node_id,
	description: gist.description,
	public: gist.public,
	created_at: gist.created_at,
	updated_at: gist.updated_at,
	comments: gist.comments,
	html_url: gist.html_url,
	git_pull_url: gist.git_pull_url,
	git_push_url: gist.git_push_url,
	owner: gist.owner
		? {
				id: gist.owner.id,
				login: gist.owner.login,
				avatar_url: gist.owner.avatar_url,
				html_url: gist.owner.html_url,
			}
		: undefined,
	files: Object.fromEntries(
		Object.entries(gist.files || {}).map(([filename, file]) => [
			filename,
			{
				filename: file.filename || filename,
				type: file.type,
				language: file.language,
				size: file.size,
				raw_url: file.raw_url,
				truncated: file.truncated,
			},
		]),
	),
});

export const getGistMetadataKey = (userId, page, perPage) => `${userId}:${page}:${perPage}`;

export const saveGistPageMetadata = async ({
	userId,
	page,
	perPage,
	eTag,
	hasNextPage,
	nextPage,
	gists,
}) => {
	const database = await openDatabase();
	if (!database) return;

	try {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		transaction.objectStore(STORE_NAME).put({
			key: getGistMetadataKey(userId, page, perPage),
			userId,
			page,
			perPage,
			eTag,
			hasNextPage,
			nextPage,
			gists: (gists || []).map(toGistMetadata),
			updatedAt: Date.now(),
		});
		await transactionResult(transaction);
	} finally {
		database.close();
	}
};

export const loadUserGistPageMetadata = async (userId) => {
	const database = await openDatabase();
	if (!database) return [];

	try {
		const transaction = database.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const records = store.indexNames.contains(USER_INDEX)
			? await requestResult(store.index(USER_INDEX).getAll(userId))
			: (await requestResult(store.getAll())).filter((record) => record.userId === userId);
		return records.sort(
			(first, second) => first.page - second.page || first.perPage - second.perPage,
		);
	} finally {
		database.close();
	}
};

export const clearUserGistPageMetadata = async (userId) => {
	const records = await loadUserGistPageMetadata(userId);
	if (records.length === 0) return;

	const database = await openDatabase();
	if (!database) return;

	try {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		records.forEach(({ key }) => store.delete(key));
		await transactionResult(transaction);
	} finally {
		database.close();
	}
};

export const clearGistPageMetadata = async (userId, page, perPage = null) => {
	const records = (await loadUserGistPageMetadata(userId)).filter(
		(record) => record.page === page && (perPage === null || record.perPage === perPage),
	);
	if (records.length === 0) return;

	const database = await openDatabase();
	if (!database) return;

	try {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		records.forEach(({ key }) => store.delete(key));
		await transactionResult(transaction);
	} finally {
		database.close();
	}
};

export const clearAllGistPageMetadata = async () => {
	const database = await openDatabase();
	if (!database) return;

	try {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		transaction.objectStore(STORE_NAME).clear();
		await transactionResult(transaction);
	} finally {
		database.close();
	}
};
