// GistEditor.js - Enhanced split-panel Markdown editor

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createGist, updateGist, getGist } from '../services/api/gists';
import { isGistShared, shareGist, unshareGist } from '../services/api/sharedGists';
import { useAuth } from '../contexts/AuthContext';
import MarkdownPreview from './markdown/MarkdownPreview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import '../styles/gistEditor.css';
import '../styles/markdownPreview.css';

/**
 * Enhanced Toolbar Component with all Markdown controls
 */
const MarkdownToolbar = ({ onInsert, activeFile }) => {
  const toolbar = [
    {
      group: 'Text Formatting',
      items: [
        {
          key: 'bold',
          icon: <strong>B</strong>,
          title: 'Bold (Ctrl+B)',
          action: () => onInsert('**', '**'),
          shortcut: 'Ctrl+B'
        },
        {
          key: 'italic',
          icon: <em>I</em>,
          title: 'Italic (Ctrl+I)',
          action: () => onInsert('*', '*'),
          shortcut: 'Ctrl+I'
        },
        {
          key: 'strikethrough',
          icon: <span style={{ textDecoration: 'line-through' }}>S</span>,
          title: 'Strikethrough',
          action: () => onInsert('~~', '~~')
        },
        {
          key: 'code',
          icon: <code>{`<>`}</code>,
          title: 'Inline Code (Ctrl+`)',
          action: () => onInsert('`', '`'),
          shortcut: 'Ctrl+`'
        }
      ]
    },
    {
      group: 'Headings',
      items: [
        { key: 'h1', icon: 'H1', title: 'Heading 1', action: () => onInsert('# ', '\n') },
        { key: 'h2', icon: 'H2', title: 'Heading 2', action: () => onInsert('## ', '\n') },
        { key: 'h3', icon: 'H3', title: 'Heading 3', action: () => onInsert('### ', '\n') }
      ]
    },
    {
      group: 'Links & Media',
      items: [
        {
          key: 'link',
          icon: '🔗',
          title: 'Link (Ctrl+K)',
          action: () => onInsert('[', '](https://)'),
          shortcut: 'Ctrl+K'
        },
        {
          key: 'image',
          icon: '🖼️',
          title: 'Image',
          action: () => onInsert('![', '](https://)')
        }
      ]
    },
    {
      group: 'Lists',
      items: [
        {
          key: 'ul',
          icon: '•',
          title: 'Bullet List',
          action: () => onInsert('- ', '\n- ')
        },
        {
          key: 'ol',
          icon: '1.',
          title: 'Numbered List',
          action: () => onInsert('1. ', '\n2. ')
        },
        {
          key: 'task',
          icon: '☑',
          title: 'Task List',
          action: () => onInsert('- [ ] ', '\n- [ ] ')
        }
      ]
    },
    {
      group: 'Blocks',
      items: [
        {
          key: 'quote',
          icon: '❝',
          title: 'Blockquote',
          action: () => onInsert('> ', '\n')
        },
        {
          key: 'codeblock',
          icon: '{ }',
          title: 'Code Block',
          action: () => onInsert('```', '```')
        },
        {
          key: 'table',
          icon: '⊞',
          title: 'Table',
          action: () =>
            onInsert(
              '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |',
              ''
            )
        },
        {
          key: 'hr',
          icon: '─',
          title: 'Horizontal Rule',
          action: () => onInsert('\n---\n', '')
        }
      ]
    },
    {
      group: 'Custom',
      items: [
        {
          key: 'details',
          icon: '▶️',
          title: 'Collapsible Details Block',
          action: () =>
            onInsert(
              '<details>\n<summary>Click to expand</summary>\n\n```',
              '```\n\n</details>'
            )
        }
      ]
    }
  ];

  return (
    <div className="toolbar">
      {toolbar.map((group, idx) => (
        <React.Fragment key={group.group}>
          <div className="toolbar-group">
            {group.items.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={item.action}
                className="toolbar-button"
                title={`${item.title}${item.shortcut ? ` (${item.shortcut})` : ''}`}
                disabled={!activeFile}
              >
                {item.icon}
              </button>
            ))}
          </div>
          {idx < toolbar.length - 1 && <div className="toolbar-divider" />}
        </React.Fragment>
      ))}
    </div>
  );
};


