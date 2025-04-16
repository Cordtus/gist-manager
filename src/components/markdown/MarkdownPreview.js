// components/markdown/MarkdownPreview.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

const MarkdownPreview = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom rendering for code blocks with syntax highlighting
        code({ node, inline, className, children, ...props }) {
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
        
        // Enhanced horizontal rule with visual distinction
        hr() {
          return <hr className="hr-fancy" />;
        },
        
        // Custom heading with anchor links
        h1({ children }) {
          const id = children.toString().toLowerCase().replace(/\s+/g, '-');
          return (
            <h1 id={id} className="heading-anchor">
              {children}
              <a href={`#${id}`} className="anchor-link">#</a>
            </h1>
          );
        },
        
        h2({ children }) {
          const id = children.toString().toLowerCase().replace(/\s+/g, '-');
          return (
            <h2 id={id} className="heading-anchor">
              {children}
              <a href={`#${id}`} className="anchor-link">#</a>
            </h2>
          );
        },
        
        h3({ children }) {
          const id = children.toString().toLowerCase().replace(/\s+/g, '-');
          return (
            <h3 id={id} className="heading-anchor">
              {children}
              <a href={`#${id}`} className="anchor-link">#</a>
            </h3>
          );
        },
        
        // Custom blockquote with visual indicator
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
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownPreview;