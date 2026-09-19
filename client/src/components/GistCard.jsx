import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';

const GistCard = ({ gist, preview, to, extraBadges, titleSlot, actions }) => (
	<Card className="flex flex-col hover:shadow-lg transition-shadow">
		<CardHeader className="pb-3">
			<div className="flex items-start justify-between gap-2 mb-2">
				<div className="flex gap-2">
					{extraBadges}
					<Badge variant="outline">
						{preview.fileCount} {preview.fileCount === 1 ? 'file' : 'files'}
					</Badge>
				</div>
				<Badge variant="secondary">{preview.primaryLanguage}</Badge>
			</div>

			{titleSlot ?? (
				<Link to={to}>
					<CardTitle className="text-base hover:text-primary transition-colors line-clamp-1">
						{gist.description || preview.generatedTitle || 'Untitled Gist'}
					</CardTitle>
				</Link>
			)}
		</CardHeader>

		<CardContent className="flex-1 pb-3">
			<Link to={to}>
				<p className="text-sm text-muted-foreground line-clamp-3">{preview.preview}</p>
			</Link>

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

		<hr />

		<CardFooter className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
			<span>Updated {new Date(gist.updated_at).toLocaleDateString()}</span>
			<div className="flex gap-2">{actions}</div>
		</CardFooter>
	</Card>
);

export default GistCard;
