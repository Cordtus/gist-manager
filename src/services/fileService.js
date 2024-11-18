// services/fileService.js

import { Marked } from 'marked';
import TurndownService from 'turndown';
import showdown from 'showdown';

const marked = new Marked();
const turndownService = new TurndownService();
const showdownConverter = new showdown.Converter();

export const convertToMarkdown = async (content, fileExtension) => {
  switch (fileExtension) {
    case 'html':
      return turndownService.turndown(content);
    case 'txt':
      return content; // Plain text can be treated as Markdown
    default:
      throw new Error('Unsupported file type for conversion to Markdown');
  }
};

export const convertFromMarkdown = async (content, fileExtension) => {
  switch (fileExtension) {
    case 'md':
      return marked.parse(content);
    case 'mdx':
      return showdownConverter.makeHtml(content);
    default:
      throw new Error('Unsupported file type for conversion from Markdown');
  }
};