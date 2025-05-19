// components/markdown/MarkdownPreview.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import "../../styles/markdown-preview.css";

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
        
        // link rendering
        a({ href, children, ...props }) {
          return (
            <a 
              href={href} 
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="md-link"
              {...props}
            >
              {children}
            </a>
          );
        },
        
        // image rendering
        img({ src, alt, ...props }) {
          return (
            <div className="image-container">
              <img src={src} alt={alt || ''} className="md-image" {...props} />
              {alt && <span className="image-caption">{alt}</span>}
            </div>
          );
        },
        
        // list rendering
        ul({ children, ...props }) {
          return <ul className="md-list" {...props}>{children}</ul>;
        },
        
        ol({ children, ...props }) {
          return <ol className="md-ordered-list" {...props}>{children}</ol>;
        },
        
        li({ children, ...props }) {
          return <li className="md-list-item" {...props}>{children}</li>;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownPreview;