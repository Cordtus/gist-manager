// GistEditor.js - Enhanced split-panel Markdown editor

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createGist, getGist, updateGist } from '../services/api/gists';
import { logError } from '../utils/logger';
import MarkdownPreview from './markdown/MarkdownPreview';
import { ErrorState } from './ui/error-state';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import '../styles/gistEditor.css';
import '../styles/markdownPreview.css';

/**
 * Enhanced Toolbar Component with all Markdown controls
 */
const MarkdownToolbar = ({ onInsert, activeFile }) => {
	const toolbar = [
		{
			group: 'Text Formatting',
			items: [
				{
					key: 'bold',
					icon: <strong>B</strong>,
					title: 'Bold text',
					tooltip:
						'Make selected text bold. Wrap text with ** on each side. Example: **bold text**',
					action: () => onInsert('**', '**'),
					shortcut: 'Ctrl+B',
				},
				{
					key: 'italic',
					icon: <em>I</em>,
					title: 'Italic text',
					tooltip:
						'Make selected text italic. Wrap text with * on each side. Example: *italic text*',
					action: () => onInsert('*', '*'),
					shortcut: 'Ctrl+I',
				},
				{
					key: 'strikethrough',
					icon: <span style={{ textDecoration: 'line-through' }}>S</span>,
					title: 'Strikethrough',
					tooltip:
						'Strike through selected text. Wrap with ~~ on each side. Example: ~~deleted text~~',
					action: () => onInsert('~~', '~~'),
				},
				{
					key: 'code',
					icon: <code>{`<>`}</code>,
					title: 'Inline code',
					tooltip: 'Format as inline code. Wrap with backticks. Example: `code`',
					action: () => onInsert('`', '`'),
					shortcut: 'Ctrl+`',
				},
				{
					key: 'highlight',
					icon: <mark style={{ padding: '0 2px' }}>H</mark>,
					title: 'Highlight',
					tooltip: 'Highlight selected text. Wrap with == on each side. Example: ==highlighted==',
					action: () => onInsert('==', '=='),
				},
				{
					key: 'subscript',
					icon: (
						<span>
							X<sub>2</sub>
						</span>
					),
					title: 'Subscript',
					tooltip: 'Format as subscript. Wrap with ~ on each side. Example: H~2~O',
					action: () => onInsert('~', '~'),
				},
				{
					key: 'superscript',
					icon: (
						<span>
							X<sup>2</sup>
						</span>
					),
					title: 'Superscript',
					tooltip: 'Format as superscript. Wrap with ^ on each side. Example: X^2^',
					action: () => onInsert('^', '^'),
				},
			],
		},
		{
			group: 'Headings',
			items: [
				{
					key: 'h1',
					icon: 'H1',
					title: 'Heading 1',
					tooltip: 'Largest heading. Use # at the start of a line. Example: # Main Title',
					action: () => onInsert('# ', '\n'),
				},
				{
					key: 'h2',
					icon: 'H2',
					title: 'Heading 2',
					tooltip: 'Section heading. Use ## at the start of a line. Example: ## Section Title',
					action: () => onInsert('## ', '\n'),
				},
				{
					key: 'h3',
					icon: 'H3',
					title: 'Heading 3',
					tooltip: 'Subsection heading. Use ### at the start of a line. Example: ### Subsection',
					action: () => onInsert('### ', '\n'),
				},
				{
					key: 'h4',
					icon: 'H4',
					title: 'Heading 4',
					tooltip: 'Sub-subsection heading. Use #### at the start of a line.',
					action: () => onInsert('#### ', '\n'),
				},
			],
		},
		{
			group: 'Links & Media',
			items: [
				{
					key: 'link',
					icon: '🔗',
					title: 'Link',
					tooltip:
						'Insert a hyperlink. Format: [link text](URL). Example: [GitHub](https://github.com)',
					action: () => onInsert('[', '](https://)'),
					shortcut: 'Ctrl+K',
				},
				{
					key: 'image',
					icon: '🖼️',
					title: 'Image',
					tooltip:
						'Embed an image. Format: ![alt text](image URL). Example: ![Logo](https://example.com/logo.png)',
					action: () => onInsert('![', '](https://)'),
				},
				{
					key: 'video',
					icon: '📹',
					title: 'Video/HTML',
					tooltip: 'Embed video or HTML content. You can use HTML tags directly in markdown.',
					action: () =>
						onInsert(
							'<video width="320" height="240" controls>\n  <source src="',
							'" type="video/mp4">\n</video>',
						),
				},
				{
					key: 'footnote',
					icon: <span>[^1]</span>,
					title: 'Footnote',
					tooltip: 'Add a footnote reference. Example: [^1] then define it as [^1]: Footnote text',
					action: () => onInsert('[^', ']'),
				},
			],
		},
		{
			group: 'Lists',
			items: [
				{
					key: 'ul',
					icon: '•',
					title: 'Bullet List',
					tooltip:
						'Create an unordered list. Use - or * at the start of each line. Indent for nested lists.',
					action: () => onInsert('- ', '\n- '),
				},
				{
					key: 'ol',
					icon: '1.',
					title: 'Numbered List',
					tooltip: 'Create an ordered list. Use 1. 2. 3. etc. at the start of each line.',
					action: () => onInsert('1. ', '\n2. '),
				},
				{
					key: 'task',
					icon: '☑',
					title: 'Task List',
					tooltip: 'Create a checklist. Use - [ ] for unchecked, - [x] for checked items.',
					action: () => onInsert('- [ ] ', '\n- [ ] '),
				},
				{
					key: 'indent',
					icon: '→',
					title: 'Indent',
					tooltip: 'Indent list item or create nested list. Add 2 spaces before the list marker.',
					action: () => onInsert('  ', ''),
				},
			],
		},
		{
			group: 'Blocks',
			items: [
				{
					key: 'quote',
					icon: '❝',
					title: 'Blockquote',
					tooltip: 'Quote text. Use > at the start of lines. Use >> for nested quotes.',
					action: () => onInsert('> ', '\n'),
				},
				{
					key: 'codeblock',
					icon: '{ }',
					title: 'Code Block',
					tooltip:
						'Format code with syntax highlighting. Use ``` followed by language name (js, python, etc).',
					action: () => onInsert('```javascript\n', '\n```'),
				},
				{
					key: 'table',
					icon: '⊞',
					title: 'Table',
					tooltip:
						'Insert a table. Use | to separate columns, --- for headers. Align with :--- :---: ---:',
					action: () =>
						onInsert(
							'| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Left | Center | Right |\n| Cell | Cell | Cell |',
							'',
						),
				},
				{
					key: 'hr',
					icon: '─',
					title: 'Horizontal Rule',
					tooltip: 'Insert a horizontal divider. Use --- or *** on its own line.',
					action: () => onInsert('\n---\n', ''),
				},
				{
					key: 'math',
					icon: '∑',
					title: 'Math Formula',
					tooltip:
						'Insert LaTeX math formula. Use $ for inline, $$ for block math. Example: $x^2 + y^2 = z^2$',
					action: () => onInsert('$$\n', '\n$$'),
				},
			],
		},
		{
			group: 'Advanced',
			items: [
				{
					key: 'details',
					icon: '▶️',
					title: 'Collapsible Section',
					tooltip: 'Create an expandable/collapsible section using <details> and <summary> tags.',
					action: () =>
						onInsert('<details>\n<summary>Click to expand</summary>\n\n', '\n\n</details>'),
				},
				{
					key: 'comment',
					icon: '<!--',
					title: 'Comment',
					tooltip: "Add a hidden comment that won't appear in the rendered output.",
					action: () => onInsert('<!-- ', ' -->'),
				},
				{
					key: 'emoji',
					icon: '😊',
					title: 'Emoji',
					tooltip: 'Insert emoji using :shortcode: format. Example: :smile: :heart: :thumbsup:',
					action: () => onInsert(':', ':'),
				},
				{
					key: 'kbd',
					icon: '⌨️',
					title: 'Keyboard Key',
					tooltip: 'Show keyboard keys. Example: <kbd>Ctrl</kbd>+<kbd>C</kbd>',
					action: () => onInsert('<kbd>', '</kbd>'),
				},
				{
					key: 'toc',
					icon: '📑',
					title: 'Table of Contents',
					tooltip:
						'Insert a placeholder for table of contents. Use [[TOC]] or generate from headings.',
					action: () => onInsert('\n## Table of Contents\n\n', '\n'),
				},
			],
		},
	];

	return (
		<div className="toolbar">
			{toolbar.map((group, idx) => (
				<React.Fragment key={group.group}>
					<div className="toolbar-group">
						{group.items.map((item) => (
							<button
								key={item.key}
								type="button"
								onClick={item.action}
								className="toolbar-button"
								title={item.tooltip || `${item.title}${item.shortcut ? ` (${item.shortcut})` : ''}`}
								disabled={!activeFile}
							>
								{item.icon}
							</button>
						))}
					</div>
					{idx < toolbar.length - 1 && <div className="toolbar-divider" />}
				</React.Fragment>
			))}
		</div>
	);
};

