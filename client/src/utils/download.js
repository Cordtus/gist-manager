/**
 * Download Utilities
 * Provides functions for file downloads and clipboard operations.
 * @module utils/download
 */

/**
 * Downloads content as a file to the user's device.
 * @param {string} content - The file content to download
 * @param {string} filename - The name for the downloaded file
 * @param {string} [mimeType='text/plain'] - MIME type of the content
 */
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

/**
 * Copies text to the clipboard.
 * @param {string} text - The text to copy
 * @returns {Promise<boolean>} - True if copy succeeded, false otherwise
 */
export const copyToClipboard = async (text) => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (error) {
		// Fallback for older browsers
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
			return true;
		} catch {
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
};

/**
 * Generates a shareable URL for a gist or specific file.
 * @param {string} gistId - The gist ID
 * @param {string} [filename] - Optional filename for deep linking
 * @returns {string} - The shareable URL
 */
export const getShareableUrl = (gistId, filename) => {
	const baseUrl = window.location.origin;
	if (filename) {
		return `${baseUrl}/view/${gistId}/${encodeURIComponent(filename)}`;
	}
	return `${baseUrl}/view/${gistId}`;
};