/**
 * Main GistEditor Component with Enhanced Split Panel
 */
const GistEditor = () => {
  // State and refs
  const [gist, setGist] = useState({ 
    description: '', 
    files: { 'newfile.md': { content: '' } }, 
    public: false 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState('split'); // 'editor', 'split', 'preview'
  const [wrapText, setWrapText] = useState(true);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [activeFile, setActiveFile] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const containerRef = useRef(null);
  const resizeHandleRef = useRef(null);

  // Fetch or initialize
  useEffect(() => {
    if (id) {
      fetchGist(id);
      checkIfGistIsShared(id);
    } else {
      setActiveFile('newfile.md');
    }
  }, [id]);

  // Set active file when gist is loaded
  useEffect(() => {
    if (gist && Object.keys(gist.files).length && !activeFile) {
      setActiveFile(Object.keys(gist.files)[0]);
    }
  }, [gist, activeFile]);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = e => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(Math.max(ratio, 20), 80));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = e => { 
    e.preventDefault(); 
    setIsResizing(true); 
  };

  // API calls
  const fetchGist = async gistId => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGist(gistId);
      setGist(data);
      setActiveFile(Object.keys(data.files)[0]);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch gist. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkIfGistIsShared = async gistId => {
    try {
      const shared = await isGistShared(gistId);
      setIsShared(shared);
    } catch (err) {
      console.error(err);
    }
  };

  // Form submission handler
  const handleSubmit = async e => {
    e.preventDefault();
    if (!Object.keys(gist.files).length) {
      setError('Your gist must contain at least one non-empty file!');
      return;
    }
    if (Object.values(gist.files).some(f => !f.content.trim())) {
      setError('All files must be non-empty!');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess('');
    
    try {
      if (id) {
        await updateGist(id, gist);
        setSuccess('Gist updated successfully!');
      } else {
        const newG = await createGist(gist);
        setSuccess('Gist created successfully!');
        navigate(`/gist/${newG.id}`);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save. Please check browser console and create an issue if persistent.');
    } finally {
      setLoading(false);
    }
  };

  // Field change handlers
  const handleDescriptionChange = e => setGist(prev => ({ ...prev, description: e.target.value }));
  const handlePublicChange = e => setGist(prev => ({ ...prev, public: e.target.checked }));
  
  const handleFileChange = useCallback((fileName, content) => {
    setGist(prev => ({ ...prev, files: { ...prev.files, [fileName]: { content } } }));
  }, []);
  
  const addNewFile = () => {
    let name = 'newfile.md', i = 1;
    while (gist.files[name]) name = `newfile_${i++}.md`;
    setGist(prev => ({ ...prev, files: { ...prev.files, [name]: { content: '' } } }));
    setActiveFile(name);
  };
  
  const removeFile = fn => {
    if (Object.keys(gist.files).length <= 1) { 
      setError('Cannot remove the only file.'); 
      return; 
    }
    const files = { ...gist.files };
    delete files[fn];
    setGist(prev => ({ ...prev, files }));
    if (activeFile === fn) setActiveFile(Object.keys(files)[0]);
  };

  // Community Shared Gists
  const handleShareGist = async e => {
    if (!id) return;
    const share = e.target.checked;
    setSharingLoading(true);
    try {
      if (share && !isShared) {
        if (!gist.public) { 
          setError('Only public gists can be shared with the community'); 
          setSharingLoading(false); 
          return; 
        }
        await shareGist(id, gist);
        setIsShared(true);
        setSuccess('Gist shared with the community!');
      } else if (!share && isShared) {
        await unshareGist(id);
        setIsShared(false);
        setSuccess('Gist removed from community sharing!');
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to ${isShared ? 'unshare' : 'share'} gist. Please try again later.`);
    } finally {
      setSharingLoading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Synchronized scrolling between editor and preview
  const syncScroll = useCallback(e => {
    if (previewMode !== 'split') return;
    const src = e.target;
    const dst = src === editorRef.current ? previewRef.current : editorRef.current;
    if (dst && !isResizing) {
      window.requestAnimationFrame(() => {
        const ratio = src.scrollTop / ((src.scrollHeight - src.clientHeight) || 1);
        dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight);
      });
    }
  }, [previewMode, isResizing]);

  // Text insertion helper for toolbar actions
  const insertText = useCallback((before, after = '') => {
    if (!editorRef.current || !activeFile) return;
    const ta = editorRef.current;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    const txt = before + sel + after;
    const newPos = sel ? s + before.length + sel.length + after.length : s + before.length;
    handleFileChange(activeFile, value.slice(0, s) + txt + value.slice(e));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newPos, newPos); }, 0);
  }, [activeFile, handleFileChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = e => {
      if (document.activeElement !== editorRef.current) return;
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'b': e.preventDefault(); insertText('**', '**'); break;
          case 'i': e.preventDefault(); insertText('*', '*'); break;
          case 'k': e.preventDefault(); insertText('[', '](https://)'); break;
          case '`': e.preventDefault(); insertText('`', '`'); break;
          case '/': e.preventDefault(); 
            setPreviewMode(pm => pm === 'split' ? 'editor' : 'split'); 
            break;
          default: break;
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [insertText]);

  // Helpers
  const isMarkdownFile = fn => fn?.match(/\.(md|markdown|mdx)$/i);
  const getFileLanguage = fn => {
    const ext = fn.split('.').pop().toLowerCase();
    const map = { 
      js:'javascript', jsx:'jsx', ts:'typescript', tsx:'tsx', py:'python', 
      rb:'ruby', java:'java', go:'go', html:'html', css:'css', scss:'scss', 
      json:'json', yaml:'yaml', yml:'yaml', sh:'bash', txt:'text' 
    };
    return map[ext] || 'text';
  };

  if (!user) return (
    <div className="p-6 bg-surface rounded shadow-md text-center">
      Please log in to edit gists.
    </div>
  );
  
  if (loading && id) return (
    <div className="p-6 bg-surface rounded shadow-md text-center">Loading…</div>
  );

  const currentFileContent = activeFile ? gist.files[activeFile]?.content || '' : '';

  return (
    <form onSubmit={handleSubmit} className="gist-editor-form">
      {/* Description & Settings */}
      <div className="p-4 border-b border-default bg-surface">
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium mb-1 text-primary">
            Description [optional]
          </label>
          <input
            type="text"
            id="description"
            value={gist.description}
            onChange={handleDescriptionChange}
            placeholder="Enter a description for your gist"
            className="w-full p-2 border border-default rounded bg-surface text-primary focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="public"
              checked={gist.public}
              onChange={handlePublicChange}
              className="h-4 w-4 text-primary border-default rounded"
            />
            <label htmlFor="public" className="ml-2 block text-sm text-primary">
              Public gist
            </label>
          </div>
          {id && (
            <div className="flex items-center">
              <span className={`px-2 py-1 text-xs rounded-full ${
                gist.public
                  ? 'bg-success-subtle text-success'
                  : 'bg-secondary-subtle text-secondary'
              }`}>
                {gist.public ? 'Public' : 'Private'}
              </span>
            </div>
          )}
          {id && gist.public && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="share-community"
                checked={isShared}
                onChange={handleShareGist}
                className="h-4 w-4 text-primary border-default rounded"
                disabled={sharingLoading}
              />
              <label htmlFor="share-community" className="ml-2 block text-sm text-primary">
                Share with Community
              </label>
              <span className="ml-2 text-xs text-default">
                (Make this gist visible in Community Gists)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-danger-subtle text-danger border-b border-danger-subtle">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-success-subtle text-success border-b border-success-subtle">{success}</div>
      )}

      {/* Controls */}
      <div className={`buttons-container ${previewMode === 'split' ? 'preview' : ''}`}>
        <button
          type="button"
          onClick={addNewFile}
          className="button secondary flex items-center"
          title="Add a new file"
        >
          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add File
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode(pm => pm === 'split' ? 'editor' : 'split')}
          className="button secondary"
          title={previewMode === 'split' ? 'Editor only mode (Ctrl+/)' : 'Split preview mode (Ctrl+/)'}
        >
          {previewMode === 'split' ? 'Editor Only' : 'Split Preview'}
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={loading}
          title="Save the current gist"
        >
          {loading ? 'Saving...' : (id ? 'Update Gist' : 'Create Gist')}
        </button>
        <div className="ml-auto flex items-center">
          <label className="wrap-text flex items-center">
            <input
              type="checkbox"
              checked={wrapText}
              onChange={() => setWrapText(w => !w)}
              className="mr-2"
            />
            <span className="text-sm text-primary">Wrap Text</span>
          </label>
        </div>
      </div>

      {/* File Tabs */}
      <div className="border-b border-default bg-surface-secondary px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {Object.keys(gist.files).map(filename => (
            <button
              key={filename}
              type="button"
              onClick={() => setActiveFile(filename)}
              className={`px-3 py-2 text-sm rounded-md whitespace-nowrap transition ${
                activeFile === filename
                  ? 'bg-surface text-primary border border-default shadow-sm'
                  : 'text-default hover:bg-surface-hover'
              }`}
              aria-selected={activeFile === filename}
            >
              {filename}
              {Object.keys(gist.files).length > 1 && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeFile(filename); }}
                  className="ml-2 text-secondary hover:text-danger"
                  title={`Remove file ${filename}`}
                  aria-label={`Remove file ${filename}`}
                >
                  ×
                </button>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <MarkdownToolbar onInsert={insertText} activeFile={activeFile} />

      {/* Editor & Preview */}
      {activeFile && (
        <div ref={containerRef} className={`editor-container ${previewMode === 'split' ? 'split-view' : ''}`}>
          <textarea
            ref={editorRef}
            value={currentFileContent}
            onChange={e => handleFileChange(activeFile, e.target.value)}
            onScroll={syncScroll}
            className={`editor ${wrapText ? 'wrap' : 'no-wrap'}`}
            style={previewMode === 'split' ? { width: `${splitRatio}%` } : { width: '100%' }}
            placeholder="Enter file content here..."
            aria-label={`Editor for ${activeFile}`}
          />
          {previewMode === 'split' && (
            <>
              <div
                ref={resizeHandleRef}
                className={`resize-handle ${isResizing ? 'active' : ''}`}
                onMouseDown={handleResizeStart}
                style={{ left: `${splitRatio}%` }}
                aria-hidden="true"
              />
              <div
                ref={previewRef}
                className="preview"
                onScroll={syncScroll}
                style={{ width: `${100 - splitRatio}%` }}
                aria-label="Preview pane"
              >
                {isMarkdownFile(activeFile)
                  ? <MarkdownPreview content={currentFileContent} />
                  : <SyntaxHighlighter language={getFileLanguage(activeFile)} style={tomorrow} className="syntax-highlighter">
                      {currentFileContent}
                    </SyntaxHighlighter>
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-default bg-surface-secondary text-xs text-default">
        <details>
          <summary className="cursor-pointer">Keyboard Shortcuts</summary>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            <div><strong>Ctrl+B</strong>: Bold</div>
            <div><strong>Ctrl+I</strong>: Italic</div>
            <div><strong>Ctrl+K</strong>: Link</div>
            <div><strong>Ctrl+`</strong>: Inline Code</div>
            <div><strong>Ctrl+/</strong>: Toggle Preview</div>
          </div>
        </details>
      </div>

    </form>
  );
};

export default GistEditor;
