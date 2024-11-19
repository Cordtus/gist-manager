// components/FileConverter.js

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
    <div className="space-y-6">
      <div>
        <label htmlFor="inputFormat" className="block text-sm font-medium text-gray-700">
          Input Format
        </label>
        <select
          id="inputFormat"
          value={inputFormat}
          onChange={(e) => setInputFormat(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="plaintext">Plain Text</option>
        </select>
      </div>
      <button
        onClick={handleConvert}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
        />
      </div>
    </div>
  );
};

export default FileConverter;