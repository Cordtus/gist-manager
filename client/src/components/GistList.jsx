import {
	ArrowUpDown,
	Edit2,
	Eye,
	FileText,
	Filter,
	Plus,
	RefreshCw,
	Search,
	Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGistData } from '../contexts/GistDataContext';
import { deleteGist, updateGist } from '../services/api/gists';
import { generateGistPreview } from '../utils/describeGist';
import { logError } from '../utils/logger';
import ConfirmationDialog from './ConfirmationDialog';
import Spinner from './common/Spinner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ErrorState } from './ui/error-state';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

const GistList = () => {
	const [gistToDelete, setGistToDelete] = useState(null);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [gistsPerPage] = useState(12);
	const [searchTerm, setSearchTerm] = useState('');
	const [sortOption, setSortOption] = useState('updated_at');
	const [sortDirection, setSortDirection] = useState('desc');
	const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
	const [editingGist, setEditingGist] = useState(null);
	const [editingDescription, setEditingDescription] = useState('');
	const [filterOptions, setFilterOptions] = useState({
		fileType: '',
		minFiles: '',
		maxFiles: '',
		dateFrom: '',
		dateTo: '',
	});
	const { user, token } = useAuth();
	const { error, gists, indexedPageCount, isIndexing, refresh, removeGist, status, upsertGist } =
		useGistData();
	const navigate = useNavigate();

	const searchIndex = useMemo(
		() =>
			Object.fromEntries(
				gists.map((gist) => {
					const files = Object.entries(gist.files || {});
					return [
						gist.id,
						{
							content: files
								.map(([, file]) => file.content)
								.filter((content) => content && content.length < 100000)
								.map((content) => content.toLowerCase()),
							description: gist.description?.toLowerCase() || '',
							fileTypes: new Set(
								files.map(([filename]) => filename.split('.').pop()?.toLowerCase()).filter(Boolean),
							),
							filenames: files.map(([filename]) => filename.toLowerCase()),
						},
					];
				}),
			),
		[gists],
	);

	const filteredGists = useMemo(() => {
		let results = [...gists];
		const search = searchTerm.trim().toLowerCase();
		if (search) {
			results = results.filter((gist) => {
				const entry = searchIndex[gist.id];
				return (
					entry?.description.includes(search) ||
					entry?.filenames.some((filename) => filename.includes(search)) ||
					entry?.content.some((content) => content.includes(search))
				);
			});
		}

		if (filterOptions.fileType) {
			const fileType = filterOptions.fileType.trim().toLowerCase();
			results = results.filter((gist) => searchIndex[gist.id]?.fileTypes.has(fileType));
		}
		if (filterOptions.minFiles) {
			results = results.filter(
				(gist) =>
					Object.keys(gist.files || {}).length >= Number.parseInt(filterOptions.minFiles, 10),
			);
		}
		if (filterOptions.maxFiles) {
			results = results.filter(
				(gist) =>
					Object.keys(gist.files || {}).length <= Number.parseInt(filterOptions.maxFiles, 10),
			);
		}
		if (filterOptions.dateFrom) {
			results = results.filter(
				(gist) => new Date(gist.updated_at) >= new Date(filterOptions.dateFrom),
			);
		}
		if (filterOptions.dateTo) {
			const endOfDay = new Date(filterOptions.dateTo);
			endOfDay.setHours(23, 59, 59, 999);
			results = results.filter((gist) => new Date(gist.updated_at) <= endOfDay);
		}

		return results.sort((first, second) => {
			if (sortOption === 'description') {
				return sortDirection === 'asc'
					? (first.description || '').localeCompare(second.description || '')
					: (second.description || '').localeCompare(first.description || '');
			}
			if (sortOption === 'files_count') {
				const difference =
					Object.keys(first.files || {}).length - Object.keys(second.files || {}).length;
				return sortDirection === 'asc' ? difference : -difference;
			}
			const difference = new Date(first[sortOption]) - new Date(second[sortOption]);
			return sortDirection === 'asc' ? difference : -difference;
		});
	}, [filterOptions, gists, searchIndex, searchTerm, sortDirection, sortOption]);

	const handleSortChange = (option) => {
		setCurrentPage(1);
		if (option === sortOption) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortOption(option);
			setSortDirection('desc');
		}
	};

	const handleDeleteClick = (gist, e) => {
		e.preventDefault();
		e.stopPropagation();
		setGistToDelete(gist);
		setIsConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (gistToDelete) {
			try {
				await deleteGist(gistToDelete.id, token, undefined, user?.id);
				removeGist(gistToDelete.id);
			} catch (error) {
				logError('Error deleting gist', error);
			}
		}
		setIsConfirmOpen(false);
		setGistToDelete(null);
	};

	const resetFilters = () => {
		setCurrentPage(1);
		setSearchTerm('');
		setFilterOptions({ fileType: '', minFiles: '', maxFiles: '', dateFrom: '', dateTo: '' });
		setIsAdvancedSearch(false);
	};

	const refreshGists = () => refresh();
	const updateFilters = (updater) => {
		setCurrentPage(1);
		setFilterOptions(updater);
	};

	const handleEditDescription = (gist, e) => {
		e.preventDefault();
		e.stopPropagation();
		setEditingGist(gist.id);
		setEditingDescription(gist.description || '');
	};

	const handleSaveDescription = async (gist, e) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		try {
			const updatedGist = { ...gist, description: editingDescription };
			const savedGist = await updateGist(gist.id, updatedGist, token, undefined, user?.id);
			upsertGist(savedGist || { ...gist, description: editingDescription });
			setEditingGist(null);
			setEditingDescription('');
		} catch (error) {
			logError('Error updating description', error);
		}
	};

	const handleCancelEdit = (e) => {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		setEditingGist(null);
		setEditingDescription('');
	};

	// Pagination
	const indexOfLastGist = currentPage * gistsPerPage;
	const indexOfFirstGist = indexOfLastGist - gistsPerPage;
	const currentGists = filteredGists.slice(indexOfFirstGist, indexOfLastGist);
	const totalPages = Math.ceil(filteredGists.length / gistsPerPage);

	const paginate = (pageNumber) => setCurrentPage(pageNumber);

	if (!user) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-muted-foreground">Please log in to view your gists.</p>
				</CardContent>
			</Card>
		);
	}

	if (status === 'loading' && gists.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12">
				<Spinner />
				<p className="mt-4 text-muted-foreground">Loading your gists...</p>
			</div>
		);
	}

	if (error && gists.length === 0 && status === 'error') {
		return <ErrorState message={error} variant="card" onRetry={refreshGists} />;
	}

	const allFileTypes = new Set();
	Object.values(searchIndex).forEach((entry) => {
		entry.fileTypes.forEach((type) => allFileTypes.add(type));
	});
	const fileTypeOptions = Array.from(allFileTypes).sort();

	return (
		<div className="space-y-6">
			{error && <ErrorState message={error} variant="banner" onRetry={refreshGists} />}
			{/* Search and Filters Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>My Gists</CardTitle>
						<div className="flex gap-2">
							<Button
								onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
								variant="outline"
								size="sm"
							>
								<Filter className="h-4 w-4 mr-2" />
								{isAdvancedSearch ? 'Hide' : 'Show'} Filters
							</Button>
							<Button
								onClick={refreshGists}
								variant="ghost"
								size="sm"
								disabled={status === 'refreshing'}
							>
								{status === 'refreshing' ? (
									<span>Refreshing…</span>
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Search Bar */}
					<div className="relative">
						<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search gists by title, filename, or content..."
							value={searchTerm}
							onChange={(e) => {
								setCurrentPage(1);
								setSearchTerm(e.target.value);
							}}
							className="pl-10"
						/>
					</div>

					{/* Advanced Filters */}
					{isAdvancedSearch && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
							<div>
								<label htmlFor="filter-file-type" className="text-sm font-medium mb-1 block">
									File Type
								</label>
								<select
									id="filter-file-type"
									name="fileType"
									value={filterOptions.fileType}
									onChange={(e) => updateFilters((prev) => ({ ...prev, fileType: e.target.value }))}
									className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="">Any type</option>
									{fileTypeOptions.map((type) => (
										<option key={type} value={type}>
											{type}
										</option>
									))}
								</select>
							</div>
							<div>
								<label htmlFor="filter-min-files" className="text-sm font-medium mb-1 block">
									Min Files
								</label>
								<Input
									id="filter-min-files"
									type="number"
									name="minFiles"
									value={filterOptions.minFiles}
									onChange={(e) => updateFilters((prev) => ({ ...prev, minFiles: e.target.value }))}
									placeholder="Min"
									min="1"
								/>
							</div>
							<div>
								<label htmlFor="filter-max-files" className="text-sm font-medium mb-1 block">
									Max Files
								</label>
								<Input
									id="filter-max-files"
									type="number"
									name="maxFiles"
									value={filterOptions.maxFiles}
									onChange={(e) => updateFilters((prev) => ({ ...prev, maxFiles: e.target.value }))}
									placeholder="Max"
									min="1"
								/>
							</div>
							<div>
								<label htmlFor="filter-date-from" className="text-sm font-medium mb-1 block">
									From Date
								</label>
								<Input
									id="filter-date-from"
									type="date"
									name="dateFrom"
									value={filterOptions.dateFrom}
									onChange={(e) => updateFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
								/>
							</div>
							<div>
								<label htmlFor="filter-date-to" className="text-sm font-medium mb-1 block">
									To Date
								</label>
								<Input
									id="filter-date-to"
									type="date"
									name="dateTo"
									value={filterOptions.dateTo}
									onChange={(e) => updateFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
								/>
							</div>
							<div className="flex items-end">
								<Button onClick={resetFilters} variant="outline" className="w-full">
									Reset Filters
								</Button>
							</div>
						</div>
					)}

					{/* Sort Options */}
					<div className="flex flex-wrap gap-2">
						{['updated_at', 'created_at', 'description', 'files_count'].map((option) => (
							<Button
								key={option}
								onClick={() => handleSortChange(option)}
								variant={sortOption === option ? 'default' : 'outline'}
								size="sm"
							>
								{option === 'updated_at' && 'Updated'}
								{option === 'created_at' && 'Created'}
								{option === 'description' && 'Alphabetical'}
								{option === 'files_count' && 'Files'}
								{sortOption === option && <ArrowUpDown className="ml-2 h-3 w-3" />}
							</Button>
						))}
					</div>

					{/* Results Stats */}
					<div className="text-sm text-muted-foreground">
						Showing {filteredGists.length} of {gists.length} gists
						{searchTerm && <span> matching "{searchTerm}"</span>}
					</div>
					{isIndexing && (
						<p className="text-sm text-muted-foreground" role="status">
							Indexing page {indexedPageCount + 1}…
						</p>
					)}
				</CardContent>
			</Card>

			{/* Gists Grid */}
			{currentGists.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{currentGists.map((gist) => {
						const preview = generateGistPreview(gist, 120);
						const isEditing = editingGist === gist.id;

						return (
							<Card key={gist.id} className="flex flex-col hover:shadow-lg transition-shadow">
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between gap-2 mb-2">
										<div className="flex gap-2">
											<Badge variant={gist.public ? 'default' : 'secondary'}>
												{gist.public ? 'Public' : 'Private'}
											</Badge>
											<Badge variant="outline">
												{preview.fileCount} {preview.fileCount === 1 ? 'file' : 'files'}
											</Badge>
										</div>
										<Badge variant="secondary">{preview.primaryLanguage}</Badge>
									</div>

									{isEditing ? (
										<div className="space-y-2">
											<Input
												value={editingDescription}
												onChange={(e) => setEditingDescription(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === 'Enter') handleSaveDescription(gist, e);
													if (e.key === 'Escape') handleCancelEdit(e);
												}}
												onBlur={() => handleSaveDescription(gist)}
												placeholder="Enter description..."
												autoFocus
											/>
										</div>
									) : (
										<Link to={`/gist/${gist.id}`}>
											<CardTitle className="text-base hover:text-primary transition-colors line-clamp-1">
												{gist.description || preview.generatedTitle || 'Untitled Gist'}
											</CardTitle>
										</Link>
									)}
								</CardHeader>

								<CardContent className="flex-1 pb-3">
									<Link to={`/gist/${gist.id}`}>
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

								<Separator />

								<CardFooter className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
									<span>Updated {new Date(gist.updated_at).toLocaleDateString()}</span>
									<div className="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												navigate(`/view/${gist.id}`);
											}}
											className="h-8 px-2"
											title="View gist"
										>
											<Eye className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => handleEditDescription(gist, e)}
											className="h-8 px-2"
											title="Edit description"
										>
											<Edit2 className="h-3 w-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => handleDeleteClick(gist, e)}
											className="h-8 px-2 text-destructive hover:text-destructive"
											title="Delete gist"
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</CardFooter>
							</Card>
						);
					})}
				</div>
			) : isIndexing && gists.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12" role="status">
					<Spinner />
					<p className="mt-4 text-muted-foreground">Indexing your gists...</p>
				</div>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<FileText className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium mb-2">
							{searchTerm ? 'No matches found' : 'No gists yet'}
						</h3>
						<p className="text-muted-foreground mb-6 text-center">
							{searchTerm
								? `No gists found matching "${searchTerm}"`
								: 'Get started by creating your first gist'}
						</p>
						<Button asChild>
							<Link to="/gist">
								<Plus className="mr-2 h-4 w-4" />
								Create new gist
							</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex justify-center gap-2">
					<Button
						onClick={() => paginate(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						variant="outline"
					>
						Previous
					</Button>
					{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						let pageNum;
						if (totalPages <= 5) {
							pageNum = i + 1;
						} else if (currentPage <= 3) {
							pageNum = i + 1;
						} else if (currentPage >= totalPages - 2) {
							pageNum = totalPages - 4 + i;
						} else {
							pageNum = currentPage - 2 + i;
						}
						return (
							<Button
								key={pageNum}
								onClick={() => paginate(pageNum)}
								variant={currentPage === pageNum ? 'default' : 'outline'}
							>
								{pageNum}
							</Button>
						);
					})}
					<Button
						onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
						variant="outline"
					>
						Next
					</Button>
				</div>
			)}

			{/* Delete Dialog */}
			<ConfirmationDialog
				isOpen={isConfirmOpen}
				onClose={() => setIsConfirmOpen(false)}
				onConfirm={confirmDelete}
				title="Confirm Delete"
				message="Are you sure you want to delete this gist? This action cannot be undone."
			/>
		</div>
	);
};

export default GistList;
