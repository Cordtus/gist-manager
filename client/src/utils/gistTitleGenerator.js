/**
 * Smart title and preview generation for gists
 * Works with limited data from gist list API (no file content)
 */

/**
 * Generate a smart title from filenames when no description exists
 * @param {Object} files - The gist files object
 * @returns {string} - Generated title
 */
export const generateSmartTitle = (files) => {
	if (!files || Object.keys(files).length === 0) {
		return 'Empty Gist';
	}

	const filenames = Object.keys(files);

	// Special case: single file - use its name intelligently
	if (filenames.length === 1) {
		return formatFilenameAsTitle(filenames[0]);
	}

	// Multiple files - list the main ones
	const mainFiles = findMainFiles(filenames);
	if (mainFiles.length > 0) {
		return mainFiles
			.slice(0, 2)
			.map((f) => formatFilenameAsTitle(f))
			.join(' + ');
	}

	// Last resort: first filename
	return formatFilenameAsTitle(filenames[0]);
};

/**
 * Format a filename into a readable title
 * @param {string} filename - The filename
 * @returns {string} - Formatted title
 */
const formatFilenameAsTitle = (filename) => {
	// Remove extension for cleaner look
	const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

	// Handle special files
	const specialFiles = {
		readme: 'README Documentation',
		dockerfile: 'Docker Configuration',
		'docker-compose': 'Docker Compose Setup',
		package: 'Package Configuration',
		gemfile: 'Ruby Dependencies',
		requirements: 'Python Dependencies',
		makefile: 'Build Configuration',
		'.gitignore': 'Git Ignore Rules',
		'.env': 'Environment Variables',
		'.env.example': 'Environment Template',
		app: 'Application',
		main: 'Main Program',
		index: 'Index File',
		config: 'Configuration',
		settings: 'Settings',
		setup: 'Setup Script',
		install: 'Installation Script',
		test: 'Test Suite',
		spec: 'Specifications',
	};

	const lowerName = nameWithoutExt.toLowerCase();
	for (const [key, value] of Object.entries(specialFiles)) {
		if (lowerName.includes(key)) {
			return value;
		}
	}

	// Convert snake_case, kebab-case, or camelCase to Title Case
	return nameWithoutExt
		.replace(/[-_]/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
};

/**
 * Find the most important files in a collection
 * @param {Array} filenames - Array of filenames
 * @returns {Array} - Main files
 */
const findMainFiles = (filenames) => {
	const priorityPatterns = [
		'readme',
		'index',
		'main',
		'app',
		'server',
		'config',
		'package',
		'dockerfile',
		'makefile',
	];

	const mainFiles = [];

	for (const pattern of priorityPatterns) {
		const matches = filenames.filter((f) => f.toLowerCase().includes(pattern));
		mainFiles.push(...matches);
		if (mainFiles.length >= 2) break;
	}

	// If no priority files found, return first few files
	if (mainFiles.length === 0) {
		return filenames.slice(0, 2);
	}

	return [...new Set(mainFiles)]; // Remove duplicates
};

/**
 * Generate a content preview from filenames and metadata
 * @param {Object} files - Gist files object
 * @returns {string} - Preview text
 */
export const generateContentPreview = (files) => {
	if (!files || Object.keys(files).length === 0) {
		return 'Empty gist';
	}

	const filenames = Object.keys(files);
	const fileTypes = new Set();
	let totalSize = 0;

	// Analyze files
	filenames.forEach((filename) => {
		const file = files[filename];
		const ext = filename.split('.').pop()?.toLowerCase();
		if (ext) fileTypes.add(ext);
		if (file.size) totalSize += file.size;
	});

	// Generate descriptive preview
	const parts = [];

	// Mention main file types
	if (fileTypes.size > 0) {
		const types = Array.from(fileTypes).slice(0, 3);
		const typeDescriptions = types.map((ext) => {
			const langMap = {
				js: 'JavaScript',
				py: 'Python',
				rb: 'Ruby',
				go: 'Go',
				rs: 'Rust',
				java: 'Java',
				cpp: 'C++',
				html: 'HTML',
				css: 'CSS',
				md: 'Markdown',
				json: 'JSON',
				yaml: 'YAML',
				toml: 'config',
				sql: 'SQL',
				sh: 'shell script',
			};
			return langMap[ext] || ext.toUpperCase();
		});

		if (typeDescriptions.length === 1) {
			parts.push(`Contains ${typeDescriptions[0]} code`);
		} else {
			parts.push(
				`Contains ${typeDescriptions.slice(0, -1).join(', ')} and ${typeDescriptions.slice(-1)[0]}`,
			);
		}
	}

	// Mention file count
	if (filenames.length === 1) {
		parts.push(`Single file: ${filenames[0]}`);
	} else {
		parts.push(`${filenames.length} files`);

		// List some key files
		const importantFiles = findMainFiles(filenames).slice(0, 2);
		if (importantFiles.length > 0) {
			parts.push(`including ${importantFiles.join(', ')}`);
		}
	}

	// Add size information if significant
	if (totalSize > 10000) {
		parts.push(`(${formatFileSize(totalSize)})`);
	}

	return parts.join(' • ');
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
const formatFileSize = (bytes) => {
	if (bytes < 1024) return bytes + ' bytes';
	if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
