import React, { useState } from 'react';
import { convertToMarkdown, convertFromMarkdown } from '../services/fileService';

const FileConverter = () => {
  const [file, setFile] = useState(null);
  const [convertedContent, setConvertedContent] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleConvert = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (['md', 'mdx'].includes(fileExtension)) {
        const converted = await convertFromMarkdown(content, fileExtension);
        setConvertedContent(converted);
      } else {
        const converted = await convertToMarkdown(content, fileExtension);
        setConvertedContent(converted);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleConvert}>Convert</button>
      <textarea value={convertedContent} readOnly />
    </div>
  );
};

export default FileConverter;