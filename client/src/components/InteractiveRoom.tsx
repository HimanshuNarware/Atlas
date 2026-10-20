import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AnimalPortrait } from './HilosArt';
import { DocUploadResponse, DocAnsResponse, DocHistoryItem } from '../types';

export const InteractiveRoom: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<'web-redesign' | 'ship-room' | 'doc-reader'>('web-redesign');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: string;
    role: 'human' | 'agent' | 'system';
    avatar: string;
    time: string;
    content: string;
    prCard?: {
      title: string;
      prNumber: number;
      additions: number;
      deletions: number;
      description: string;
      caveats: string[];
      todo: string[];
      approved: boolean;
      citation?: { page: number; excerpt: string };
    };
  }>>([
    {
      id: 'm1',
      sender: 'Caro',
      role: 'human',
      avatar: 'caro',
      time: '9:41',
      content: 'Can we make the pricing headline bigger and add a customer testimonial from our latest document?',
    },
    {
      id: 'm2',
      sender: 'Atlas',
      role: 'agent',
      avatar: 'cat',
      time: '9:41',
      content: 'On it. Bumping the headline to 48px and extracting citations from the uploaded spec. Opening a branch.',
      prCard: {
        title: 'Pricing page: bigger headline + doc citations',
        prNumber: 128,
        additions: 42,
        deletions: 7,
        description: 'Headline is now 48px and left-aligned. Pulled customer quote from the uploaded document into a testimonial block under the fold.',
        caveats: ['Mobile testimonial wraps to two lines; verify on small screens.'],
        todo: ['Swap in a real customer photo', 'Confirm final copy in the thread'],
        approved: true,
        citation: {
          page: 1,
          excerpt: 'Customer reported 4x speedup after deploying agents directly in the team channels.',
        },
      },
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<DocHistoryItem[]>([]);

  useEffect(() => {
    // Fetch backend history on load
    api.getHistory()
      .then((res) => {
        if (res.success && res.data) setHistoryItems(res.data);
      })
      .catch(() => {});
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() && !selectedFile) return;

    const questionText = inputQuestion;
    setInputQuestion('');

    // Add user message to conversation
    const userMsgId = 'u-' + Date.now();
    const newMsg = {
      id: userMsgId,
      sender: 'You',
      role: 'human' as const,
      avatar: 'deer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: questionText || `Uploaded document: ${selectedFile?.name}`,
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsAgentWorking(true);

    try {
      let uploadMeta: DocUploadResponse | undefined;
      if (selectedFile) {
        setUploadStatus('Uploading document...');
        const uploadRes = await api.uploadDocument(selectedFile);
        if (uploadRes.success && uploadRes.data) {
          uploadMeta = uploadRes.data;
          setUploadStatus(`Uploaded: ${uploadRes.data.filename}`);
        }
        setSelectedFile(null);
      }

      // Query AI question answering endpoint
      const ansRes = await api.askQuestion(questionText || 'Summarize the document key points', uploadMeta?.documentId);
      
      const answerData: DocAnsResponse | undefined = ansRes.data;
      const citationExcerpt = answerData?.citations?.[0]?.excerpt || 'Relevant verified passage extracted from repository document.';
      const citationPage = answerData?.citations?.[0]?.pageNumber || 1;

      // Add agent reply
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: 'a-' + Date.now(),
            sender: 'Atlas',
            role: 'agent',
            avatar: 'cat',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: answerData?.answer || `I processed your request against the document repository. Generated pull request with verified references.`,
            prCard: {
              title: `Update based on query: "${questionText.slice(0, 35)}..."`,
              prNumber: Math.floor(Math.random() * 50) + 130,
              additions: 28,
              deletions: 3,
              description: answerData?.answer || 'Code changes and citations updated automatically by agent Atlas.',
              caveats: ['Check responsiveness on mobile viewports.'],
              todo: ['Review evidence citations', 'Human sign-off before deploy'],
              approved: false,
              citation: {
                page: citationPage,
                excerpt: citationExcerpt,
              },
            },
          },
        ]);
        setIsAgentWorking(false);
      }, 700);
    } catch {
      setIsAgentWorking(false);
    }
  };

  const toggleApproval = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.prCard) {
          return {
            ...m,
            prCard: {
              ...m.prCard,
              approved: !m.prCard.approved,
            },
          };
        }
        return m;
      })
    );
  };

  return (
    <div className="mockup-window" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Channel Header Bar */}
      <div className="mockup-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>#</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveChannel('web-redesign')}
              style={{
                fontWeight: activeChannel === 'web-redesign' ? 700 : 500,
                fontSize: '0.85rem',
                color: activeChannel === 'web-redesign' ? 'var(--text-main)' : 'var(--text-muted)',
                background: activeChannel === 'web-redesign' ? 'rgba(20,21,16,0.06)' : 'transparent',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
              }}
            >
              web-redesign
            </button>
            <button
              onClick={() => setActiveChannel('ship-room')}
              style={{
                fontWeight: activeChannel === 'ship-room' ? 700 : 500,
                fontSize: '0.85rem',
                color: activeChannel === 'ship-room' ? 'var(--text-main)' : 'var(--text-muted)',
                background: activeChannel === 'ship-room' ? 'rgba(20,21,16,0.06)' : 'transparent',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
              }}
            >
              ship-room
            </button>
            <button
              onClick={() => setActiveChannel('doc-reader')}
              style={{
                fontWeight: activeChannel === 'doc-reader' ? 700 : 500,
                fontSize: '0.85rem',
                color: activeChannel === 'doc-reader' ? 'var(--text-main)' : 'var(--text-muted)',
                background: activeChannel === 'doc-reader' ? 'rgba(20,21,16,0.06)' : 'transparent',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
              }}
            >
              doc-reader
            </button>
          </div>
        </div>

        {/* Member Avatars Row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="fox" size={24} /></div>
            <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="cat" size={24} /></div>
            <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="owl" size={24} /></div>
            <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="duck" size={24} /></div>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="custom-scrollbar" style={{ padding: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <AnimalPortrait type={m.avatar} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.sender}</span>
                  {m.role === 'agent' && <span className="agent-badge">Agent</span>}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{m.time}</span>
                </div>
                <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                  {m.content}
                </div>

                {/* PR & Citation Card */}
                {m.prCard && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '0.875rem 1rem',
                      boxShadow: '0 8px 24px -10px rgba(0,0,0,0.1)',
                      maxWidth: '520px',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        paddingBottom: '0.6rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        marginBottom: '0.6rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.825rem' }}>{m.prCard.title}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span
                          style={{
                            background: '#141510',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ↗ Preview
                        </span>
                        <span
                          style={{
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.68rem',
                            fontWeight: 500,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          PR #{m.prCard.prNumber}{' '}
                          <span style={{ color: 'var(--color-green)' }}>+{m.prCard.additions}</span>{' '}
                          <span style={{ color: 'var(--color-red)' }}>-{m.prCard.deletions}</span>
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: '1.45' }}>
                      {m.prCard.description}
                    </p>

                    {/* Citations block */}
                    {m.prCard.citation && (
                      <div
                        style={{
                          background: '#F8FAF6',
                          border: '1px solid #E2E8DF',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.75rem',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem' }}>
                          📄 Document Citation (Page {m.prCard.citation.page}):
                        </div>
                        <div style={{ fontStyle: 'italic', color: 'var(--text-main)' }}>
                          "{m.prCard.citation.excerpt}"
                        </div>
                      </div>
                    )}

                    {/* Caveats */}
                    {m.prCard.caveats.length > 0 && (
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                        <div style={{ color: 'var(--color-amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ⚠ Caveats
                        </div>
                        <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {m.prCard.caveats.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Approval Button */}
                    <div
                      style={{
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {m.prCard.approved ? (
                          <>
                            <span style={{ color: 'var(--color-green)', fontWeight: 700 }}>✓ Approved</span>
                            <span style={{ color: 'var(--text-muted)' }}>by Caro. Ready to ship.</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>Awaiting human approval</span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleApproval(m.id)}
                        className="press"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          border: '1px solid var(--border-strong)',
                          background: m.prCard.approved ? '#ffffff' : '#141510',
                          color: m.prCard.approved ? '#141510' : '#ffffff',
                        }}
                      >
                        {m.prCard.approved ? 'Revoke Approval' : 'Approve & Merge'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Working status indicator */}
        {isAgentWorking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
            <AnimalPortrait type="cat" size={32} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span className="breathe" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-amber)' }} />
              <span>Atlas is working</span>
              <span style={{ display: 'inline-flex', gap: '2px' }}>
                <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6A6C62' }} />
                <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6A6C62' }} />
                <span className="typing-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6A6C62' }} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input & Upload Bar */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1rem', background: '#FAFAFA' }}>
        {uploadStatus && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-green)', marginBottom: '0.4rem' }}>
            ✓ {uploadStatus}
          </div>
        )}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* File attachment button */}
          <label
            className="press"
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              fontSize: '0.8rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              flexShrink: 0,
            }}
          >
            <span>📎 {selectedFile ? selectedFile.name.slice(0, 14) + '...' : 'PDF'}</span>
            <input
              type="file"
              style={{ display: 'none' }}
              accept=".pdf,.txt,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </label>

          <input
            type="text"
            className="form-control"
            style={{
              flex: 1,
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
              background: '#ffffff',
            }}
            placeholder="Ask a question or request a change from Atlas..."
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
          />

          <button
            type="submit"
            disabled={isAgentWorking || (!inputQuestion.trim() && !selectedFile)}
            className="press btn-pill-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.8rem' }}
          >
            Send
          </button>
        </form>
      </div>

      {/* Mini history tray */}
      {historyItems.length > 0 && (
        <div style={{ padding: '0.5rem 1rem', background: '#F1F2EE', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>Repo Documents:</span>
          {historyItems.map((item) => (
            <span key={item.id} style={{ background: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
              📄 {item.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
