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
const inferDescriptionFromMarkdown = (content = '', maxWords = 12) => {
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
		generatedTitle,
	};
};

/**
 * Get file type information including language and icon
 * @param {string} extension - File extension
 * @returns {Object} - File type information
 */
const getFileTypeInfo = (extension) => {
	const typeMap = {
		// Web languages
		js: { language: 'JavaScript', icon: '🟨' },
		jsx: { language: 'React', icon: '⚛️' },
		ts: { language: 'TypeScript', icon: '🔷' },
		tsx: { language: 'React TS', icon: '⚛️' },
		html: { language: 'HTML', icon: '🌐' },
		css: { language: 'CSS', icon: '🎨' },
		scss: { language: 'SCSS', icon: '🎨' },
		sass: { language: 'Sass', icon: '🎨' },
		less: { language: 'Less', icon: '🎨' },

		// Programming languages
		py: { language: 'Python', icon: '🐍' },
		java: { language: 'Java', icon: '☕' },
		cpp: { language: 'C++', icon: '⚡' },
		c: { language: 'C', icon: '⚡' },
		cs: { language: 'C#', icon: '🔹' },
		go: { language: 'Go', icon: '🐹' },
		rs: { language: 'Rust', icon: '🦀' },
		rb: { language: 'Ruby', icon: '💎' },
		php: { language: 'PHP', icon: '🐘' },
		swift: { language: 'Swift', icon: '🍎' },
		kt: { language: 'Kotlin', icon: '🔷' },

		// Data & config
		json: { language: 'JSON', icon: '📋' },
		xml: { language: 'XML', icon: '📄' },
		yaml: { language: 'YAML', icon: '⚙️' },
		yml: { language: 'YAML', icon: '⚙️' },
		toml: { language: 'TOML', icon: '⚙️' },
		ini: { language: 'INI', icon: '⚙️' },
		env: { language: 'Environment', icon: '🔐' },

		// Documentation
		md: { language: 'Markdown', icon: '📝' },
		markdown: { language: 'Markdown', icon: '📝' },
		mdx: { language: 'MDX', icon: '📝' },
		txt: { language: 'Text', icon: '📄' },

		// Shell & scripts
		sh: { language: 'Shell', icon: '🐚' },
		bash: { language: 'Bash', icon: '🐚' },
		zsh: { language: 'Zsh', icon: '🐚' },
		ps1: { language: 'PowerShell', icon: '💙' },

		// Database
		sql: { language: 'SQL', icon: '🗄️' },

		// Other
		dockerfile: { language: 'Docker', icon: '🐳' },
		gitignore: { language: 'Git', icon: '📋' },
	};

	return (
		typeMap[extension] || {
			language: extension.toUpperCase(),
			icon: '📄',
		}
	);
};
