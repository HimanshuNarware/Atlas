import React, { useState, useEffect } from 'react';

export type LoaderMode = 'thinking' | 'uploading';

interface GeminiThinkingLoaderProps {
  mode?: LoaderMode;
  customPhrases?: string[];
  subtext?: string;
  variant?: 'stream' | 'card' | 'inline' | 'button';
}

const CLAUDE_THINKING_PHRASES = [
  'Thinking...',
  'Reading document...',
  'Generating...',
];

const CLAUDE_UPLOADING_PHRASES = [
  'Uploading PDF...',
  'Reading document...',
  'Indexing knowledge base...',
];

export const GeminiThinkingLoader: React.FC<GeminiThinkingLoaderProps> = ({
  mode = 'thinking',
  customPhrases,
  subtext,
  variant = 'stream',
}) => {
  const phrases = customPhrases || (mode === 'uploading' ? CLAUDE_UPLOADING_PHRASES : CLAUDE_THINKING_PHRASES);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setFade(true);
      }, 200);
    }, 2400);

    return () => clearInterval(interval);
  }, [phrases.length]);

  // Claude warm terracotta sunburst/star icon
  const ClaudeStarIcon = ({ size = 18 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="claude-pulse-spin"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="3.5" fill="#C2410C" />
      <path
        d="M12 2V6M12 18V22M2 12H6M18 12H22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
        stroke="#D97706"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'button') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
        <ClaudeStarIcon size={14} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-hand)' }}>
          {phrases[phraseIndex]}
        </span>
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-strong)',
          borderRadius: '9999px',
          padding: '0.2rem 0.65rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <ClaudeStarIcon size={13} />
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: 'var(--font-hand)',
            color: 'var(--text-main)',
            opacity: fade ? 1 : 0.25,
            transition: 'opacity 0.2s ease',
          }}
        >
          {phrases[phraseIndex]}
        </span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px dashed var(--border-strong)',
          borderRadius: '1rem',
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '0.65rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 30%, rgba(217, 119, 6, 0.08), transparent 70%), #ffffff',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="claude-pulse-halo"
            style={{
              position: 'absolute',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
            }}
          />
          <ClaudeStarIcon size={26} />
        </div>

        <div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              fontFamily: 'var(--font-hand)',
              color: 'var(--text-main)',
              opacity: fade ? 1 : 0.3,
              transition: 'opacity 0.2s ease',
              minHeight: '1.3rem',
            }}
          >
            {phrases[phraseIndex]}
          </div>
          {subtext && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {subtext}
            </div>
          )}
        </div>

        {/* Shimmer progress bar */}
        <div
          style={{
            width: '140px',
            height: '3px',
            backgroundColor: 'rgba(20, 21, 16, 0.08)',
            borderRadius: '9999px',
            overflow: 'hidden',
            marginTop: '0.2rem',
          }}
        >
          <div className="claude-shimmer-bar" />
        </div>
      </div>
    );
  }

  // Default: Stream variant (in chat stream like Claude's clean thinking block)
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.55rem 0.95rem',
        borderRadius: '9999px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        background: '#FAF9F5',
      }}
    >
      <ClaudeStarIcon size={16} />

      <div
        style={{
          fontSize: '0.825rem',
          fontWeight: 600,
          fontFamily: 'var(--font-hand)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span
          style={{
            opacity: fade ? 1 : 0.25,
            transition: 'opacity 0.2s ease',
          }}
        >
          {phrases[phraseIndex]}
        </span>
        <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
          <span className="typing-dot" style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#C2410C' }} />
          <span className="typing-dot" style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#C2410C' }} />
          <span className="typing-dot" style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#C2410C' }} />
        </span>
      </div>
    </div>
  );
};
