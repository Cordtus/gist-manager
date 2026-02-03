/**
 * GistViewer - Read-only markdown viewer with sharing capabilities
 * Supports public gists without authentication for shareable links.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Download, GitFork, Edit, ExternalLink, Eye, Lock, Globe } from 'lucide-react';
import { getGist, getPublicGist, forkGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { logError } from '../utils/logger';
import { downloadFile, copyToClipboard, getShareableUrl } from '../utils/download';
import MarkdownPreview from './markdown/MarkdownPreview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import Spinner from './common/Spinner';
import '../styles/gistViewer.css';

/**
 * Determines the programming language from a filename extension.
 * @param {string} filename - The filename to analyze
 * @returns {string} - The language identifier for syntax highlighting
 */
const getFileLanguage = (filename) => {
	if (!filename) return 'text';
	const ext = filename.split('.').pop().toLowerCase();
	const languageMap = {
		js: 'javascript',
		jsx: 'jsx',
		ts: 'typescript',
		tsx: 'tsx',
		py: 'python',
		rb: 'ruby',
		java: 'java',
		go: 'go',
		rs: 'rust',
		html: 'html',
		css: 'css',
		scss: 'scss',
		json: 'json',
		yaml: 'yaml',
		yml: 'yaml',
		sh: 'bash',
		bash: 'bash',
		zsh: 'bash',
		sql: 'sql',
		c: 'c',
		cpp: 'cpp',
		h: 'c',
		hpp: 'cpp',
		cs: 'csharp',
		php: 'php',
		swift: 'swift',
		kt: 'kotlin',
		scala: 'scala',
		r: 'r',
		lua: 'lua',
		vim: 'vim',
		dockerfile: 'dockerfile',
		makefile: 'makefile',
		toml: 'toml',
		ini: 'ini',
		xml: 'xml',
		txt: 'text'
	};
	return languageMap[ext] || 'text';
};

/**
 * Checks if a file is a markdown file.
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if the file is markdown
 */
const isMarkdownFile = (filename) => {
	if (!filename) return false;
	return /\.(md|markdown|mdx)$/i.test(filename);
};

/**
 * Formats a relative time string.
 * @param {string} dateString - ISO date string
 * @returns {string} - Human-readable relative time
 */
const formatRelativeTime = (dateString) => {
	const date = new Date(dateString);
	const now = new Date();
	const diff = now - date;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 30) {
		return date.toLocaleDateString();
	} else if (days > 0) {
		return `${days}d ago`;
	} else if (hours > 0) {
		return `${hours}h ago`;
	} else if (minutes > 0) {
		return `${minutes}m ago`;
	}
	return 'just now';
};

