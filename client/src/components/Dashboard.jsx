import { Github } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGistData } from '../contexts/GistDataContext';
import { generateGistPreview } from '../utils/describeGist';
import Spinner from './common/Spinner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ErrorState } from './ui/error-state';

const summarizeGists = (gists) => {
	let totalFiles = 0;
	let mostRecentUpdate = null;
	const fileTypes = {};

	gists.forEach((gist) => {
		const files = Object.values(gist.files || {});
		totalFiles += files.length;

		files.forEach((file) => {
			const extension = file.filename?.split('.').pop()?.toLowerCase() || 'unknown';
			fileTypes[extension] = (fileTypes[extension] || 0) + 1;
		});

		const updateDate = new Date(gist.updated_at);
		if (
			!Number.isNaN(updateDate.valueOf()) &&
			(!mostRecentUpdate || updateDate > mostRecentUpdate)
		) {
			mostRecentUpdate = updateDate;
		}
	});

	return {
		avgFilesPerGist: gists.length ? (totalFiles / gists.length).toFixed(1) : 0,
		fileTypes,
		mostRecentUpdate,
		totalFiles,
		totalGists: gists.length,
	};
};

const Dashboard = () => {
	const { initiateGithubLogin, user } = useAuth();
	const { error, gists, indexedPageCount, isIndexing, refresh, status } = useGistData();
	const metrics = useMemo(() => summarizeGists(gists), [gists]);
	const topFileTypes = useMemo(
		() =>
			Object.entries(metrics.fileTypes)
				.sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
				.slice(0, 3),
		[metrics.fileTypes],
	);

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
				<div className="text-center max-w-md">
					<h1 className="text-4xl font-bold mb-2">gist.md</h1>
					<p className="text-muted-foreground mb-8">Manage your GitHub Gists</p>
					<Button onClick={initiateGithubLogin} size="lg">
						<Github className="mr-2 h-5 w-5" />
						Connect with GitHub
					</Button>
				</div>
			</div>
		);
	}

	if (status === 'loading' && gists.length === 0) return <Spinner />;
	if (error && gists.length === 0)
		return <ErrorState message={error} variant="card" onRetry={refresh} />;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap gap-6 text-sm">
				<div>
					<span className="text-muted-foreground">Gists</span>
					<span className="ml-2 font-mono font-bold">{metrics.totalGists}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Files</span>
					<span className="ml-2 font-mono font-bold">{metrics.totalFiles}</span>
				</div>
				<div>
					<span className="text-muted-foreground">Avg</span>
					<span className="ml-2 font-mono font-bold">{metrics.avgFilesPerGist}</span>
				</div>
				{metrics.mostRecentUpdate && (
					<div>
						<span className="text-muted-foreground">Updated</span>
						<span className="ml-2 font-mono">{metrics.mostRecentUpdate.toLocaleDateString()}</span>
					</div>
				)}
				{isIndexing && (
					<p className="text-muted-foreground" role="status">
						Indexing page {indexedPageCount + 1}…
					</p>
				)}
			</div>

			{error && <ErrorState message={error} variant="banner" onRetry={refresh} />}

			{topFileTypes.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{topFileTypes.map(([type, count]) => (
						<Badge key={type} variant="secondary">
							.{type} ({count})
						</Badge>
					))}
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Recent Gists</CardTitle>
				</CardHeader>
				<CardContent>
					{gists.length > 0 ? (
						<div className="divide-y divide-border">
							{gists.slice(0, 5).map((gist) => {
								const preview = generateGistPreview(gist);
								const fileCount = Object.keys(gist.files || {}).length;
								return (
									<Link
										key={gist.id}
										to={`/gist/${gist.id}`}
										className="block group hover:bg-accent/50 -mx-4 px-4 py-3 transition-colors"
									>
										<p className="font-medium group-hover:text-primary transition-colors truncate">
											{gist.description || preview.generatedTitle || 'Untitled'}
										</p>
										<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
											{preview.preview}
										</p>
										<div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
											<span>
												{fileCount} {fileCount === 1 ? 'file' : 'files'}
											</span>
											<span>&middot;</span>
											<span>{new Date(gist.updated_at).toLocaleDateString()}</span>
										</div>
									</Link>
								);
							})}
						</div>
					) : (
						<div className="text-center py-8">
							<p className="text-muted-foreground mb-4">No gists yet</p>
							<Button asChild>
								<Link to="/gist">Create one</Link>
							</Button>
						</div>
					)}

					{gists.length > 0 && (
						<div className="mt-6 pt-4 border-t">
							<Button asChild variant="ghost" size="sm">
								<Link to="/gists">View all</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default Dashboard;