/**
 * Resolves the Prettier parser name for a given file extension.
 * @param {string} ext - Lowercase file extension (without dot)
 * @returns {{ parser: string, plugins?: string[] } | null} Prettier config or null if unsupported
 */
const getPrettierConfig = (ext) => {
	const map = {
		js: { parser: 'babel' },
		jsx: { parser: 'babel' },
		mjs: { parser: 'babel' },
		ts: { parser: 'typescript' },
		tsx: { parser: 'typescript' },
		css: { parser: 'css' },
		scss: { parser: 'scss' },
		less: { parser: 'less' },
		html: { parser: 'html' },
		htm: { parser: 'html' },
		json: { parser: 'json' },
		json5: { parser: 'json5' },
		yaml: { parser: 'yaml' },
		yml: { parser: 'yaml' },
		md: { parser: 'markdown' },
		markdown: { parser: 'markdown' },
		mdx: { parser: 'mdx' },
		graphql: { parser: 'graphql' },
		gql: { parser: 'graphql' },
	};
	return map[ext] || null;
};

/**
 * Main GistEditor Component with Enhanced Split Panel
 */
const GistEditor = () => {
	const [gist, setGist] = useState({
		description: '',
		files: { untitled: { content: '' } },
		public: false,
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [previewMode, setPreviewMode] = useState('split');
	const [wrapText, setWrapText] = useState(true);
	const [activeFile, setActiveFile] = useState(null);
	const [editingTab, setEditingTab] = useState(null);
	const [editingName, setEditingName] = useState('');
	const [formatting, setFormatting] = useState(false);

	const { id } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();
	const toast = useToast();

	const editorRef = useRef(null);
	const previewRef = useRef(null);
	const tabInputRef = useRef(null);

	// Debounce preview content so large markdown doesn't block the editor
	const [debouncedContent, setDebouncedContent] = useState('');
	const debounceTimer = useRef(null);

	const currentFileContent = activeFile ? gist.files[activeFile]?.content || '' : '';

	useEffect(() => {
		if (previewMode !== 'split') return;
		clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => {
			setDebouncedContent(currentFileContent);
		}, 300);
		return () => clearTimeout(debounceTimer.current);
	}, [currentFileContent, previewMode]);

	const fetchGist = useCallback(
		async (gistId) => {
			try {
				setLoading(true);
				setError(null);
				const data = await getGist(gistId, token, setError);
				setGist(data);
				setActiveFile(Object.keys(data.files)[0]);
			} catch (err) {
				logError('Failed to fetch gist', err);
				setError('Failed to fetch gist. Please try again later.');
			} finally {
				setLoading(false);
			}
		},
		[token],
	);

	useEffect(() => {
		if (id) {
			fetchGist(id);
		} else {
			setActiveFile('untitled');
			setEditingTab('untitled');
			setEditingName('untitled');
		}
	}, [id, fetchGist]);

	useEffect(() => {
		if (gist && Object.keys(gist.files).length && !activeFile) {
			setActiveFile(Object.keys(gist.files)[0]);
		}
	}, [gist, activeFile]);

	// Auto-focus the tab input when entering edit mode
	useEffect(() => {
		if (editingTab && tabInputRef.current) {
			tabInputRef.current.focus();
			tabInputRef.current.select();
		}
	}, [editingTab]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!Object.keys(gist.files).length) {
			setError('Your gist must contain at least one non-empty file!');
			return;
		}
		if (Object.values(gist.files).some((f) => !f.content.trim())) {
			setError('All files must be non-empty!');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			if (id) {
				await updateGist(id, gist, token, setError, user?.id);
				toast.success('Gist updated successfully!');
			} else {
				const newG = await createGist(gist, token, setError, user?.id);
				toast.success('Gist created successfully!');
				navigate(`/gist/${newG.id}`);
			}
		} catch (err) {
			logError('Failed to save gist', err);
			toast.error('Failed to save gist. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleDescriptionChange = (e) =>
		setGist((prev) => ({ ...prev, description: e.target.value }));
	const handlePublicChange = (e) => setGist((prev) => ({ ...prev, public: e.target.checked }));

	const handleFileChange = useCallback((fileName, content) => {
		setGist((prev) => ({ ...prev, files: { ...prev.files, [fileName]: { content } } }));
	}, []);

	/**
	 * Renames a file in the gist state, preserving key order.
	 * @param {string} oldName - Current filename
	 * @param {string} newName - Desired filename
	 */
	const renameFile = useCallback(
		(oldName, newName) => {
			const trimmed = newName.trim();
			if (!trimmed || trimmed === oldName) return;
			if (gist.files[trimmed]) {
				setError(`A file named "${trimmed}" already exists.`);
				return;
			}

			setGist((prev) => {
				const rebuilt = {};
				for (const [key, value] of Object.entries(prev.files)) {
					if (key === oldName) {
						rebuilt[trimmed] = value;
					} else {
						rebuilt[key] = value;
					}
				}
				return { ...prev, files: rebuilt };
			});

			if (activeFile === oldName) {
				setActiveFile(trimmed);
			}
		},
		[gist.files, activeFile],
	);

	/**
	 * Commits the current tab rename and exits edit mode.
	 */
	const commitTabRename = useCallback(() => {
		if (editingTab) {
			renameFile(editingTab, editingName);
			setEditingTab(null);
			setEditingName('');
		}
	}, [editingTab, editingName, renameFile]);

	const addNewFile = () => {
		let name = 'untitled',
			i = 1;
		while (gist.files[name]) name = `untitled_${i++}`;
		setGist((prev) => ({ ...prev, files: { ...prev.files, [name]: { content: '' } } }));
		setActiveFile(name);
		setEditingTab(name);
		setEditingName(name);
	};

	const removeFile = (fn) => {
		if (Object.keys(gist.files).length <= 1) {
			setError('Cannot remove the only file.');
			return;
		}
		const files = { ...gist.files };
		delete files[fn];
		setGist((prev) => ({ ...prev, files }));
		if (activeFile === fn) setActiveFile(Object.keys(files)[0]);
	};

	/**
	 * Formats the active file content using Prettier (loaded on demand).
	 */
	const formatActiveFile = useCallback(async () => {
		if (!activeFile) return;
		const ext = activeFile.includes('.') ? activeFile.split('.').pop().toLowerCase() : '';
		const config = getPrettierConfig(ext);
		if (!config) {
			toast.error(`No formatter available for .${ext || '(no extension)'} files.`);
			return;
		}

		setFormatting(true);
		try {
			const prettier = await import('prettier/standalone');
			const plugins = [];

			if (['babel', 'babel-ts'].includes(config.parser) || config.parser === 'typescript') {
				const mod = await import('prettier/plugins/babel');
				plugins.push(mod.default || mod);
				const estree = await import('prettier/plugins/estree');
				plugins.push(estree.default || estree);
				if (config.parser === 'typescript') {
					const tsMod = await import('prettier/plugins/typescript');
					plugins.push(tsMod.default || tsMod);
				}
			} else if (['css', 'scss', 'less'].includes(config.parser)) {
				const mod = await import('prettier/plugins/postcss');
				plugins.push(mod.default || mod);
			} else if (config.parser === 'html') {
				const mod = await import('prettier/plugins/html');
				plugins.push(mod.default || mod);
			} else if (['markdown', 'mdx'].includes(config.parser)) {
				const mod = await import('prettier/plugins/markdown');
				plugins.push(mod.default || mod);
			} else if (['yaml'].includes(config.parser)) {
				const mod = await import('prettier/plugins/yaml');
				plugins.push(mod.default || mod);
			} else if (['graphql'].includes(config.parser)) {
				const mod = await import('prettier/plugins/graphql');
				plugins.push(mod.default || mod);
			} else if (['json', 'json5'].includes(config.parser)) {
				const estree = await import('prettier/plugins/estree');
				plugins.push(estree.default || estree);
				const mod = await import('prettier/plugins/babel');
				plugins.push(mod.default || mod);
			}

			const formatted = await prettier.format(currentFileContent, {
				parser: config.parser,
				plugins,
				useTabs: true,
				tabWidth: 2,
				printWidth: 100,
				singleQuote: true,
				trailingComma: 'all',
			});
			handleFileChange(activeFile, formatted);
			toast.success('Formatted');
		} catch (err) {
			logError('Prettier format failed', err);
			toast.error(`Format failed: ${err.message}`);
		} finally {
			setFormatting(false);
		}
	}, [activeFile, currentFileContent, handleFileChange, toast]);

	const syncScroll = useCallback(
		(e) => {
			if (previewMode !== 'split') return;
			const src = e.target;
			const dst = src === editorRef.current ? previewRef.current : editorRef.current;
			if (dst) {
				window.requestAnimationFrame(() => {
					const ratio = src.scrollTop / (src.scrollHeight - src.clientHeight || 1);
					dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
				});
			}
		},
		[previewMode],
	);

	const insertText = useCallback(
		(before, after = '') => {
			if (!editorRef.current || !activeFile) return;
			const ta = editorRef.current;
			const { selectionStart: s, selectionEnd: e, value } = ta;
			const sel = value.slice(s, e);
			const txt = before + sel + after;
			const newPos = sel ? s + before.length + sel.length + after.length : s + before.length;
			handleFileChange(activeFile, value.slice(0, s) + txt + value.slice(e));
			setTimeout(() => {
				ta.focus();
				ta.setSelectionRange(newPos, newPos);
			}, 0);
		},
		[activeFile, handleFileChange],
	);

	useEffect(() => {
		const onKeyDown = (e) => {
			// Shift+Alt+F: format active file (works globally in editor)
			if (e.shiftKey && e.altKey && e.key === 'F') {
				e.preventDefault();
				formatActiveFile();
				return;
			}
			if (document.activeElement !== editorRef.current) return;
			if (e.metaKey || e.ctrlKey) {
				switch (e.key) {
					case 'b':
						e.preventDefault();
						insertText('**', '**');
						break;
					case 'i':
						e.preventDefault();
						insertText('*', '*');
						break;
					case 'k':
						e.preventDefault();
						insertText('[', '](https://)');
						break;
					case '`':
						e.preventDefault();
						insertText('`', '`');
						break;
					case '/':
						e.preventDefault();
						setPreviewMode((pm) => (pm === 'split' ? 'editor' : 'split'));
						break;
					default:
						break;
				}
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [insertText, formatActiveFile]);

	const isMarkdownFile = (fn) => fn?.match(/\.(md|markdown|mdx)$/i);
	const getFileLanguage = (fn) => {
		const ext = fn.split('.').pop().toLowerCase();
		const map = {
			js: 'javascript',
			mjs: 'javascript',
			cjs: 'javascript',
			jsx: 'jsx',
			ts: 'typescript',
			tsx: 'tsx',
			py: 'python',
			rb: 'ruby',
			java: 'java',
			go: 'go',
			rs: 'rust',
			c: 'c',
			cpp: 'cpp',
			h: 'c',
			hpp: 'cpp',
			cs: 'csharp',
			swift: 'swift',
			kt: 'kotlin',
			html: 'html',
			htm: 'html',
			css: 'css',
			scss: 'scss',
			less: 'less',
			json: 'json',
			yaml: 'yaml',
			yml: 'yaml',
			toml: 'toml',
			xml: 'xml',
			sql: 'sql',
			graphql: 'graphql',
			gql: 'graphql',
			sh: 'bash',
			bash: 'bash',
			zsh: 'bash',
			fish: 'bash',
			ps1: 'powershell',
			dockerfile: 'docker',
			tf: 'hcl',
			lua: 'lua',
			r: 'r',
			php: 'php',
			pl: 'perl',
			ex: 'elixir',
			exs: 'elixir',
			erl: 'erlang',
			hs: 'haskell',
			txt: 'text',
		};
		return map[ext] || 'text';
	};

	/** @returns {boolean} Whether the active file has a Prettier-supported extension */
	const canFormat = activeFile
		? getPrettierConfig(activeFile.includes('.') ? activeFile.split('.').pop().toLowerCase() : '')
		: null;

	// Add page class to body for layout targeting
	useEffect(() => {
		document.body.classList.add('gist-editor-page');
		return () => document.body.classList.remove('gist-editor-page');
	}, []);

	if (!user)
		return (
			<div className="p-6 bg-surface rounded shadow-md text-center">
				Please log in to edit gists.
			</div>
		);

	if (loading && id)
		return <div className="p-6 bg-surface rounded shadow-md text-center">Loading...</div>;

	return (
		<form onSubmit={handleSubmit} className="gist-editor-form">
			{/* Compact Header */}
			<div className="form-header-compact">
				<input
					type="text"
					id="description"
					value={gist.description}
					onChange={handleDescriptionChange}
					placeholder="Gist description (optional)"
					className="description-input"
				/>
				<div className="header-options">
					<label className="checkbox-compact">
						<input type="checkbox" checked={gist.public} onChange={handlePublicChange} />
						<span>Public</span>
					</label>
				</div>
			</div>

			{/* Messages */}
			{error && <ErrorState message={error} variant="inline" />}

			{/* Controls */}
			<div className="buttons-container">
				<button
					type="button"
					onClick={addNewFile}
					className="button secondary"
					title="Add a new file"
				>
					<svg
						className="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					Add File
				</button>
				<button
					type="button"
					onClick={() => setPreviewMode((pm) => (pm === 'split' ? 'editor' : 'split'))}
					className="button secondary"
					title={
						previewMode === 'split' ? 'Editor only mode (Ctrl+/)' : 'Split preview mode (Ctrl+/)'
					}
				>
					{previewMode === 'split' ? 'Editor Only' : 'Split Preview'}
				</button>
				{id && (
					<Link to={`/view/${id}`} className="button secondary" title="View in reader mode">
						<svg
							className="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						</svg>
						View
					</Link>
				)}
				<button
					type="submit"
					className="button primary"
					disabled={loading}
					title="Save the current gist"
				>
					{loading ? 'Saving...' : id ? 'Update Gist' : 'Create Gist'}
				</button>
				<div className="ml-auto">
					<label className="wrap-text">
						<input type="checkbox" checked={wrapText} onChange={() => setWrapText((w) => !w)} />
						<span>Wrap Text</span>
					</label>
				</div>
			</div>

			{/* File Tabs */}
			<div className="file-tabs">
				<div className="tabs-container">
					{Object.keys(gist.files).map((filename) => (
						<button
							key={filename}
							type="button"
							onClick={() => setActiveFile(filename)}
							onDoubleClick={() => {
								setEditingTab(filename);
								setEditingName(filename);
							}}
							className={`tab ${activeFile === filename ? 'active' : ''}`}
							title="Double-click to rename"
						>
							{editingTab === filename ? (
								<input
									ref={tabInputRef}
									type="text"
									value={editingName}
									onChange={(e) => setEditingName(e.target.value)}
									onBlur={commitTabRename}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											commitTabRename();
										} else if (e.key === 'Escape') {
											setEditingTab(null);
											setEditingName('');
										}
									}}
									onClick={(e) => e.stopPropagation()}
									className="tab-rename-input"
									aria-label={`Rename file ${filename}`}
								/>
							) : (
								filename
							)}
							{Object.keys(gist.files).length > 1 && editingTab !== filename && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										removeFile(filename);
									}}
									className="tab-close"
									title={`Remove file ${filename}`}
									aria-label={`Remove file ${filename}`}
								>
									x
								</button>
							)}
						</button>
					))}
				</div>
			</div>

			{/* Toolbar -- context-sensitive based on file type */}
			{activeFile && isMarkdownFile(activeFile) ? (
				<MarkdownToolbar onInsert={insertText} activeFile={activeFile} />
			) : (
				<div className="toolbar">
					<div className="toolbar-group">
						<button
							type="button"
							onClick={formatActiveFile}
							className="toolbar-button format-button"
							disabled={!activeFile || !canFormat || formatting}
							title={
								canFormat
									? `Format file (Shift+Alt+F)`
									: 'No formatter available for this file type'
							}
						>
							{formatting ? '...' : '{ }'}
						</button>
						<span className="toolbar-label">
							{formatting ? 'Formatting...' : 'Format'}
						</span>
					</div>
					{activeFile && (
						<span className="toolbar-file-type">
							{getFileLanguage(activeFile)}
						</span>
					)}
				</div>
			)}

			{/* Editor & Preview */}
			{activeFile && (
				<div className={`editor-container ${previewMode === 'split' ? 'split-view' : ''}`}>
					{previewMode === 'split' ? (
						<ResizablePanelGroup direction="horizontal" className="h-full">
							<ResizablePanel defaultSize={50} minSize={20}>
								<div className="editor-panel h-full">
									<textarea
										ref={editorRef}
										value={currentFileContent}
										onChange={(e) => handleFileChange(activeFile, e.target.value)}
										onScroll={syncScroll}
										className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
										placeholder="Enter file content here..."
										aria-label={`Editor for ${activeFile}`}
									/>
								</div>
							</ResizablePanel>
							<ResizableHandle withHandle />
							<ResizablePanel defaultSize={50} minSize={20}>
								<div ref={previewRef} className="preview-panel h-full">
									<div className="preview" onScroll={syncScroll}>
										{isMarkdownFile(activeFile) ? (
											debouncedContent ? (
												<MarkdownPreview content={debouncedContent} />
											) : (
												<div>Enter some markdown content...</div>
											)
										) : (
											<SyntaxHighlighter
												language={getFileLanguage(activeFile)}
												style={tomorrow}
												className="syntax-highlighter"
											>
												{debouncedContent}
											</SyntaxHighlighter>
										)}
									</div>
								</div>
							</ResizablePanel>
						</ResizablePanelGroup>
					) : (
						<div className="editor-panel" style={{ width: '100%', height: '100%' }}>
							<textarea
								ref={editorRef}
								value={currentFileContent}
								onChange={(e) => handleFileChange(activeFile, e.target.value)}
								onScroll={syncScroll}
								className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
								placeholder="Enter file content here..."
								aria-label={`Editor for ${activeFile}`}
							/>
						</div>
					)}
				</div>
			)}
		</form>
	);
};

export default GistEditor;
