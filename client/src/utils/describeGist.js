/**
 * Utility functions for generating gist descriptions and previews
 */

import { generateContentPreview, generateSmartTitle } from './gistTitleGenerator';

/**
 * Infer a description from Markdown content
 * @param {string} content - The content to analyze
 * @param {number} maxWords - Maximum number of words to include
 * @returns {string} - The inferred description
 */
export const inferDescriptionFromMarkdown = (content = '', maxWords = 12) => {
	if (!content || typeof content !== 'string') return '';

	// Remove markdown syntax
	const cleanContent = content
		.replace(/^#+\s*/gm, '') // Remove headers
		.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
		.replace(/\*(.*?)\*/g, '$1') // Remove italic
		.replace(/`(.*?)`/g, '$1') // Remove inline code
		.replace(/```[\s\S]*?```/g, '') // Remove code blocks
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
		.replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
		.replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
		.replace(/>\s*/gm, '') // Remove blockquotes
		.replace(/^\s*---+\s*$/gm, '') // Remove horizontal rules
		.trim();

	if (!cleanContent) return '';

	// Get first meaningful line
	const lines = cleanContent.split('\n').filter((line) => line.trim().length > 0);
	if (lines.length === 0) return '';

	const firstLine = lines[0].trim();
	const words = firstLine.split(/\s+/).slice(0, maxWords);

	return words.join(' ') + (firstLine.split(/\s+/).length > maxWords ? '...' : '');
};

/**
 * Generate a smart preview for a gist based on its files and content
 * @param {Object} gist - The gist object
 * @param {number} maxLength - Maximum length of preview text
 * @returns {Object} - Contains preview text, file info, and language detection
 */
export const generateGistPreview = (gist, maxLength = 100) => {
	if (!gist?.files) {
		return {
			preview: 'No content available',
			fileCount: 0,
			primaryLanguage: 'unknown',
			fileTypes: [],
		};
	}

	const files = Object.entries(gist.files);
	const fileCount = files.length;

	// Detect file types and primary language
	const fileTypes = files.map(([filename]) => {
		const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
		return getFileTypeInfo(ext);
	});

	const languageCounts = {};
	fileTypes.forEach((type) => {
		languageCounts[type.language] = (languageCounts[type.language] || 0) + 1;
	});

	const primaryLanguage =
		Object.entries(languageCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

	// Generate preview text
	let preview = '';
	let generatedTitle = null;

	// If there's a description, use it first
	if (gist.description?.trim()) {
		preview = gist.description.trim();
	} else {
		// Check if we have actual content (from individual gist fetch)
		const [firstFilename, firstFile] = files[0];

		if (firstFile?.content) {
			// We have content - use it for preview
			const content = firstFile.content;

			// For markdown files, use our markdown inference
			if (firstFilename.match(/\.(md|markdown|mdx)$/i)) {
				preview = inferDescriptionFromMarkdown(content, 15);
			} else {
				// For code files, get first meaningful line
				const lines = content.split('\n').filter((line) => {
					const trimmed = line.trim();
					return (
						trimmed.length > 0 &&
						!trimmed.startsWith('//') &&
						!trimmed.startsWith('#') &&
						!trimmed.startsWith('/*') &&
						!trimmed.startsWith('*')
					);
				});

				if (lines.length > 0) {
					preview = lines[0].trim();
				}
			}
		} else {
			// No content available (list view) - generate smart preview
			preview = generateContentPreview(gist.files);
			generatedTitle = generateSmartTitle(gist.files);
		}
	}

	// Truncate if too long
	if (preview.length > maxLength) {
		preview = preview.substring(0, maxLength - 3) + '...';
	}

	return {
		preview: preview || 'No content available',
		fileCount,
		primaryLanguage,
		fileTypes,
		hasDescription: !!gist.description?.trim(),
		generatedTitle,
	};
};

/**
 * Get file type information including language and icon
 * @param {string} extension - File extension
 * @returns {Object} - File type information
 */
export const getFileTypeInfo = (extension) => {
	const typeMap = {
		// Web languages
		js: { language: 'JavaScript', icon: '🟨', category: 'code' },
		jsx: { language: 'React', icon: '⚛️', category: 'code' },
		ts: { language: 'TypeScript', icon: '🔷', category: 'code' },
		tsx: { language: 'React TS', icon: '⚛️', category: 'code' },
		html: { language: 'HTML', icon: '🌐', category: 'web' },
		css: { language: 'CSS', icon: '🎨', category: 'style' },
		scss: { language: 'SCSS', icon: '🎨', category: 'style' },
		sass: { language: 'Sass', icon: '🎨', category: 'style' },
		less: { language: 'Less', icon: '🎨', category: 'style' },

		// Programming languages
		py: { language: 'Python', icon: '🐍', category: 'code' },
		java: { language: 'Java', icon: '☕', category: 'code' },
		cpp: { language: 'C++', icon: '⚡', category: 'code' },
		c: { language: 'C', icon: '⚡', category: 'code' },
		cs: { language: 'C#', icon: '🔹', category: 'code' },
		go: { language: 'Go', icon: '🐹', category: 'code' },
		rs: { language: 'Rust', icon: '🦀', category: 'code' },
		rb: { language: 'Ruby', icon: '💎', category: 'code' },
		php: { language: 'PHP', icon: '🐘', category: 'code' },
		swift: { language: 'Swift', icon: '🍎', category: 'code' },
		kt: { language: 'Kotlin', icon: '🔷', category: 'code' },

		// Data & config
		json: { language: 'JSON', icon: '📋', category: 'data' },
		xml: { language: 'XML', icon: '📄', category: 'data' },
		yaml: { language: 'YAML', icon: '⚙️', category: 'config' },
		yml: { language: 'YAML', icon: '⚙️', category: 'config' },
		toml: { language: 'TOML', icon: '⚙️', category: 'config' },
		ini: { language: 'INI', icon: '⚙️', category: 'config' },
		env: { language: 'Environment', icon: '🔐', category: 'config' },

		// Documentation
		md: { language: 'Markdown', icon: '📝', category: 'docs' },
		markdown: { language: 'Markdown', icon: '📝', category: 'docs' },
		mdx: { language: 'MDX', icon: '📝', category: 'docs' },
		txt: { language: 'Text', icon: '📄', category: 'docs' },

		// Shell & scripts
		sh: { language: 'Shell', icon: '🐚', category: 'script' },
		bash: { language: 'Bash', icon: '🐚', category: 'script' },
		zsh: { language: 'Zsh', icon: '🐚', category: 'script' },
		ps1: { language: 'PowerShell', icon: '💙', category: 'script' },

		// Database
		sql: { language: 'SQL', icon: '🗄️', category: 'database' },

		// Other
		dockerfile: { language: 'Docker', icon: '🐳', category: 'config' },
		gitignore: { language: 'Git', icon: '📋', category: 'config' },
	};

	return (
		typeMap[extension] || {
			language: extension.toUpperCase(),
			icon: '📄',
			category: 'unknown',
		}
	);
};

/**
 * Generate quick actions based on gist content
 * @param {Object} gist - The gist object
 * @returns {Array} - Array of quick action objects
 */
export const getQuickActions = (gist) => {
	const actions = [];
	const preview = generateGistPreview(gist);

	// Based on primary language, suggest relevant actions
	switch (preview.primaryLanguage) {
		case 'JavaScript':
		case 'TypeScript':
			actions.push({ label: 'Run in CodePen', icon: '▶️', action: 'codepen' });
			break;
		case 'Python':
			actions.push({ label: 'Run in Repl', icon: '▶️', action: 'repl' });
			break;
		case 'Markdown':
			actions.push({ label: 'Convert to HTML', icon: '🔄', action: 'convert' });
			break;
		default:
			// No language-specific actions
			break;
	}

	// Always available actions
	actions.push(
		{ label: 'Copy Link', icon: '🔗', action: 'copy-link' },
		{ label: 'Download ZIP', icon: '💾', action: 'download' },
	);

	return actions;
};
