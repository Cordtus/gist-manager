/**
 * File Service
 * Utilities for converting between file formats, primarily for markdown handling.
 * Uses Turndown for HTML-to-Markdown and Showdown for Markdown-to-HTML conversion.
 * @module services/fileService
 */

import TurndownService from 'turndown';
import showdown from 'showdown';

/** @type {TurndownService} Turndown instance for HTML to Markdown conversion */
const turndownService = new TurndownService();

/** @type {showdown.Converter} Showdown converter with GitHub-flavored markdown support */
const showdownConverter = new showdown.Converter({
	tables: true,
	tasklists: true,
	strikethrough: true,
	ghCodeBlocks: true
});

/**
 * Convert content to Markdown from various formats
 * @param {string} content - The content to convert
 * @param {string} fileExtension - Source file extension (html, txt)
 * @returns {Promise<string>} Converted markdown content
 * @throws {Error} If file type is unsupported
 */
export const convertToMarkdown = async (content, fileExtension) => {
	switch (fileExtension) {
		case 'html':
			return turndownService.turndown(content);
		case 'txt':
			return content;
		default:
			throw new Error('Unsupported file type for conversion to Markdown');
	}
};

/**
 * Convert Markdown content to HTML
 * @param {string} content - Markdown content to convert
 * @param {string} fileExtension - Target file extension (md, mdx)
 * @returns {Promise<string>} Converted HTML content
 * @throws {Error} If file type is unsupported
 */
export const convertFromMarkdown = async (content, fileExtension) => {
	switch (fileExtension) {
		case 'md':
		case 'mdx':
			return showdownConverter.makeHtml(content);
		default:
			throw new Error('Unsupported file type for conversion from Markdown');
	}
};
