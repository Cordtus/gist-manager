// src/components/FileConverter.js
import React, { useState, useEffect } from 'react';
import TurndownService from 'turndown';
import showdown from 'showdown';
import { useAuth } from '../contexts/AuthContext';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});
const showdownConverter = new showdown.Converter({
  tables: true,
  tasklists: true,
  strikethrough: true,
  ghCodeBlocks: true,
});

// Supported conversion formats
const FORMATS = {
  markdown:  { name: 'Markdown',   extensions: ['.md'],   mimeType: 'text/markdown'    },
  html:      { name: 'HTML',       extensions: ['.html'], mimeType: 'text/html'        },
  plaintext: { name: 'Plain Text', extensions: ['.txt'],  mimeType: 'text/plain'       },
  json:      { name: 'JSON',       extensions: ['.json'], mimeType: 'application/json' },
};

// Infer file type from input
const inferType = text => {
  try { JSON.parse(text); return 'json'; } catch {}
  if (/^\s*[{[]/.test(text)) return 'json';
  if (/<[a-z][\s\S]*>/i.test(text)) return 'html';
  if (/^\s*([#>*-]|\d+\.)\s+/.test(text)) return 'markdown';
  return 'plaintext';
};

const FileConverter = () => {
  const { user } = useAuth();
  const [inputContent, setInputContent]         = useState('');
  const [outputContent, setOutputContent]       = useState('');
  const [inputFormat, setInputFormat]           = useState('markdown');
  const [outputFormat, setOutputFormat]         = useState('html');
  const [inputFileName, setInputFileName]       = useState('');
  const [outputFileName, setOutputFileName]     = useState('');
  const [isConverting, setIsConverting]         = useState(false);
  const [history, setHistory]                   = useState([]);
  const [successMessage, setSuccessMessage]     = useState('');
  const [errorMessage, setErrorMessage]         = useState('');
  const [hasManualFormat, setHasManualFormat]   = useState(false);

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
    const txt = e.target.value;
    setInputContent(txt);
    if (!hasManualFormat) {
      const detectedFormat = inferType(txt);
      setInputFormat(detectedFormat);
      // If output format is same as input, change it
      if (outputFormat === detectedFormat) {
        const alternativeFormat = detectedFormat === 'markdown' ? 'html' : 
                                  detectedFormat === 'html' ? 'markdown' : 
                                  detectedFormat === 'json' ? 'plaintext' : 'markdown';
        setOutputFormat(alternativeFormat);
      }
    }
  };

  const handleFileInputChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setInputFileName(file.name);
    setHasManualFormat(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const txt = ev.target.result;
      setInputContent(txt);
      const detectedFormat = inferType(txt);
      setInputFormat(detectedFormat);
      // If output format is same as input, change it
      if (outputFormat === detectedFormat) {
        const alternativeFormat = detectedFormat === 'markdown' ? 'html' : 
                                  detectedFormat === 'html' ? 'markdown' : 
                                  detectedFormat === 'json' ? 'plaintext' : 'markdown';
        setOutputFormat(alternativeFormat);
      }
    };
    reader.readAsText(file);
  };

  // Manual conversion
  const handleConvert = () => {
    if (!inputContent.trim()) {
      setErrorMessage('Please enter or upload content to convert');
      return;
    }
    if (inputFormat === outputFormat) {
      setErrorMessage('Input and output formats cannot be the same');
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    setIsConverting(true);

    let result = '';
    try {
      // JSON → JSON (pretty-print)
      if (inputFormat === 'json' && outputFormat === 'json') {
        result = JSON.stringify(JSON.parse(inputContent), null, 2);
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
        result = showdownConverter.makeHtml(inputContent).replace(/<[^>]*>/g, '');
      }
      // HTML → Plaintext
      else if (inputFormat === 'html' && outputFormat === 'plaintext') {
        result = inputContent.replace(/<[^>]*>/g, '');
      }
      // Plaintext → HTML
      else if (inputFormat === 'plaintext' && outputFormat === 'html') {
        result = `<html>\n<head>\n<title>Converted Document</title>\n</head>\n<body>\n<pre>${inputContent
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>\n</body>\n</html>`;
      }
      // Plaintext → Markdown
      else if (inputFormat === 'plaintext' && outputFormat === 'markdown') {
        // Convert plain text to markdown by adding appropriate formatting
        result = inputContent
          .split('\n')
          .map(line => {
            // Convert URLs to markdown links
            return line.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)');
          })
          .join('\n');
      }
      // Wrap to JSON
      else if (outputFormat === 'json') {
        let content = inputContent;
        if (inputFormat === 'markdown') {
          content = showdownConverter.makeHtml(inputContent);
        }
        result = JSON.stringify({
          content,
          format: inputFormat,
          timestamp: new Date().toISOString()
        }, null, 2);
      }
      // From JSON to other
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
      // Default fallback for unsupported conversions
      else {
        throw new Error(`Conversion from ${FORMATS[inputFormat].name} to ${FORMATS[outputFormat].name} is not supported`);
      }

      setOutputContent(result);
      setHistory(h => [{ id: Date.now(), inputFormat, outputFormat, timestamp: new Date().toISOString(), inSize: inputContent.length, outSize: result.length }, ...h].slice(0, 10));
      setSuccessMessage('Conversion completed successfully!');
    } catch (err) {
      setErrorMessage(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Download output
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
  const handleSaveAsGist = () => {
    if (!user || !outputContent) {
      setErrorMessage('No content to save or user not logged in');
      return;
    }
    // stub: integrate your createGist call here
    setSuccessMessage('Ready to save as Gist (stubbed).');
  };

  return (
    <div className="p-6 bg-surface rounded shadow-md space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">File Format Converter</h2>
        <p className="text-sm text-secondary mt-1">Convert between Markdown, HTML, JSON, and Plain Text formats</p>
      </div>

      {successMessage && (
        <div className="bg-success bg-opacity-10 text-success p-4 rounded-md">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-error bg-opacity-10 text-error p-4 rounded-md">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary">Input</h3>
          <div className="flex gap-4 mb-2">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-secondary mb-1">Format</label>
              <select
                value={inputFormat}
                onChange={e => { 
                  const newFormat = e.target.value;
                  setInputFormat(newFormat); 
                  setHasManualFormat(true); 
                  // If output format is same as new input format, change output
                  if (outputFormat === newFormat) {
                    const alternativeFormat = newFormat === 'markdown' ? 'html' : 
                                              newFormat === 'html' ? 'markdown' : 
                                              newFormat === 'json' ? 'plaintext' : 'markdown';
                    setOutputFormat(alternativeFormat);
                  }
                }}
                className="w-full p-2 border border-default rounded bg-background text-primary"
              >
                {Object.entries(FORMATS).map(([key, f]) => (
                  <option key={key} value={key}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Upload File</label>
              <input
                type="file"
                onChange={handleFileInputChange}
                className="block text-sm p-1.5 border border-default rounded"
              />
            </div>
          </div>
          <textarea
            value={inputContent}
            onChange={onInputChange}
            placeholder={`Enter ${FORMATS[inputFormat].name} content…`}
            className="w-full h-64 p-3 border border-default rounded font-mono bg-background text-primary"
          />
        </div>

        {/* Output */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary">Output</h3>
          <div className="flex gap-4 mb-2 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-secondary mb-1">Format</label>
              <select
                value={outputFormat}
                onChange={e => setOutputFormat(e.target.value)}
                className="w-full p-2 border border-default rounded bg-background text-primary"
              >
                {Object.entries(FORMATS)
                  .filter(([key]) => key !== inputFormat) // Prevent selecting same format
                  .map(([key, f]) => (
                    <option key={key} value={key}>{f.name}</option>
                  ))}
              </select>
            </div>
            <div className="w-[200px]">
              <label className="block text-sm font-medium text-secondary mb-1" title="The name for the downloaded file">Output Filename</label>
              <input
                type="text"
                value={outputFileName}
                onChange={e => setOutputFileName(e.target.value)}
                placeholder="output.html"
                className="w-full p-2 border border-default rounded bg-background text-primary h-[42px]"
                title="This will be the filename when you download the converted file"
              />
            </div>
          </div>
          <textarea
            value={outputContent}
            readOnly
            placeholder="Converted output…"
            className="w-full h-64 p-3 border border-default rounded bg-background text-primary font-mono"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-default">
        <button
          onClick={handleConvert}
          disabled={isConverting || !inputContent.trim()}
          className={`button primary ${isConverting || !inputContent.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isConverting ? 'Converting…' : 'Convert'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!outputContent}
          className={`button secondary ${!outputContent ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Download
        </button>
        {user && (
          <button
            onClick={handleSaveAsGist}
            disabled={!outputContent}
            className={`button secondary ${!outputContent ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Save as Gist
          </button>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-secondary mb-2">Conversion History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-default">
              <thead>
                <tr className="bg-surface-variant">
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">When</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Conversion</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Size Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default">
                {history.map(({ id, timestamp, inputFormat, outputFormat, inSize, outSize }) => (
                  <tr key={id}>
                    <td className="px-4 py-2 text-sm text-secondary">{new Date(timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">{FORMATS[inputFormat].name} → {FORMATS[outputFormat].name}</td>
                    <td className="px-4 py-2 text-sm">
                      {inSize}→{outSize}{' '}
                      <span className={
                        outSize > inSize ? 'text-error' :
                        outSize < inSize ? 'text-success' : 'text-secondary'
                      }>
                        ({Math.round((outSize - inSize)/inSize * 100)}%)
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
