// components/markdown/MarkdownPreview.js

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import "../../styles/markdownPreview.css";

const MarkdownPreview = memo(({ content }) => {
  // Ensure content is a string
  const markdownContent = content || '';
  
  return (
    <div className="markdown-preview">
      {markdownContent ? (
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            remarkMath,
            remarkEmoji,
            remarkBreaks
          ]}
          rehypePlugins={[rehypeKatex]}
          components={{
          // Custom rendering for code blocks with syntax highlighting
          code({ node: _node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            
            return !inline ? (
              <div className="terminal-wrapper">
                {language !== 'text' && (
                  <div className="terminal-header">
                    <span className="terminal-dot terminal-red"></span>
                    <span className="terminal-dot terminal-yellow"></span>
                    <span className="terminal-dot terminal-green"></span>
                    <span className="terminal-language">{language}</span>
                  </div>
                )}
                <SyntaxHighlighter
                  style={tomorrow}
                  language={language}
                  className={language === 'text' ? 'terminal-plain' : 'terminal-code'}
                  showLineNumbers={true}
                  wrapLongLines={true}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          
          // Enhanced horizontal rule
          hr() {
            return <hr className="hr-fancy" />;
          },
          
          // Custom heading with anchor links
          h1({ children }) {
            const id = children?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
            return (
              <h1 id={id} className="heading-anchor">
                {children}
                <a href={`#${id}`} className="anchor-link" aria-label="Link to heading">#</a>
              </h1>
            );
          },
          
          h2({ children }) {
            const id = children?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
            return (
              <h2 id={id} className="heading-anchor">
                {children}
                <a href={`#${id}`} className="anchor-link" aria-label="Link to heading">#</a>
              </h2>
            );
          },
          
          h3({ children }) {
            const id = children?.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
            return (
              <h3 id={id} className="heading-anchor">
                {children}
                <a href={`#${id}`} className="anchor-link" aria-label="Link to heading">#</a>
              </h3>
            );
          },
          
          // Custom blockquote
          blockquote({ children }) {
            return (
              <blockquote className="fancy-blockquote">
                {children}
              </blockquote>
            );
          },
          
          // Custom table styling
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table className="fancy-table">{children}</table>
              </div>
            );
          },
          
          // Custom rendering for <details> tags
          details({ children, ...props }) {
            return (
              <details className="collapsible-section" {...props}>
                {children}
              </details>
            );
          },
          
          // Custom rendering for <summary> tags
          summary({ children }) {
            return (
              <summary className="collapsible-header">
                <span className="collapsible-arrow">▶</span>
                {children}
              </summary>
            );
          },
          
          // Task list handling (checkbox inputs)
          input({ type, checked }) {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox" 
                  checked={checked} 
                  readOnly 
                  className="md-checkbox"
                />
              );
            }
            return null;
          }
        }}
      >
        {markdownContent}
      </ReactMarkdown>
      ) : (
        <div style={{ color: 'var(--color-text-secondary)', padding: '1rem' }}>
          Start typing markdown to see the preview...
        </div>
      )}
    </div>
  );
});

export default MarkdownPreview;