const GistViewer = () => {
	const { id, filename: urlFilename } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();
	const toast = useToast();

	const [gist, setGist] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeFile, setActiveFile] = useState(null);
	const [forking, setForking] = useState(false);

	// Add page class for layout targeting
	useEffect(() => {
		document.body.classList.add('gist-viewer-page');
		return () => document.body.classList.remove('gist-viewer-page');
	}, []);

	// Fetch gist data - works without auth for public gists
	const fetchGist = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			let data;
			if (token) {
				// Authenticated - can see all user's gists
				data = await getGist(id, token, setError);
			} else {
				// Unauthenticated - only public gists
				data = await getPublicGist(id, setError);
			}

			setGist(data);

			// Set active file from URL or first file
			if (urlFilename && data?.files?.[urlFilename]) {
				setActiveFile(urlFilename);
			} else if (data?.files) {
				setActiveFile(Object.keys(data.files)[0]);
			}
		} catch (err) {
			logError('Failed to fetch gist for viewer', err);
			if (err.response?.status === 404) {
				setError('Gist not found or is private. Please log in to view private gists.');
			} else {
				setError('Failed to load gist. Please try again.');
			}
		} finally {
			setLoading(false);
		}
	}, [id, token, urlFilename]);

	useEffect(() => {
		if (id) {
			fetchGist();
		}
	}, [id, fetchGist]);

	// Action handlers
	const handleCopyRaw = async () => {
		if (!activeFile || !gist?.files?.[activeFile]) return;
		const content = gist.files[activeFile].content;
		const success = await copyToClipboard(content);
		if (success) {
			toast.success('Copied to clipboard!');
		} else {
			toast.error('Failed to copy to clipboard');
		}
	};

	const handleCopyLink = async () => {
		const url = getShareableUrl(id, activeFile);
		const success = await copyToClipboard(url);
		if (success) {
			toast.success('Link copied!');
		} else {
			toast.error('Failed to copy link');
		}
	};

	const handleDownload = () => {
		if (!activeFile || !gist?.files?.[activeFile]) return;
		const content = gist.files[activeFile].content;
		downloadFile(content, activeFile);
		toast.success(`Downloaded ${activeFile}`);
	};

	const handleFork = async () => {
		if (!token) {
			toast.error('Please log in to fork gists');
			return;
		}

		try {
			setForking(true);
			const forkedGist = await forkGist(id, token, setError);
			toast.success('Gist forked successfully!');
			navigate(`/gist/${forkedGist.id}`);
		} catch (err) {
			logError('Failed to fork gist', err);
			toast.error('Failed to fork gist');
		} finally {
			setForking(false);
		}
	};

	const handleEdit = () => {
		navigate(`/gist/${id}`);
	};

	// Determine if current user owns the gist
	const isOwner = user?.login === gist?.owner?.login;

	// Current file content
	const currentContent = activeFile ? gist?.files?.[activeFile]?.content || '' : '';
	const fileList = gist?.files ? Object.keys(gist.files) : [];

	// Loading state
	if (loading) {
		return (
			<Card className="gist-viewer">
				<CardContent className="viewer-loading">
					<Spinner />
					<p className="mt-4 text-muted-foreground">Loading gist...</p>
				</CardContent>
			</Card>
		);
	}

	// Error state
	if (error || !gist) {
		return (
			<Card className="gist-viewer">
				<CardContent className="viewer-error">
					<p className="text-lg font-medium mb-2">Unable to load gist</p>
					<p className="text-muted-foreground mb-4">{error || 'Gist not found'}</p>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => navigate(-1)}>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go Back
						</Button>
						{!token && (
							<Button onClick={() => navigate('/')}>
								Log In
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="gist-viewer">
			{/* Header */}
			<div className="viewer-header">
				<div className="viewer-header-top">
					<div>
						<h1 className="viewer-title">
							{gist.description || Object.keys(gist.files)[0] || 'Untitled Gist'}
						</h1>
					</div>
					<Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back
					</Button>
				</div>

				<div className="viewer-meta">
					{gist.owner && (
						<span className="viewer-meta-item">
							by @{gist.owner.login}
						</span>
					)}
					<span className="viewer-meta-separator">|</span>
					<span className="viewer-meta-item">
						{gist.public ? (
							<>
								<Globe className="h-3 w-3" />
								<span>Public</span>
							</>
						) : (
							<>
								<Lock className="h-3 w-3" />
								<span>Secret</span>
							</>
						)}
					</span>
					<span className="viewer-meta-separator">|</span>
					<span className="viewer-meta-item">
						Updated {formatRelativeTime(gist.updated_at)}
					</span>
					<span className="viewer-meta-separator">|</span>
					<span className="viewer-meta-item">
						{fileList.length} {fileList.length === 1 ? 'file' : 'files'}
					</span>
				</div>
			</div>

			{/* File tabs */}
			{fileList.length > 1 && (
				<div className="viewer-tabs">
					{fileList.map((filename) => (
						<button
							key={filename}
							className={`viewer-tab ${activeFile === filename ? 'active' : ''}`}
							onClick={() => setActiveFile(filename)}
						>
							{filename}
						</button>
					))}
				</div>
			)}

			{/* Action bar */}
			<div className="viewer-actions">
				<div className="viewer-actions-left">
					<Button variant="outline" size="sm" onClick={handleCopyRaw}>
						<Copy className="h-4 w-4 mr-2" />
						Copy Raw
					</Button>
					<Button variant="outline" size="sm" onClick={handleCopyLink}>
						<ExternalLink className="h-4 w-4 mr-2" />
						Copy Link
					</Button>
					<Button variant="outline" size="sm" onClick={handleDownload}>
						<Download className="h-4 w-4 mr-2" />
						Download
					</Button>
					{token && !isOwner && (
						<Button variant="outline" size="sm" onClick={handleFork} disabled={forking}>
							<GitFork className="h-4 w-4 mr-2" />
							{forking ? 'Forking...' : 'Fork'}
						</Button>
					)}
				</div>
				<div className="viewer-actions-right">
					{isOwner && (
						<Button variant="default" size="sm" onClick={handleEdit}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</Button>
					)}
					<a
						href={gist.html_url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button variant="ghost" size="sm">
							<Eye className="h-4 w-4 mr-2" />
							View on GitHub
						</Button>
					</a>
				</div>
			</div>

			{/* Content */}
			<div className={isMarkdownFile(activeFile) ? 'viewer-content' : 'viewer-content viewer-content-code'}>
				{activeFile && (
					<>
						{isMarkdownFile(activeFile) ? (
							<MarkdownPreview content={currentContent} />
						) : (
							<div className="viewer-code-block">
								<SyntaxHighlighter
									language={getFileLanguage(activeFile)}
									style={tomorrow}
									showLineNumbers
									wrapLongLines
								>
									{currentContent}
								</SyntaxHighlighter>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default GistViewer;
