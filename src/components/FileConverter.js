// components/FileConverter.js

import React, { useState, useEffect } from 'react';
import TurndownService from 'turndown';
import showdown from 'showdown';
import { useAuth } from '../contexts/AuthContext';

// Initialize converters
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});
const showdownConverter = new showdown.Converter({
  tables: true,
  tasklists: true,
  strikethrough: true,
  ghCodeBlocks: true
});

// Supported conversion formats
const FORMATS = {
  markdown:   { name: 'Markdown',   extensions: ['.md', '.markdown'], mimeType: 'text/markdown'    },
  html:       { name: 'HTML',       extensions: ['.html', '.htm'],      mimeType: 'text/html'         },
  plaintext:  { name: 'Plain Text', extensions: ['.txt'],             mimeType: 'text/plain'        },
  json:       { name: 'JSON',       extensions: ['.json'],           mimeType: 'application/json'  }
};

// Infer input type from text
const inferType = text => {
  try {
    JSON.parse(text);
    return 'json';
  } catch {}
  // starts with { or [
  if (/^\s*[{[]/.test(text)) return 'jsonString';
  // contains HTML-like tags
  if (/<[a-z][\s\S]*>/i.test(text)) return 'html';
  // markdown markers: headings, blockquote, lists (*, >, #, -, or numbered)
  if (/^\s*([#>*-]|\d+\.)\s+/.test(text)) return 'markdown';
  return 'plaintext';
};

const FileConverter = () => {
  const { user } = useAuth();
  const [inputContent, setInputContent]       = useState('');
  const [outputContent, setOutputContent]     = useState('');
  const [inputFormat, setInputFormat]         = useState('markdown');
  const [outputFormat, setOutputFormat]       = useState('html');
  const [inputFileName, setInputFileName]     = useState('');
  const [outputFileName, setOutputFileName]   = useState('');
  const [isConverting, setIsConverting]       = useState(false);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [successMessage, setSuccessMessage]   = useState('');
  const [errorMessage, setErrorMessage]       = useState('');
  const [hasManualFormat, setHasManualFormat] = useState(false);

  // Update output filename
  useEffect(() => {
    if (inputFileName && outputFormat) {
      const base = inputFileName.replace(/\.[^.]+$/, '');
      const ext  = FORMATS[outputFormat].extensions[0];
      setOutputFileName(`${base}${ext}`);
    }
  }, [inputFileName, outputFormat]);

  // Handle input changes
  const onInputChange = e => {
    const text = e.target.value;
    setInputContent(text);
    if (!hasManualFormat) {
      setInputFormat(inferType(text));
    }
  };

  // Handle file upload
  const handleFileInputChange = event => {
    const file = event.target.files[0];
    if (!file) return;
    setInputFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      setInputContent(text);
      setInputFormat(inferType(text));
      setHasManualFormat(true);
    };
    reader.readAsText(file);
  };

  // Manual conversion
  const handleConvert = () => {
    if (!inputContent.trim()) {
      setErrorMessage('Please enter or upload content to convert');
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    setIsConverting(true);

    try {
      let result = '';

      // JSON → JSON (pretty-print)
      if (inputFormat === 'json' && outputFormat === 'json') {
        const obj = JSON.parse(inputContent);
        result = JSON.stringify(obj, null, 2);
      }
      // Markdown → HTML
      else if (inputFormat === 'markdown' && outputFormat === 'html') {
        result = showdownConverter.makeHtml(inputContent);
      }
      // HTML → Markdown
      else if (inputFormat === 'html' && outputFormat === 'markdown') {
        result = turndownService.turndown(inputContent);
      }
      // Markdown → Plaintext
      else if (inputFormat === 'markdown' && outputFormat === 'plaintext') {
        const html = showdownConverter.makeHtml(inputContent);
        result = html.replace(/<[^>]*>/g, '');
      }
      // HTML → Plaintext
      else if (inputFormat === 'html' && outputFormat === 'plaintext') {
        result = inputContent.replace(/<[^>]*>/g, '');
      }
      // Plaintext → HTML
      else if (inputFormat === 'plaintext' && outputFormat === 'html') {
        result = inputContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
      }
      // Plaintext → Markdown
      else if (inputFormat === 'plaintext' && outputFormat === 'markdown') {
        result = inputContent;
      }
      // To JSON wrapper
      else if (outputFormat === 'json') {
        let content = inputContent;
        if (inputFormat === 'markdown') {
          content = showdownConverter.makeHtml(inputContent);
        }
        result = JSON.stringify(
          { content, format: inputFormat, timestamp: new Date().toISOString() },
          null,
          2
        );
      }
      // From JSON to other formats
      else if (inputFormat === 'json') {
        const parsed = JSON.parse(inputContent);
        if (outputFormat === 'markdown') {
          result = typeof parsed.content === 'string'
            ? parsed.content
            : JSON.stringify(parsed.content, null, 2);
        } else if (outputFormat === 'html') {
          result = `<pre>${JSON.stringify(parsed, null, 2)}</pre>`;
        } else if (outputFormat === 'plaintext') {
          result = typeof parsed.content === 'string'
            ? parsed.content
            : JSON.stringify(parsed.content, null, 2);
        }
      }
      // Same format
      else if (inputFormat === outputFormat) {
        result = inputContent;
      }

      setOutputContent(result);
      // record history
      const entry = {
        id: Date.now(),
        inputFormat,
        outputFormat,
        timestamp: new Date().toISOString(),
        inputSize: inputContent.length,
        outputSize: result.length
      };
      setConversionHistory(prev => [entry, ...prev].slice(0, 10));
      setSuccessMessage('Conversion completed successfully!');
    } catch (error) {
      setErrorMessage(`Conversion failed: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Download converted output
  const handleDownload = () => {
    if (!outputContent) {
      setErrorMessage('No content to download');
      return;
    }
    const blob = new Blob([outputContent], { type: FORMATS[outputFormat].mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFileName || `converted${FORMATS[outputFormat].extensions[0]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMessage('File downloaded successfully!');
  };

  // Save as gist
  const handleSaveAsGist = async () => {
    if (!outputContent || !user) {
      setErrorMessage('No content to save or user not logged in');
      return;
    }
    
    try {
      // Prepare file data
      const gistPayload = {
        description: `Converted from ${inputFormat} to ${outputFormat}`,
        public: false,
        files: {
          [outputFileName || `converted${FORMATS[outputFormat].extensions[0]}`]: {
            content: outputContent
          }
        }
      };
      
      console.log('Ready to save gist:', gistPayload);
      
      setSuccessMessage('Saved as Gist successfully!');
    } catch (error) {
      console.error('Save as Gist error:', error);
      setErrorMessage(`Failed to save as Gist: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">File Format Converter</h2>

      {successMessage && <div className="bg-green-50 text-green-800 p-4 rounded-md">{successMessage}</div>}
      {errorMessage   && <div className="bg-red-50   text-red-800   p-4 rounded-md">{errorMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Input</h3>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Format</label>
              <select
                value={inputFormat}
                onChange={e => { setInputFormat(e.target.value); setHasManualFormat(true); }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {Object.entries(FORMATS).map(([key, format]) => (
                  <option key={key} value={key}>{format.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
              <input type="file" onChange={handleFileInputChange} className="block w-full text-sm text-gray-500" />
            </div>
          </div>
          <textarea
            value={inputContent}
            onChange={onInputChange}
            placeholder={`Enter your ${FORMATS[inputFormat].name} content here...`}
            className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Output</h3>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
              <select
                value={outputFormat}
                onChange={e => setOutputFormat(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {Object.entries(FORMATS).map(([key, format]) => (
                  <option key={key} value={key}>{format.name}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={outputFileName}
              readOnly
              placeholder="output.html"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <textarea
            value={outputContent}
            readOnly
            placeholder="Converted output will appear here..."
            className="w-full h-64 p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-gray-200">
        <button
          onClick={handleConvert}
          disabled={isConverting || !inputContent.trim()}
          className={`px-4 py-2 rounded-md text-white font-medium ${isConverting || !inputContent.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {isConverting ? 'Converting...' : 'Convert'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!outputContent.trim()}
          className={`px-4 py-2 rounded-md font-medium ${!outputContent.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
        >
          Download Output
        </button>
        {user && (
          <button
            onClick={handleSaveAsGist}
            disabled={!outputContent.trim()}
            className={`px-4 py-2 rounded-md font-medium ${!outputContent.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            Save as Gist
          </button>
        )}
      </div>

      {conversionHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Conversion History</h3>
          <div className="bg-gray-50 rounded-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conversion</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {conversionHistory.map(entry => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{FORMATS[entry.inputFormat].name} → {FORMATS[entry.outputFormat].name}</td>
                    <td className="px-4 py-2 text-sm">
                      {entry.inputSize} → {entry.outputSize} chars{' '}
                      <span className={
                        entry.outputSize > entry.inputSize ? 'text-red-600' :
                        entry.outputSize < entry.inputSize ? 'text-green-600' : 'text-gray-600'
                      }>
                        ({Math.round((entry.outputSize - entry.inputSize) / entry.inputSize * 100)}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileConverter;
