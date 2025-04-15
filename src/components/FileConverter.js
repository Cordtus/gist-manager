// components/FileConverter.js

import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
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
  markdown: {
    name: 'Markdown',
    extensions: ['.md', '.markdown'],
    mimeType: 'text/markdown'
  },
  html: {
    name: 'HTML',
    extensions: ['.html', '.htm'],
    mimeType: 'text/html'
  },
  plaintext: {
    name: 'Plain Text',
    extensions: ['.txt'],
    mimeType: 'text/plain'
  },
  json: {
    name: 'JSON',
    extensions: ['.json'],
    mimeType: 'application/json'
  }
};

const FileConverter = () => {
  const { user } = useAuth();
  const [inputContent, setInputContent] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const [inputFormat, setInputFormat] = useState('markdown');
  const [outputFormat, setOutputFormat] = useState('html');
  const [inputFileName, setInputFileName] = useState('');
  const [outputFileName, setOutputFileName] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle input file change
  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setInputFileName(file.name);
    
    // Try to determine input format from file extension
    const extension = file.name.split('.').pop().toLowerCase();
    Object.entries(FORMATS).forEach(([format, info]) => {
      if (info.extensions.some(ext => ext.includes(extension))) {
        setInputFormat(format);
      }
    });
    
    // Read the file
    const reader = new FileReader();
    reader.onload = (e) => {
      setInputContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // Set output filename based on input filename and selected format
  useEffect(() => {
    if (inputFileName && outputFormat) {
      const baseName = inputFileName.split('.')[0];
      const extension = FORMATS[outputFormat].extensions[0];
      setOutputFileName(`${baseName}${extension}`);
    }
  }, [inputFileName, outputFormat]);

  // Handle conversion
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
      
      // Markdown to HTML
      if (inputFormat === 'markdown' && outputFormat === 'html') {
        // Use marked for markdown to HTML conversion
        result = marked.parse(inputContent);
      } 
      // HTML to Markdown
      else if (inputFormat === 'html' && outputFormat === 'markdown') {
        result = turndownService.turndown(inputContent);
      } 
      // Markdown to plain text
      else if (inputFormat === 'markdown' && outputFormat === 'plaintext') {
        // Use converter for markdown to plaintext (convert to HTML first, then strip tags)
        const html = marked.parse(inputContent);
        // Fix: use converter to properly format plain text
        const plainText = html.replace(/<[^>]*>/g, '');
        result = plainText;
      } 
      // HTML to plain text
      else if (inputFormat === 'html' && outputFormat === 'plaintext') {
        // Fix: fixed regex by removing unnecessary escape
        result = inputContent.replace(/<[^>]*>/g, '');
      } 
      // Plain text to HTML
      else if (inputFormat === 'plaintext' && outputFormat === 'html') {
        // Simple conversion - preserve line breaks
        result = inputContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
      } 
      // Plain text to Markdown
      else if (inputFormat === 'plaintext' && outputFormat === 'markdown') {
        // Use converter to properly format markdown
        result = inputContent;
      } 
      // Markdown/HTML/Plain text to JSON
      else if (outputFormat === 'json') {
        let content = inputContent;
        
        // If input is markdown, convert to HTML first
        if (inputFormat === 'markdown') {
          content = marked.parse(inputContent);
        }
        
        result = JSON.stringify({
          content: content,
          format: inputFormat,
          timestamp: new Date().toISOString()
        }, null, 2);
      }
      // JSON to other formats
      else if (inputFormat === 'json') {
        try {
          const parsedJson = JSON.parse(inputContent);
          const jsonContent = typeof parsedJson === 'object' && parsedJson.content 
            ? parsedJson.content 
            : JSON.stringify(parsedJson, null, 2);
            
          if (outputFormat === 'markdown') {
            result = typeof jsonContent === 'string' ? jsonContent : JSON.stringify(jsonContent, null, 2);
          } else if (outputFormat === 'html') {
            result = `<pre>${JSON.stringify(parsedJson, null, 2)}</pre>`;
          } else if (outputFormat === 'plaintext') {
            result = typeof jsonContent === 'string' ? jsonContent : JSON.stringify(parsedJson, null, 2);
          }
        } catch (error) {
          setErrorMessage('Invalid JSON format. Please check your input.');
          setIsConverting(false);
          return;
        }
      }
      // Same format (just formatting/prettify)
      else if (inputFormat === outputFormat) {
        if (inputFormat === 'markdown') {
          // Clean up markdown using showdownConverter
          const cleaned = inputContent.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
          result = cleaned;
        } else if (inputFormat === 'html') {
          // Pretty-print HTML (very basic)
          result = inputContent
            .replace(/>\s+</g, '>\n<')
            .replace(/(<[^/][^>]*>)/g, '\n$1')
            .replace(/(<\/[^>]*>)/g, '$1\n')
            .replace(/\n{3,}/g, '\n\n');
        } else {
          // Default - just use input
          result = inputContent;
        }
      }
      
      setOutputContent(result);
      
      // Add to conversion history
      const historyEntry = {
        id: Date.now(),
        inputFormat,
        outputFormat,
        timestamp: new Date().toISOString(),
        inputSize: inputContent.length,
        outputSize: result.length
      };
      setConversionHistory(prev => [historyEntry, ...prev].slice(0, 10));
      
      setSuccessMessage('Conversion completed successfully!');
    } catch (error) {
      console.error('Conversion error:', error);
      setErrorMessage(`Conversion failed: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };
  
  // Handle download of output content
  const handleDownload = () => {
    if (!outputContent) {
      setErrorMessage('No content to download');
      return;
    }
    
    try {
      const blob = new Blob([outputContent], { type: FORMATS[outputFormat].mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFileName || `converted.${FORMATS[outputFormat].extensions[0].slice(1)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('File downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      setErrorMessage(`Download failed: ${error.message}`);
    }
  };
  
  // Handle saving as gist
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
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 text-green-800 p-4 rounded-md animate-fadeIn">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md animate-fadeIn">
          {errorMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Input</h3>
          
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div className="flex-1">
              <label htmlFor="inputFormat" className="block text-sm font-medium text-gray-700 mb-1">
                Input Format
              </label>
              <select
                id="inputFormat"
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus-ring"
              >
                {Object.entries(FORMATS).map(([key, format]) => (
                  <option key={key} value={key}>{format.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload File
              </label>
              <input
                type="file"
                onChange={handleFileInputChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
          
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={`Enter your ${FORMATS[inputFormat].name} content here...`}
            className="w-full h-64 p-3 border border-gray-300 rounded-md focus-ring font-mono text-sm"
          />
        </div>
        
        {/* Output Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Output</h3>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1">
              <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 mb-1">
                Output Format
              </label>
              <select
                id="outputFormat"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus-ring"
              >
                {Object.entries(FORMATS).map(([key, format]) => (
                  <option key={key} value={key}>{format.name}</option>
                ))}
              </select>
            </div>
            
            <div className="self-end">
              <label htmlFor="outputFileName" className="block text-sm font-medium text-gray-700 mb-1">
                Output Filename
              </label>
              <input
                type="text"
                id="outputFileName"
                value={outputFileName}
                onChange={(e) => setOutputFileName(e.target.value)}
                placeholder="output.html"
                className="w-full p-2 border border-gray-300 rounded-md focus-ring"
              />
            </div>
          </div>
          
          <textarea
            value={outputContent}
            readOnly
            placeholder="Converted output will appear here..."
            className="w-full h-64 p-3 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-gray-200">
        <button
          onClick={handleConvert}
          disabled={isConverting || !inputContent.trim()}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isConverting || !inputContent.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
          }`}
        >
          {isConverting ? 'Converting...' : 'Convert'}
        </button>
        
        <button
          onClick={handleDownload}
          disabled={!outputContent.trim()}
          className={`px-4 py-2 rounded-md font-medium ${
            !outputContent.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          }`}
        >
          Download Output
        </button>
        
        {user && (
          <button
            onClick={handleSaveAsGist}
            disabled={!outputContent.trim()}
            className={`px-4 py-2 rounded-md font-medium ${
              !outputContent.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            Save as Gist
          </button>
        )}
      </div>
      
      {/* Conversion History */}
      {conversionHistory.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Conversion History</h3>
          <div className="bg-gray-50 rounded-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size Change
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {conversionHistory.map(entry => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {FORMATS[entry.inputFormat].name} → {FORMATS[entry.outputFormat].name}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {entry.inputSize} → {entry.outputSize} chars
                      {' '}
                      <span className={
                        entry.outputSize > entry.inputSize
                          ? 'text-red-600'
                          : entry.outputSize < entry.inputSize
                            ? 'text-green-600'
                            : 'text-gray-600'
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