// GistEditor.js - Enhanced split-panel Markdown editor

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { logError } from '../utils/logger';
import MarkdownPreview from './markdown/MarkdownPreview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { ErrorState } from './ui/error-state';
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
					tooltip: 'Make selected text bold. Wrap text with ** on each side. Example: **bold text**',
					action: () => onInsert('**', '**'),
					shortcut: 'Ctrl+B'
				},
				{
					key: 'italic',
					icon: <em>I</em>,
					title: 'Italic text',
					tooltip: 'Make selected text italic. Wrap text with * on each side. Example: *italic text*',
					action: () => onInsert('*', '*'),
					shortcut: 'Ctrl+I'
				},
				{
					key: 'strikethrough',
					icon: <span style={{ textDecoration: 'line-through' }}>S</span>,
					title: 'Strikethrough',
					tooltip: 'Strike through selected text. Wrap with ~~ on each side. Example: ~~deleted text~~',
					action: () => onInsert('~~', '~~')
				},
				{
					key: 'code',
					icon: <code>{`<>`}</code>,
					title: 'Inline code',
					tooltip: 'Format as inline code. Wrap with backticks. Example: `code`',
					action: () => onInsert('`', '`'),
					shortcut: 'Ctrl+`'
				},
				{
					key: 'highlight',
					icon: <mark style={{ padding: '0 2px' }}>H</mark>,
					title: 'Highlight',
					tooltip: 'Highlight selected text. Wrap with == on each side. Example: ==highlighted==',
					action: () => onInsert('==', '==')
				},
				{
					key: 'subscript',
					icon: <span>X<sub>2</sub></span>,
					title: 'Subscript',
					tooltip: 'Format as subscript. Wrap with ~ on each side. Example: H~2~O',
					action: () => onInsert('~', '~')
				},
				{
					key: 'superscript',
					icon: <span>X<sup>2</sup></span>,
					title: 'Superscript',
					tooltip: 'Format as superscript. Wrap with ^ on each side. Example: X^2^',
					action: () => onInsert('^', '^')
				}
			]
		},
		{
			group: 'Headings',
			items: [
				{
					key: 'h1',
					icon: 'H1',
					title: 'Heading 1',
					tooltip: 'Largest heading. Use # at the start of a line. Example: # Main Title',
					action: () => onInsert('# ', '\n')
				},
				{
					key: 'h2',
					icon: 'H2',
					title: 'Heading 2',
					tooltip: 'Section heading. Use ## at the start of a line. Example: ## Section Title',
					action: () => onInsert('## ', '\n')
				},
				{
					key: 'h3',
					icon: 'H3',
					title: 'Heading 3',
					tooltip: 'Subsection heading. Use ### at the start of a line. Example: ### Subsection',
					action: () => onInsert('### ', '\n')
				},
				{
					key: 'h4',
					icon: 'H4',
					title: 'Heading 4',
					tooltip: 'Sub-subsection heading. Use #### at the start of a line.',
					action: () => onInsert('#### ', '\n')
				}
			]
		},
		{
			group: 'Links & Media',
			items: [
				{
					key: 'link',
					icon: '🔗',
					title: 'Link',
					tooltip: 'Insert a hyperlink. Format: [link text](URL). Example: [GitHub](https://github.com)',
					action: () => onInsert('[', '](https://)'),
					shortcut: 'Ctrl+K'
				},
				{
					key: 'image',
					icon: '🖼️',
					title: 'Image',
					tooltip: 'Embed an image. Format: ![alt text](image URL). Example: ![Logo](https://example.com/logo.png)',
					action: () => onInsert('![', '](https://)')
				},
				{
					key: 'video',
					icon: '📹',
					title: 'Video/HTML',
					tooltip: 'Embed video or HTML content. You can use HTML tags directly in markdown.',
					action: () => onInsert('<video width="320" height="240" controls>\n  <source src="', '" type="video/mp4">\n</video>')
				},
				{
					key: 'footnote',
					icon: <span>[^1]</span>,
					title: 'Footnote',
					tooltip: 'Add a footnote reference. Example: [^1] then define it as [^1]: Footnote text',
					action: () => onInsert('[^', ']')
				}
			]
		},
		{
			group: 'Lists',
			items: [
				{
					key: 'ul',
					icon: '•',
					title: 'Bullet List',
					tooltip: 'Create an unordered list. Use - or * at the start of each line. Indent for nested lists.',
					action: () => onInsert('- ', '\n- ')
				},
				{
					key: 'ol',
					icon: '1.',
					title: 'Numbered List',
					tooltip: 'Create an ordered list. Use 1. 2. 3. etc. at the start of each line.',
					action: () => onInsert('1. ', '\n2. ')
				},
				{
					key: 'task',
					icon: '☑',
					title: 'Task List',
					tooltip: 'Create a checklist. Use - [ ] for unchecked, - [x] for checked items.',
					action: () => onInsert('- [ ] ', '\n- [ ] ')
				},
				{
					key: 'indent',
					icon: '→',
					title: 'Indent',
					tooltip: 'Indent list item or create nested list. Add 2 spaces before the list marker.',
					action: () => onInsert('  ', '')
				}
			]
		},
		{
			group: 'Blocks',
			items: [
				{
					key: 'quote',
					icon: '❝',
					title: 'Blockquote',
					tooltip: 'Quote text. Use > at the start of lines. Use >> for nested quotes.',
					action: () => onInsert('> ', '\n')
				},
				{
					key: 'codeblock',
					icon: '{ }',
					title: 'Code Block',
					tooltip: 'Format code with syntax highlighting. Use ``` followed by language name (js, python, etc).',
					action: () => onInsert('```javascript\n', '\n```')
				},
				{
					key: 'table',
					icon: '⊞',
					title: 'Table',
					tooltip: 'Insert a table. Use | to separate columns, --- for headers. Align with :--- :---: ---:',
					action: () =>
						onInsert(
							'| Header 1 | Header 2 | Header 3 |\n| :--- | :---: | ---: |\n| Left | Center | Right |\n| Cell | Cell | Cell |',
							''
						)
				},
				{
					key: 'hr',
					icon: '─',
					title: 'Horizontal Rule',
					tooltip: 'Insert a horizontal divider. Use --- or *** on its own line.',
					action: () => onInsert('\n---\n', '')
				},
				{
					key: 'math',
					icon: '∑',
					title: 'Math Formula',
					tooltip: 'Insert LaTeX math formula. Use $ for inline, $$ for block math. Example: $x^2 + y^2 = z^2$',
					action: () => onInsert('$$\n', '\n$$')
				}
			]
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
						onInsert(
							'<details>\n<summary>Click to expand</summary>\n\n',
							'\n\n</details>'
						)
				},
				{
					key: 'comment',
					icon: '<!--',
					title: 'Comment',
					tooltip: 'Add a hidden comment that won\'t appear in the rendered output.',
					action: () => onInsert('<!-- ', ' -->')
				},
				{
					key: 'emoji',
					icon: '😊',
					title: 'Emoji',
					tooltip: 'Insert emoji using :shortcode: format. Example: :smile: :heart: :thumbsup:',
					action: () => onInsert(':', ':')
				},
				{
					key: 'kbd',
					icon: '⌨️',
					title: 'Keyboard Key',
					tooltip: 'Show keyboard keys. Example: <kbd>Ctrl</kbd>+<kbd>C</kbd>',
					action: () => onInsert('<kbd>', '</kbd>')
				},
				{
					key: 'toc',
					icon: '📑',
					title: 'Table of Contents',
					tooltip: 'Insert a placeholder for table of contents. Use [[TOC]] or generate from headings.',
					action: () => onInsert('\n## Table of Contents\n\n', '\n')
				}
			]
		}
	];

	return (
		<div className="toolbar">
			{toolbar.map((group, idx) => (
				<React.Fragment key={group.group}>
					<div className="toolbar-group">
						{group.items.map(item => (
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
 * Main GistEditor Component with Enhanced Split Panel
 */
const GistEditor = () => {
	const [gist, setGist] = useState({
		description: '',
		files: { 'newfile.md': { content: '' } },
		public: false
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [previewMode, setPreviewMode] = useState('split');
	const [wrapText, setWrapText] = useState(true);
	const editorHeight = typeof window !== 'undefined' ? window.innerHeight - 300 : 500;
	const [activeFile, setActiveFile] = useState(null);

	const { id } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();
	const toast = useToast();

	const editorRef = useRef(null);
	const previewRef = useRef(null);

	const fetchGist = useCallback(async gistId => {
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
	}, [token]);

	useEffect(() => {
		if (id) {
			fetchGist(id);
		} else {
			setActiveFile('newfile.md');
		}
	}, [id, fetchGist]);

	useEffect(() => {
		if (gist && Object.keys(gist.files).length && !activeFile) {
			setActiveFile(Object.keys(gist.files)[0]);
		}
	}, [gist, activeFile]);


	const handleSubmit = async e => {
		e.preventDefault();
		if (!Object.keys(gist.files).length) {
			setError('Your gist must contain at least one non-empty file!');
			return;
		}
		if (Object.values(gist.files).some(f => !f.content.trim())) {
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

	const handleDescriptionChange = e => setGist(prev => ({ ...prev, description: e.target.value }));
	const handlePublicChange = e => setGist(prev => ({ ...prev, public: e.target.checked }));

	const handleFileChange = useCallback((fileName, content) => {
		setGist(prev => ({ ...prev, files: { ...prev.files, [fileName]: { content } } }));
	}, []);

	const addNewFile = () => {
		let name = 'newfile.md', i = 1;
		while (gist.files[name]) name = `newfile_${i++}.md`;
		setGist(prev => ({ ...prev, files: { ...prev.files, [name]: { content: '' } } }));
		setActiveFile(name);
	};

	const removeFile = fn => {
		if (Object.keys(gist.files).length <= 1) {
			setError('Cannot remove the only file.');
			return;
		}
		const files = { ...gist.files };
		delete files[fn];
		setGist(prev => ({ ...prev, files }));
		if (activeFile === fn) setActiveFile(Object.keys(files)[0]);
	};

	const syncScroll = useCallback(e => {
		if (previewMode !== 'split') return;
		const src = e.target;
		const dst = src === editorRef.current ? previewRef.current : editorRef.current;
		if (dst) {
			window.requestAnimationFrame(() => {
				const ratio = src.scrollTop / ((src.scrollHeight - src.clientHeight) || 1);
				dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
			});
		}
	}, [previewMode]);

	const insertText = useCallback((before, after = '') => {
		if (!editorRef.current || !activeFile) return;
		const ta = editorRef.current;
		const { selectionStart: s, selectionEnd: e, value } = ta;
		const sel = value.slice(s, e);
		const txt = before + sel + after;
		const newPos = sel ? s + before.length + sel.length + after.length : s + before.length;
		handleFileChange(activeFile, value.slice(0, s) + txt + value.slice(e));
		setTimeout(() => { ta.focus(); ta.setSelectionRange(newPos, newPos); }, 0);
	}, [activeFile, handleFileChange]);

	useEffect(() => {
		const onKeyDown = e => {
			if (document.activeElement !== editorRef.current) return;
			if (e.metaKey || e.ctrlKey) {
				switch (e.key) {
					case 'b': e.preventDefault(); insertText('**', '**'); break;
					case 'i': e.preventDefault(); insertText('*', '*'); break;
					case 'k': e.preventDefault(); insertText('[', '](https://)'); break;
					case '`': e.preventDefault(); insertText('`', '`'); break;
					case '/': e.preventDefault();
						setPreviewMode(pm => pm === 'split' ? 'editor' : 'split');
						break;
					default: break;
				}
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [insertText]);

	const isMarkdownFile = fn => fn?.match(/\.(md|markdown|mdx)$/i);
	const getFileLanguage = fn => {
		const ext = fn.split('.').pop().toLowerCase();
		const map = {
			js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx', py: 'python',
			rb: 'ruby', java: 'java', go: 'go', html: 'html', css: 'css', scss: 'scss',
			json: 'json', yaml: 'yaml', yml: 'yaml', sh: 'bash', txt: 'text'
		};
		return map[ext] || 'text';
	};

	if (!user) return (
		<div className="p-6 bg-surface rounded shadow-md text-center">
			Please log in to edit gists.
		</div>
	);

	if (loading && id) return (
		<div className="p-6 bg-surface rounded shadow-md text-center">Loading...</div>
	);

	const currentFileContent = activeFile ? gist.files[activeFile]?.content || '' : '';

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
						<input
							type="checkbox"
							checked={gist.public}
							onChange={handlePublicChange}
						/>
						<span>Public</span>
					</label>
				</div>
			</div>

			{/* Messages */}
			{error && (
				<ErrorState message={error} variant="inline" />
			)}

			{/* Controls */}
			<div className="buttons-container">
				<button
					type="button"
					onClick={addNewFile}
					className="button secondary"
					title="Add a new file"
				>
					<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					Add File
				</button>
				<button
					type="button"
					onClick={() => setPreviewMode(pm => pm === 'split' ? 'editor' : 'split')}
					className="button secondary"
					title={previewMode === 'split' ? 'Editor only mode (Ctrl+/)' : 'Split preview mode (Ctrl+/)'}
				>
					{previewMode === 'split' ? 'Editor Only' : 'Split Preview'}
				</button>
				<button
					type="submit"
					className="button primary"
					disabled={loading}
					title="Save the current gist"
				>
					{loading ? 'Saving...' : (id ? 'Update Gist' : 'Create Gist')}
				</button>
				<div className="ml-auto">
					<label className="wrap-text">
						<input
							type="checkbox"
							checked={wrapText}
							onChange={() => setWrapText(w => !w)}
						/>
						<span>Wrap Text</span>
					</label>
				</div>
			</div>

			{/* File Tabs */}
			<div className="file-tabs">
				<div className="tabs-container">
					{Object.keys(gist.files).map(filename => (
						<button
							key={filename}
							type="button"
							onClick={() => setActiveFile(filename)}
							className={`tab ${activeFile === filename ? 'active' : ''}`}
						>
							{filename}
							{Object.keys(gist.files).length > 1 && (
								<button
									type="button"
									onClick={e => { e.stopPropagation(); removeFile(filename); }}
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

			{/* Toolbar */}
			<MarkdownToolbar onInsert={insertText} activeFile={activeFile} />

			{/* Editor & Preview */}
			{activeFile && (
				<div
					className={`editor-container ${previewMode === 'split' ? 'split-view' : ''}`}
					style={{ height: `${editorHeight}px` }}
				>
					{previewMode === 'split' ? (
						<ResizablePanelGroup direction="horizontal" className="h-full">
							<ResizablePanel defaultSize={50} minSize={20}>
								<div className="editor-panel h-full">
									<textarea
										ref={editorRef}
										value={currentFileContent}
										onChange={e => handleFileChange(activeFile, e.target.value)}
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
										{isMarkdownFile(activeFile)
											? (currentFileContent ? <MarkdownPreview content={currentFileContent} /> : <div>Enter some markdown content...</div>)
											: <SyntaxHighlighter language={getFileLanguage(activeFile)} style={tomorrow} className="syntax-highlighter">
												{currentFileContent}
											</SyntaxHighlighter>
										}
									</div>
								</div>
							</ResizablePanel>
						</ResizablePanelGroup>
					) : (
						<div className="editor-panel" style={{ width: '100%', height: '100%' }}>
							<textarea
								ref={editorRef}
								value={currentFileContent}
								onChange={e => handleFileChange(activeFile, e.target.value)}
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
