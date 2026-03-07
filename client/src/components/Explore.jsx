/**
 * Explore Component
 * Load a gist by URL/ID, or browse a user's public gists by username.
 * Works without authentication (uses public GitHub API).
 */

import { ArrowRight, Eye, FileText, GitFork, Globe, Search } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { forkGist } from '../services/api/gists';
import { getUserGists } from '../services/api/github';
import { generateGistPreview } from '../utils/describeGist';
import { logError } from '../utils/logger';
import Spinner from './common/Spinner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ErrorState } from './ui/error-state';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

/**
 * Parse a gist ID from various input formats:
 * - Raw 32-char hex ID
 * - https://gist.github.com/user/id
 * - https://gist.github.com/id
 * - gist.github.com/user/id
 * @param {string} input
 * @returns {string|null} gist ID or null
 */
const parseGistId = (input) => {
	const trimmed = input.trim();

	// Raw hex ID (20-32 chars)
	if (/^[a-f0-9]{20,32}$/i.test(trimmed)) {
		return trimmed;
	}

	// URL format
	try {
		const urlStr = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
		const url = new URL(urlStr);
		if (url.hostname === 'gist.github.com') {
			const parts = url.pathname.split('/').filter(Boolean);
			// /user/id or /id
			const candidate = parts[parts.length - 1];
			if (candidate && /^[a-f0-9]{20,32}$/i.test(candidate)) {
				return candidate;
			}
		}
	} catch {
		// Not a valid URL
	}

	return null;
};

/**
 * Determine if input looks like a gist reference (URL or ID) vs a username.
 * @param {string} input
 * @returns {'gist'|'user'}
 */
const detectInputType = (input) => {
	const trimmed = input.trim();
	if (!trimmed) return 'user';
	if (trimmed.includes('gist.github.com')) return 'gist';
	if (/^[a-f0-9]{20,32}$/i.test(trimmed)) return 'gist';
	return 'user';
};

const Explore = () => {
	const [query, setQuery] = useState('');
	const [gists, setGists] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [resultLabel, setResultLabel] = useState('');
	const [forkingId, setForkingId] = useState(null);
	const abortRef = useRef(0);

	const navigate = useNavigate();
	const { user, token } = useAuth();
	const toast = useToast();

	const handleSearch = useCallback(
		async (e) => {
			e?.preventDefault();
			const trimmed = query.trim();
			if (!trimmed) return;

			const searchId = ++abortRef.current;
			setLoading(true);
			setError(null);
			setGists([]);
			setResultLabel('');

			try {
				const inputType = detectInputType(trimmed);

				if (inputType === 'gist') {
					const gistId = parseGistId(trimmed);
					if (!gistId) {
						setError('Could not parse a gist ID from that input. Check the URL or ID format.');
						return;
					}
					// Navigate directly to the viewer
					navigate(`/view/${gistId}`);
					return;
				}

				// Username lookup
				const userGists = await getUserGists(trimmed);
				if (searchId !== abortRef.current) return;

				setGists(userGists);
				setResultLabel(
					userGists.length > 0
						? `${userGists.length} public gist${userGists.length !== 1 ? 's' : ''} by @${trimmed}`
						: `No public gists found for @${trimmed}`,
				);
			} catch (err) {
				if (searchId !== abortRef.current) return;
				logError('Explore search error', err);
				if (err.response?.status === 404) {
					setError(`User "${trimmed}" not found on GitHub.`);
				} else if (err.response?.status === 403) {
					setError(
						'GitHub API rate limit exceeded. Try again in a minute, or log in for higher limits.',
					);
				} else {
					setError('Failed to fetch gists. Please check the input and try again.');
				}
			} finally {
				if (searchId === abortRef.current) {
					setLoading(false);
				}
			}
		},
		[query, navigate],
	);

	const handleFork = async (gistId) => {
		if (!token) {
			toast.error('Please log in to fork gists');
			return;
		}
		try {
			setForkingId(gistId);
			const forked = await forkGist(gistId, token, null, user?.id);
			toast.success('Gist forked successfully!');
			navigate(`/gist/${forked.id}`);
		} catch (err) {
			logError('Failed to fork gist', err);
			toast.error('Failed to fork gist');
		} finally {
			setForkingId(null);
		}
	};

	return (
		<div className="space-y-6">
			{/* Search */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Globe className="h-5 w-5" />
						Explore Gists
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSearch} className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
							<Input
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="GitHub username or gist URL / ID"
								className="pl-10"
								autoFocus
							/>
						</div>
						<Button type="submit" disabled={loading || !query.trim()}>
							{loading ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
						</Button>
					</form>
					<p className="text-xs text-muted-foreground mt-2">
						Enter a username to browse their public gists, or paste a gist URL to view it directly.
					</p>
				</CardContent>
			</Card>

			{/* Error */}
			{error && <ErrorState message={error} variant="card" />}

			{/* Loading */}
			{loading && (
				<div className="flex flex-col items-center justify-center py-12">
					<Spinner />
					<p className="mt-4 text-muted-foreground">Searching...</p>
				</div>
			)}

			{/* Results */}
			{!loading && resultLabel && (
				<>
					<p className="text-sm text-muted-foreground">{resultLabel}</p>

					{gists.length > 0 && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{gists.map((gist) => {
								const preview = generateGistPreview(gist, 120);
								return (
									<Card key={gist.id} className="flex flex-col hover:shadow-lg transition-shadow">
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between gap-2 mb-2">
												<Badge variant="outline">
													{preview.fileCount} {preview.fileCount === 1 ? 'file' : 'files'}
												</Badge>
												<Badge variant="secondary">{preview.primaryLanguage}</Badge>
											</div>
											<CardTitle
												className="text-base hover:text-primary transition-colors line-clamp-1 cursor-pointer"
												onClick={() => navigate(`/view/${gist.id}`)}
											>
												{gist.description || preview.generatedTitle || 'Untitled Gist'}
											</CardTitle>
										</CardHeader>

										<CardContent
											className="flex-1 pb-3 cursor-pointer"
											onClick={() => navigate(`/view/${gist.id}`)}
										>
											<p className="text-sm text-muted-foreground line-clamp-3">
												{preview.preview}
											</p>
											<div className="flex flex-wrap gap-1 mt-3">
												{preview.fileTypes.slice(0, 3).map((fileType, index) => {
													const filename = Object.keys(gist.files)[index];
													return (
														<Badge key={filename} variant="outline" className="text-xs">
															{fileType.icon} {filename.split('.').pop()}
														</Badge>
													);
												})}
												{preview.fileCount > 3 && (
													<Badge variant="outline" className="text-xs">
														+{preview.fileCount - 3}
													</Badge>
												)}
											</div>
										</CardContent>

										<Separator />

										<CardFooter className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
											<span>Updated {new Date(gist.updated_at).toLocaleDateString()}</span>
											<div className="flex gap-2">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => navigate(`/view/${gist.id}`)}
													className="h-8 px-2"
													title="View gist"
												>
													<Eye className="h-3 w-3" />
												</Button>
												{token && gist.owner?.login !== user?.login && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleFork(gist.id)}
														disabled={forkingId === gist.id}
														className="h-8 px-2"
														title="Fork gist"
													>
														<GitFork className="h-3 w-3" />
													</Button>
												)}
											</div>
										</CardFooter>
									</Card>
								);
							})}
						</div>
					)}

					{gists.length === 0 && !error && (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<FileText className="h-12 w-12 text-muted-foreground mb-4" />
								<p className="text-muted-foreground">No public gists found for this user.</p>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	);
};

export default Explore;
