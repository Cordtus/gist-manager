import React, { useState, useEffect } from 'react';
import Showdown from 'showdown';
import TurndownService from 'turndown';

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

const converterMdToHtml = new Showdown.Converter();
const turndown = new TurndownService();

const FileHandler = () => {
  const [input, setInput] = useState('');
  const [fromType, setFromType] = useState('plaintext');
  const [toType, setToType] = useState('html');
  const [output, setOutput] = useState('');

  // infer type on paste/change
  useEffect(() => {
    const inferred = inferType(input);
    setFromType(inferred);
  }, [input]);

  // conversion logic, debounced
  useEffect(() => {
    const handler = setTimeout(() => {
      let intermediate;
      try {
        switch (fromType) {
          case 'json':
            intermediate = JSON.stringify(JSON.parse(input), null, 2);
            break;
          case 'jsonString':
            intermediate = JSON.parse(input);
            break;
          case 'markdown':
            intermediate = input;
            break;
          case 'html':
            intermediate = turndown.turndown(input);
            break;
          default:
            intermediate = input;
        }

        let result;
        switch (toType) {
          case 'json':
            result = JSON.stringify(typeof intermediate === 'string' ? JSON.parse(intermediate) : intermediate, null, 2);
            break;
          case 'jsonString':
            result = JSON.stringify(intermediate);
            break;
          case 'markdown':
            result = typeof intermediate === 'string'
              ? turndown.turndown(
                  fromType === 'html'
                    ? input
                    : converterMdToHtml.makeHtml(intermediate)
                )
              : JSON.stringify(intermediate, null, 2);
            break;
          case 'html':
            result = converterMdToHtml.makeHtml(
              fromType === 'markdown' ? input : String(intermediate)
            );
            break;
          default:
            result = String(intermediate);
        }

        setOutput(result);
      } catch (e) {
        setOutput(`Conversion error: ${e.message}`);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [input, fromType, toType]);

  const handleInputChange = e => setInput(e.target.value);
  const handleFromChange = e => setFromType(e.target.value);
  const handleToChange = e => setToType(e.target.value);

  return (
    <div className="file-handler grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div>
        <label className="block mb-2">Input ({fromType})</label>
        <textarea
          className="w-full h-64 p-2 border rounded"
          value={input}
          onChange={handleInputChange}
          placeholder="Paste or type your text here..."
        />
        <div className="flex mt-2">
          <select value={fromType} onChange={handleFromChange} className="mr-2">
            {['json', 'jsonString', 'html', 'markdown', 'plaintext'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select value={toType} onChange={handleToChange}>
            {['json', 'jsonString', 'html', 'markdown', 'plaintext'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block mb-2">Output ({toType})</label>
        <textarea
          className="w-full h-64 p-2 border rounded bg-gray-50"
          value={output}
          readOnly
        />
      </div>
    </div>
  );
};

export default FileHandler;
