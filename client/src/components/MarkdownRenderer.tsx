import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  inverted?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', inverted = false }) => {
  const textColor = inverted ? '#F8FAF6' : 'var(--text-main)';
  const strongColor = inverted ? '#FFFFFF' : '#000000';

  return (
    <div className={`docreader-markdown ${className}`} style={{ color: textColor }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: '0 0 0.5rem 0', lineHeight: '1.65', color: textColor }}>
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: '1rem 0 0.5rem 0', color: textColor }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, margin: '0.9rem 0 0.4rem 0', color: textColor }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, margin: '0.75rem 0 0.35rem 0', color: textColor }}>
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '0 0 0.75rem 1.25rem', paddingLeft: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '0 0 0.75rem 1.25rem', paddingLeft: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ lineHeight: '1.55', color: textColor }}>
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: strongColor }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic', color: textColor }}>
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '1.5px solid var(--border-strong)',
                paddingLeft: '0.85rem',
                margin: '0.75rem 0',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                backgroundColor: 'rgba(20, 21, 16, 0.03)',
                padding: '0.5rem 0.85rem',
                borderRadius: '0 0.375rem 0.375rem 0',
              }}
            >
              {children}
            </blockquote>
          ),
          code: ({ inline, className: codeClassName, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  style={{
                    backgroundColor: inverted ? 'rgba(255, 255, 255, 0.16)' : 'rgba(20, 21, 16, 0.06)',
                    padding: '0.15rem 0.35rem',
                    borderRadius: '0.25rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.825em',
                    border: inverted ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-subtle)',
                    color: inverted ? '#FFFFFF' : 'var(--text-main)',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre
                style={{
                  backgroundColor: '#1E1F1B',
                  color: '#F1F2EE',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.5rem',
                  overflowX: 'auto',
                  margin: '0.75rem 0',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <code {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '0.75rem 0' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '0.5rem',
                }}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ backgroundColor: 'rgba(20, 21, 16, 0.05)', borderBottom: '1px solid var(--border-strong)' }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
              {children}
            </td>
          ),
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1rem 0' }} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
