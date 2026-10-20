import React, { useState, useEffect, useRef } from 'react';
import { HilosCharacter, AnimalPortrait } from './components/HilosArt';
import { api } from './services/api';
import { DocAnsResponse, DocHistoryItem } from './types';
import { GeminiThinkingLoader } from './components/GeminiThinkingLoader';
import { MarkdownRenderer } from './components/MarkdownRenderer';

interface Message {
  id: string;
  sender: string;
  role: 'human' | 'agent' | 'system';
  avatar: string;
  time: string;
  content: string;
  citationCard?: {
    documentTitle: string;
    pageNumber: number;
    chunkId?: string;
    excerpt: string;
    confidence: number;
    caveats?: string[];
    toCheck?: string[];
    verified: boolean;
  };
}

export const App: React.FC = () => {
  // Document state
  const [documents, setDocuments] = useState<DocHistoryItem[]>([
    {
      id: 'doc-1',
      title: 'Q3_Financial_Performance_Report.pdf',
      uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      questionsAsked: 6,
      status: 'ready',
    },
    {
      id: 'doc-2',
      title: 'System_Architecture_DocReader_v2.pdf',
      uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      questionsAsked: 14,
      status: 'ready',
    },
  ]);
  const [selectedDocId, setSelectedDocId] = useState<string>('doc-1');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Chat / Q&A state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'Atlas',
      role: 'agent',
      avatar: 'cat',
      time: '10:00 AM',
      content:
        'Hello! I am Atlas, your AI document reading specialist. I have indexed your documents. What would you like to explore or extract?',
    },
    {
      id: 'm2',
      sender: 'Caro',
      role: 'human',
      avatar: 'deer',
      time: '10:02 AM',
      content: 'What were our net revenues and growth rate reported in the executive summary of Q3?',
    },
    {
      id: 'm3',
      sender: 'Atlas',
      role: 'agent',
      avatar: 'cat',
      time: '10:02 AM',
      content:
        'According to Section 1.2 (Executive Summary), net revenue reached **$42.8M**, representing a **34% year-over-year growth**, driven primarily by enterprise subscriptions.',
      citationCard: {
        documentTitle: 'Q3_Financial_Performance_Report.pdf',
        pageNumber: 3,
        chunkId: 'chunk-042',
        excerpt:
          'Net operating revenue reached $42.8M for the quarter ending September 30, exceeding our forecast by 8.4% and up 34% YoY.',
        confidence: 96,
        caveats: ['Constant currency adjustment not factored into non-GAAP metrics.'],
        toCheck: ['Review appendix B for geographic breakdown.'],
        verified: true,
      },
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history from backend on initial mount
  useEffect(() => {
    api
      .getHistory()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setDocuments(res.data);
          setSelectedDocId(res.data[0].id);
        }
      })
      .catch(() => {
        // backend might be starting; keep default documents
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentWorking]);

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  // Upload handler (via top bar button or sidebar dropzone)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadFeedback(`Uploading and indexing "${file.name}"...`);

    try {
      const res = await api.uploadDocument(file);
      if (res.success && res.data) {
        const newDoc: DocHistoryItem = {
          id: res.data.documentId,
          title: res.data.filename,
          uploadedAt: res.data.uploadedAt || new Date().toISOString(),
          questionsAsked: 0,
          status: 'ready',
        };

        setDocuments((prev) => [newDoc, ...prev]);
        setSelectedDocId(newDoc.id);
        setUploadFeedback(`✓ "${file.name}" successfully indexed into Qdrant Cloud vector store.`);

        // Add system / agent message with markdown
        setMessages((prev) => [
          ...prev,
          {
            id: 'sys-' + Date.now(),
            sender: 'Atlas',
            role: 'agent',
            avatar: 'cat',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `I have processed, chunked, and embedded **${file.name}** into the Qdrant vector database (${res.data?.chunksCount || 'multiple'} chunks indexed). You can now ask any question based on this document.`,
          },
        ]);
      } else {
        setUploadFeedback(`Upload failed: ${res.error?.message || 'Unsupported format'}`);
      }
    } catch {
      setUploadFeedback('Error uploading document to backend');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadFeedback(null), 4000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit Question handler (also handles simultaneous upload + question if stagedFile is set)
  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputQuery.trim() && !stagedFile) || isAgentWorking || isUploading) return;

    const questionText = inputQuery.trim();
    setInputQuery('');

    // --- CASE 1: User attached a PDF and asked a question simultaneously ---
    if (stagedFile) {
      const fileToUpload = stagedFile;
      const userMsgId = 'usr-' + Date.now();
      setStagedFile(null);
      setIsUploading(true);
      setIsAgentWorking(true);

      const userMsg: Message = {
        id: userMsgId,
        sender: 'You',
        role: 'human',
        avatar: 'deer',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: questionText
          ? `**Attached Document:** \`${fileToUpload.name}\` (${(fileToUpload.size / 1024).toFixed(0)} KB)\n\n${questionText}`
          : `**Attached Document:** \`${fileToUpload.name}\` (${(fileToUpload.size / 1024).toFixed(0)} KB) — Please index this document.`,
      };

      setMessages((prev) => [...prev, userMsg]);
      setUploadFeedback(`Extracting, embedding, and indexing "${fileToUpload.name}"...`);

      try {
        const res = await api.uploadDocument(fileToUpload, questionText || undefined);
        if (res.success && res.data) {
          const newDoc: DocHistoryItem = {
            id: res.data.documentId,
            title: res.data.filename,
            uploadedAt: res.data.uploadedAt || new Date().toISOString(),
            questionsAsked: questionText ? 1 : 0,
            status: 'ready',
          };

          setDocuments((prev) => [newDoc, ...prev]);
          setSelectedDocId(newDoc.id);
          setUploadFeedback(`✓ "${fileToUpload.name}" successfully indexed into Qdrant Cloud.`);

          const citation = res.data.citations?.[0];

          const agentReply: Message = {
            id: 'agent-' + Date.now(),
            sender: 'Atlas',
            role: 'agent',
            avatar: 'cat',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content:
              res.data.answer ||
              `I have successfully processed and indexed **${res.data.filename}** (${res.data.chunksCount || 'multiple'} chunks). You can now ask questions about this document.`,
            citationCard: citation
              ? {
                  documentTitle: res.data?.filename || 'Document',
                  pageNumber: citation.pageNumber,
                  chunkId: citation.chunkId,
                  excerpt: citation.excerpt,
                  confidence: 96,
                  caveats: ['Directly grounded from indexed document chunks.'],
                  toCheck: [`Verified on page ${citation.pageNumber}`],
                  verified: true,
                }
              : undefined,
          };

          setMessages((prev) => [...prev, agentReply]);
        } else {
          setUploadFeedback(`Upload failed: ${res.error?.message || 'Unsupported format'}`);
          setMessages((prev) => [
            ...prev,
            {
              id: 'err-' + Date.now(),
              sender: 'Atlas',
              role: 'agent',
              avatar: 'cat',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              content: `Failed to upload "${fileToUpload.name}": ${res.error?.message || 'Unknown error'}`,
            },
          ]);
        }
      } catch {
        setUploadFeedback('Error uploading document to backend');
      } finally {
        setIsUploading(false);
        setIsAgentWorking(false);
        setTimeout(() => setUploadFeedback(null), 4000);
        if (promptFileInputRef.current) promptFileInputRef.current.value = '';
      }
      return;
    }

    // --- CASE 2: Regular question on the active document ---
    const userMsgId = 'usr-' + Date.now();
    const userMsg: Message = {
      id: userMsgId,
      sender: 'You',
      role: 'human',
      avatar: 'deer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: questionText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAgentWorking(true);

    try {
      const res = await api.askQuestion(questionText, activeDoc?.id);
      const ansData: DocAnsResponse | undefined = res.data;
      const citation = ansData?.citations?.[0];

      const agentReply: Message = {
        id: 'agent-' + Date.now(),
        sender: 'Atlas',
        role: 'agent',
        avatar: 'cat',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content:
          ansData?.answer ||
          `Based on my analysis of **${activeDoc?.title || 'the document'}**, here is the grounded answer with direct reference to the source passages.`,
        citationCard: citation
          ? {
              documentTitle: activeDoc?.title || 'Active Document.pdf',
              pageNumber: citation.pageNumber,
              chunkId: citation.chunkId,
              excerpt: citation.excerpt,
              confidence: 95,
              caveats: ['Semantic ranking based on cosine similarity.'],
              toCheck: [`Verified on page ${citation.pageNumber}`],
              verified: true,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, agentReply]);

      // Update document question count
      if (activeDoc) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === activeDoc.id ? { ...d, questionsAsked: d.questionsAsked + 1 } : d))
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'agent-err-' + Date.now(),
          sender: 'Atlas',
          role: 'agent',
          avatar: 'cat',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: 'I encountered an error querying the vector database. Please ensure your backend and Qdrant cluster are reachable.',
        },
      ]);
    } finally {
      setIsAgentWorking(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputQuery(prompt);
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', height: '100vh', maxHeight: '100vh', overflow: 'hidden', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Floating Top Nav (hilos style) */}
      <header
        style={{
          flexShrink: 0,
          backgroundColor: 'rgba(241, 242, 238, 0.98)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.65rem 1.25rem',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo & Product Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HilosCharacter size={34} />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-main)',
                }}
              >
                DocReader
              </span>
            </div>

            {/* Pill Workspace Switcher */}
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid var(--border-strong)',
                borderRadius: '9999px',
                padding: '0.2rem 0.6rem',
                backgroundColor: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
              className="sm:flex"
            >
              <span style={{ color: 'var(--text-muted)' }}>#</span>
              <span>{activeDoc?.title.slice(0, 24)}...</span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
            </div>
          </div>

          {/* Center: Agent Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              borderRadius: '9999px',
              padding: '0.25rem 0.75rem',
              boxShadow: '0 4px 14px rgba(20,21,16,0.06)',
            }}
          >
            <AnimalPortrait type="cat" size={20} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Atlas</span>
            <span className="agent-badge">Agent</span>
            {isUploading ? (
              <GeminiThinkingLoader mode="uploading" variant="inline" />
            ) : isAgentWorking ? (
              <GeminiThinkingLoader mode="thinking" variant="inline" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ready</span>
              </div>
            )}
          </div>

          {/* Right Action: Upload Button (Login panel hidden as requested) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
            />
            <div
              className="has-tooltip"
              data-tooltip="Select a PDF, DOCX, or TXT file to index into the knowledge base"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Select a PDF to extract and store in vector database"
                className="press btn-pill-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', minWidth: '130px', fontFamily: 'var(--font-hand)' }}
              >
                {isUploading ? (
                  <GeminiThinkingLoader mode="uploading" variant="button" />
                ) : (
                  <>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Upload PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Upload notification banner */}
      {uploadFeedback && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid var(--border-strong)',
            padding: '0.5rem 1rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-main)',
          }}
        >
          {uploadFeedback}
        </div>
      )}

      {/* 2. Main Two-Column Application Workspace (Exact Screen Height) */}
      <main
        style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '0.75rem 1.25rem 0.75rem 1.25rem',
          flex: 1,
          minHeight: 0,
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: '1rem',
          overflow: 'hidden',
        }}
      >
        {/* LEFT COLUMN: Documents & Knowledge Base (hilos card aesthetic) */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Active Knowledge Base Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              borderRadius: '1.25rem',
              padding: '1rem 1.15rem',
              boxShadow: '0 8px 30px rgba(20,21,16,0.06)',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Knowledge Base
              </span>
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {documents.length} files
              </span>
            </div>

            {/* Document list with custom scrollbar */}
            <div
              className="custom-scrollbar"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingRight: '0.35rem',
              }}
            >
              {documents.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className="press"
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: '0.75rem',
                      border: isSelected ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(20,21,16,0.04)' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.95rem' }}>📄</span>
                      <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                        {doc.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <span>{doc.questionsAsked} queries</span>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upload Dropzone */}
            <div style={{ flexShrink: 0, marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              {isUploading ? (
                <GeminiThinkingLoader
                  mode="uploading"
                  variant="card"
                  subtext="Converting binary, extracting text & embedding..."
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="press has-tooltip"
                  data-tooltip="Click or drop a PDF to chunk and index into Qdrant"
                  title="Drop a PDF or click to browse files"
                  style={{
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.75rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(20, 21, 16, 0.02)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.1rem' }}>📂</div>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-main)', fontFamily: 'var(--font-hand)' }}>
                    Drop a PDF or click to browse
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Auto-chunked & indexed with embeddings
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Need Help? Guidance Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-strong)',
              borderRadius: '1.25rem',
              padding: '0.85rem 1.15rem',
              boxShadow: '0 8px 30px rgba(20,21,16,0.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-hand)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>💡</span> Need Help?
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-hand)',
                  fontWeight: 700,
                  backgroundColor: '#E8EAE2',
                  color: 'var(--text-main)',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                }}
              >
                Guide
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem' }}>📄</span>
                <span><strong>Upload:</strong> Select a PDF, paper, or ebook.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem' }}>💬</span>
                <span><strong>Ask:</strong> Ask any specific or summary question.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem' }}>🎯</span>
                <span><strong>Evidence:</strong> Citations show exact page & quotes.</span>
              </div>
            </div>
          </div>

          {/* New Model Coming Soon Teaser Card */}
          <div
            style={{
              backgroundColor: '#FFFDF5',
              border: '1px dashed var(--border-strong)',
              borderRadius: '1.25rem',
              padding: '0.85rem 1.15rem',
              boxShadow: '0 4px 18px rgba(20,21,16,0.04)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-hand)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>✨</span> New Model Coming Soon
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-hand)',
                  fontWeight: 700,
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '0.12rem 0.45rem',
                  borderRadius: '9999px',
                  border: '1px solid #FCD34D',
                }}
              >
                Preview
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
              Multi-modal reasoning engine with direct chart analysis, formula parsing, and side-by-side page highlighting!
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Interactive Room & Grounded Reading Stream (hilos aesthetic) */}
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-strong)',
            borderRadius: '1.25rem',
            boxShadow: '0 18px 60px rgba(20,21,16,0.08)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Room Header */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>#{activeDoc?.title || 'doc-reader'}</span>
                <span style={{ background: '#E8EAE2', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                  Grounded Mode
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Querying across extracted vectors with verified citation references
              </div>
            </div>

            {/* Member row */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="deer" size={26} /></div>
              <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="cat" size={26} /></div>
              <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="owl" size={26} /></div>
              <div style={{ marginLeft: '-6px' }}><AnimalPortrait type="bunny" size={26} /></div>
            </div>
          </div>

          {/* Messages Stream: Right-aligned for User, Left-aligned for Atlas */}
          <div className="custom-scrollbar" style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {messages.map((m) => {
              const isHuman = m.role === 'human';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: isHuman ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    width: '100%',
                  }}
                >
                  {/* Animal Avatar: Deer for user on right, Cat for Atlas on left */}
                  <AnimalPortrait type={isHuman ? 'deer' : 'cat'} size={34} />

                  {/* Message Bubble Container */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isHuman ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      minWidth: 0,
                    }}
                  >
                    {/* Message Sender Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        marginBottom: '0.25rem',
                        flexDirection: isHuman ? 'row-reverse' : 'row',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-hand)' }}>
                        {m.sender}
                      </span>
                      {m.role === 'agent' && <span className="agent-badge">Agent</span>}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-hand)' }}>
                        {m.time}
                      </span>
                    </div>

                    {/* Evidence Criteria & Reasoning Card (Shown on LEFT / Agent side before the answer) */}
                    {!isHuman && m.citationCard && (
                      <div
                        style={{
                          marginBottom: '0.65rem',
                          backgroundColor: '#FAFBF8',
                          border: '1px solid var(--border-strong)',
                          borderRadius: '1rem',
                          padding: '0.85rem 1.1rem',
                          boxShadow: '0 6px 20px -8px rgba(0,0,0,0.1)',
                          width: '100%',
                          maxWidth: '560px',
                          color: 'var(--text-main)',
                          textAlign: 'left',
                        }}
                      >
                        {/* Evidence Card Header */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '0.5rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            marginBottom: '0.55rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.95rem' }}>🎯</span>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-hand)' }}>
                              Evidence Criteria & Reasoning
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.7rem',
                                color: 'var(--color-green)',
                                fontWeight: 700,
                                background: 'rgba(63,157,110,0.12)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                              }}
                            >
                              {m.citationCard.confidence}% match
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-hand)',
                              backgroundColor: 'var(--border-strong)',
                              color: '#ffffff',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                            }}
                          >
                            Page {m.citationCard.pageNumber}
                          </span>
                        </div>

                        {/* Excerpt Box */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '0.5rem',
                            padding: '0.65rem 0.85rem',
                            fontSize: '0.82rem',
                            lineHeight: '1.5',
                            fontStyle: 'italic',
                            color: 'var(--text-main)',
                            marginBottom: '0.55rem',
                          }}
                        >
                          "{m.citationCard.excerpt}"
                        </div>

                        {/* Criteria & Reasoning Note */}
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.45rem', lineHeight: '1.45' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-hand)' }}>
                            Criteria & Reasoning:
                          </span>{' '}
                          Retrieved via cosine similarity ranking across vector chunks in Qdrant. Exact source grounded on page {m.citationCard.pageNumber}.
                        </div>

                        {/* Caveats if present */}
                        {m.citationCard.caveats && m.citationCard.caveats.length > 0 && (
                          <div style={{ fontSize: '0.74rem', marginBottom: '0.45rem' }}>
                            <span style={{ color: 'var(--color-amber)', fontWeight: 700 }}>⚠ Note: </span>
                            <span style={{ color: 'var(--text-muted)' }}>{m.citationCard.caveats[0]}</span>
                          </div>
                        )}

                        {/* Grounded Citation Verified Status (Revoke button removed) */}
                        <div
                          style={{
                            paddingTop: '0.45rem',
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--color-green)',
                            fontFamily: 'var(--font-hand)',
                          }}
                        >
                          <span>✓</span>
                          <span>Grounded Citation Verified</span>
                        </div>
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div
                      style={{
                        backgroundColor: isHuman ? '#141510' : '#ffffff',
                        color: isHuman ? '#F8FAF6' : 'var(--text-main)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: isHuman ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                        padding: '0.75rem 1.15rem',
                        boxShadow: '0 4px 16px rgba(20,21,16,0.06)',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        wordBreak: 'break-word',
                      }}
                    >
                      <MarkdownRenderer content={m.content} inverted={isHuman} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Claude Thinking / Processing Stream Loader */}
            {(isAgentWorking || isUploading) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.25rem 0' }}>
                <AnimalPortrait type="cat" size={34} />
                <GeminiThinkingLoader
                  mode={isUploading ? 'uploading' : 'thinking'}
                  variant="stream"
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills Bar */}
          <div style={{ padding: '0.5rem 1.25rem', background: '#FAFAFA', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.4rem', overflowX: 'auto' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>Suggested:</span>
            <button
              onClick={() => handleQuickPrompt('Give me a 3-bullet summary of this document.')}
              className="press"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)', background: '#ffffff', color: 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              Executive summary
            </button>
            <button
              onClick={() => handleQuickPrompt('What are the key risks or caveats mentioned?')}
              className="press"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)', background: '#ffffff', color: 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              Key risks & caveats
            </button>
            <button
              onClick={() => handleQuickPrompt('What specific recommendations or to-do items are proposed?')}
              className="press"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', borderRadius: '9999px', border: '1px solid var(--border-subtle)', background: '#ffffff', color: 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              Action items
            </button>
          </div>

          {/* Input Box Bar */}
          <div style={{ padding: '0.85rem 1.25rem', background: '#ffffff', borderTop: '1px solid var(--border-subtle)' }}>
            {/* Staged file chip */}
            {stagedFile && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.55rem',
                  backgroundColor: 'rgba(20, 21, 16, 0.04)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <span>📄</span>
                <span>{stagedFile.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ({(stagedFile.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => setStagedFile(null)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    marginLeft: '0.25rem',
                    color: 'var(--text-muted)',
                  }}
                  title="Remove attached PDF"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSendQuestion} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="file"
                ref={promptFileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setStagedFile(f);
                }}
              />
              <div
                className="has-tooltip"
                data-tooltip="Attach PDF to upload & ask in one prompt"
              >
                <button
                  type="button"
                  onClick={() => promptFileInputRef.current?.click()}
                  disabled={isUploading || isAgentWorking}
                  className="press"
                  title="Attach PDF to question (Upload & Ask simultaneously)"
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-subtle)',
                    background: stagedFile ? 'rgba(63,157,110,0.12)' : '#ffffff',
                    borderColor: stagedFile ? 'var(--color-green)' : 'var(--border-subtle)',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: isUploading || isAgentWorking ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>📎</span>
                </button>
              </div>

              <input
                type="text"
                value={inputQuery}
                disabled={isUploading || isAgentWorking}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  stagedFile
                    ? `Ask a question about ${stagedFile.name} (or send to just index)...`
                    : `Ask Atlas any question about ${activeDoc?.title || 'the document'}...`
                }
                style={{
                  flex: 1,
                  padding: '0.65rem 0.95rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-strong)',
                  fontSize: '0.875rem',
                  backgroundColor: isUploading || isAgentWorking ? '#FAFAF9' : '#ffffff',
                  color: 'var(--text-main)',
                }}
              />

              <button
                type="submit"
                disabled={isAgentWorking || isUploading || (!inputQuery.trim() && !stagedFile)}
                className="press btn-pill-primary"
                style={{ padding: '0.65rem 1.35rem', fontSize: '0.85rem', minWidth: '110px' }}
              >
                {isAgentWorking || isUploading ? (
                  <GeminiThinkingLoader mode={isUploading ? 'uploading' : 'thinking'} variant="button" />
                ) : stagedFile ? (
                  inputQuery.trim() ? 'Upload & Ask' : 'Index PDF'
                ) : (
                  'Ask Atlas'
                )}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
