// FileConverter.js
// A file format converter supporting Markdown, HTML, and Plain Text.

import React, { useState } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import showdown from 'showdown';

const turndownService = new TurndownService();
const showdownConverter = new showdown.Converter();

const FileConverter = () => {
  const [inputContent, setInputContent] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const [inputFormat, setInputFormat] = useState('markdown');
  const [outputFormat, setOutputFormat] = useState('html');

  const handleConvert = () => {
    if (inputFormat === outputFormat) {
      setOutputContent(inputContent);
      return;
    }

    if (inputFormat === 'markdown' && outputFormat === 'html') {
      setOutputContent(marked(inputContent));
    } else if (inputFormat === 'html' && outputFormat === 'markdown') {
      setOutputContent(turndownService.turndown(inputContent));
    } else if (inputFormat === 'markdown' && outputFormat === 'plaintext') {
      setOutputContent(showdownConverter.makeHtml(inputContent).replace(/<[^>]*>/g, ''));
    } else if (inputFormat === 'html' && outputFormat === 'plaintext') {
      setOutputContent(inputContent.replace(/<[^>]*>/g, ''));
    } else if (inputFormat === 'plaintext' && outputFormat === 'markdown') {
      setOutputContent(inputContent);
    } else if (inputFormat === 'plaintext' && outputFormat === 'html') {
      setOutputContent(marked(inputContent));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded shadow">
      <div>
        <label htmlFor="inputFormat" className="block text-sm font-medium text-gray-700">
          Input Format
        </label>
        <select
          id="inputFormat"
          value={inputFormat}
          onChange={(e) => setInputFormat(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="plaintext">Plain Text</option>
        </select>
      </div>
      <div>
        <label htmlFor="inputContent" className="block text-sm font-medium text-gray-700">
          Input Content
        </label>
        <textarea
          id="inputContent"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          rows="10"
          className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700">
          Output Format
        </label>
        <select
          id="outputFormat"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="plaintext">Plain Text</option>
        </select>
      </div>
      <button
        onClick={handleConvert}
        className="w-full py-2 px-4 bg-indigo-600 text-white rounded shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Convert
      </button>
      <div>
        <label htmlFor="outputContent" className="block text-sm font-medium text-gray-700">
          Output Content
        </label>
        <textarea
          id="outputContent"
          value={outputContent}
          readOnly
          rows="10"
          className="mt-1 block w-full border-gray-300 rounded shadow-sm bg-gray-50 sm:text-sm"
        />
      </div>
    </div>
  );
};

export default FileConverter;
