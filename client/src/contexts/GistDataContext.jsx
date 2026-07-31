import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { getGistPage } from '../services/api/gists';
import { logError } from '../utils/logger';
import { useAuth } from './AuthContext';

const GistDataContext = createContext(null);
const GISTS_PER_PAGE = 30;

const toCollection = (pages) => {
	const seen = new Set();
	return Array.from(pages.entries())
		.sort(([firstPage], [secondPage]) => firstPage - secondPage)
		.flatMap(([, page]) => page.gists)
		.filter((gist) => {
			if (seen.has(gist.id)) return false;
			seen.add(gist.id);
			return true;
		});
};

const isCanceled = (error) => error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';

export const GistDataProvider = ({ children }) => {
	const { loading: isAuthLoading, token, user } = useAuth();
	const [gists, setGists] = useState([]);
	const [status, setStatus] = useState('idle');
	const [error, setError] = useState(null);
	const [isIndexing, setIsIndexing] = useState(false);
	const [indexedPageCount, setIndexedPageCount] = useState(0);
	const pagesRef = useRef(new Map());
	const controllerRef = useRef(null);
	const requestIdRef = useRef(0);
	const identityRef = useRef(null);

	const publishPages = useCallback(() => {
		setGists(toCollection(pagesRef.current));
	}, []);

	const cancelPendingLoad = useCallback(() => {
		requestIdRef.current += 1;
		controllerRef.current?.abort();
		controllerRef.current = null;
	}, []);

	const refresh = useCallback(
		async ({ force = true } = {}) => {
			if (isAuthLoading || !token || !user?.id) return;

			cancelPendingLoad();
			const requestId = requestIdRef.current;
			const controller = new AbortController();
			controllerRef.current = controller;
			const identity = String(user.id);

			if (identityRef.current !== identity) {
				identityRef.current = identity;
				pagesRef.current = new Map();
				setGists([]);
				setIndexedPageCount(0);
			}

			setError(null);
			setStatus(pagesRef.current.size > 0 ? 'refreshing' : 'loading');
			setIsIndexing(false);

			try {
				let pageResult = await getGistPage({
					force,
					page: 1,
					perPage: GISTS_PER_PAGE,
					signal: controller.signal,
					token,
					userId: user.id,
				});
				if (requestId !== requestIdRef.current) return;

				pagesRef.current.set(pageResult.page || 1, pageResult);
				publishPages();
				setStatus('ready');
				setIndexedPageCount(1);
				setIsIndexing(pageResult.hasNextPage);

				while (pageResult.hasNextPage && pageResult.nextPage) {
					pageResult = await getGistPage({
						force,
						page: pageResult.nextPage,
						perPage: GISTS_PER_PAGE,
						signal: controller.signal,
						token,
						userId: user.id,
					});
					if (requestId !== requestIdRef.current) return;

					pagesRef.current.set(pageResult.page, pageResult);
					publishPages();
					setIndexedPageCount(pageResult.page);
				}

				if (requestId === requestIdRef.current) setIsIndexing(false);
			} catch (loadError) {
				if (
					requestId !== requestIdRef.current ||
					controller.signal.aborted ||
					isCanceled(loadError)
				)
					return;

				logError('Error loading gist collection', { error: loadError.message, userId: user.id });
				setError('Failed to load your gists. Please try again.');
				setStatus('error');
				setIsIndexing(false);
			}
		},
		[cancelPendingLoad, isAuthLoading, publishPages, token, user?.id],
	);

	useEffect(() => {
		if (isAuthLoading) return undefined;

		if (!token || !user?.id) {
			cancelPendingLoad();
			identityRef.current = null;
			pagesRef.current = new Map();
			setGists([]);
			setError(null);
			setIndexedPageCount(0);
			setIsIndexing(false);
			setStatus('idle');
			return undefined;
		}

		refresh({ force: false });
		return cancelPendingLoad;
	}, [cancelPendingLoad, isAuthLoading, refresh, token, user?.id]);

	const upsertGist = useCallback(
		(gist) => {
			let wasPresent = false;
			pagesRef.current.forEach((page, pageNumber) => {
				const nextGists = page.gists.map((currentGist) => {
					if (currentGist.id !== gist.id) return currentGist;
					wasPresent = true;
					return gist;
				});
				pagesRef.current.set(pageNumber, { ...page, gists: nextGists });
			});

			if (wasPresent) {
				publishPages();
				return;
			}

			const firstPage = pagesRef.current.get(1);
			if (firstPage) {
				pagesRef.current.set(1, {
					...firstPage,
					gists: [gist, ...firstPage.gists.filter((currentGist) => currentGist.id !== gist.id)],
				});
				publishPages();
				return;
			}

			setGists((currentGists) => [gist, ...currentGists.filter(({ id }) => id !== gist.id)]);
		},
		[publishPages],
	);

	const removeGist = useCallback((gistId) => {
		pagesRef.current.forEach((page, pageNumber) => {
			pagesRef.current.set(pageNumber, {
				...page,
				gists: page.gists.filter((gist) => gist.id !== gistId),
			});
		});
		setGists((currentGists) => currentGists.filter((gist) => gist.id !== gistId));
	}, []);

	const value = useMemo(
		() => ({
			error,
			gists,
			indexedPageCount,
			isIndexing,
			refresh,
			removeGist,
			status,
			upsertGist,
		}),
		[error, gists, indexedPageCount, isIndexing, refresh, removeGist, status, upsertGist],
	);

	return <GistDataContext.Provider value={value}>{children}</GistDataContext.Provider>;
};

export const useGistData = () => {
	const context = useContext(GistDataContext);
	if (!context) throw new Error('useGistData must be used within GistDataProvider');
	return context;
};
