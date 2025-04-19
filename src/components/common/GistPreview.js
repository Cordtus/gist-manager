export const getGistPreview = (gist) => {
  // Get first file content preview
  if (!gist.files || Object.keys(gist.files).length === 0) {
    return 'Empty gist';
  }
  
  const firstFile = Object.values(gist.files)[0];
  
  // If there's no content property or it's empty
  if (!firstFile || !firstFile.content) {
    // Try to get filename at least
    const filename = firstFile?.filename || Object.keys(gist.files)[0] || '';
    return `File: ${filename}`;
  }
  
  // Get first line or first 50 characters
  const content = firstFile.content;
  if (!content.trim()) {
    return 'Empty file';
  }
  
  // For binary files or non-text content, show filename
  if (firstFile.type && !firstFile.type.startsWith('text/') && !firstFile.type.includes('json')) {
    return `Binary file: ${firstFile.filename}`;
  }
  
  const firstLine = content.split('\n')[0].trim();
  return firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine;
};