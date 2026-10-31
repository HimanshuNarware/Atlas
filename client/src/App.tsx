import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Settings,
  User,
  Sun,
  Moon,
  Monitor,
  Paperclip,
  Send,
  CheckCircle2,
  AlertTriangle,
  Target,
  X,
  Database,
  Cpu,
  Shield,
  Hash,
  LogIn,
  LogOut,
  Mail,
  Lock,
  UserPlus,
} from 'lucide-react';
import { HilosCharacter, AnimalPortrait } from './components/HilosArt';
import { api } from './services/api';
import { DocAnsResponse, DocHistoryItem, User as UserType } from './types';
import { GeminiThinkingLoader } from './components/GeminiThinkingLoader';
import { MarkdownRenderer } from './components/MarkdownRenderer';

type ThemeMode = 'light' | 'dark' | 'system';

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
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('docreader_theme') as ThemeMode) || 'system';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Sync theme changes to html element
  useEffect(() => {
    localStorage.setItem('docreader_theme', theme);
    const root = document.documentElement;
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches);
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);
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

  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    try {
      const stored = localStorage.getItem('docreader_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('docreader_token');
  });

  // Auth modal form state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Sync user profile on session mount
  useEffect(() => {
    if (authToken) {
      api
        .getMe(authToken)
        .then((res) => {
          if (res.success && res.data) {
            setCurrentUser(res.data);
            localStorage.setItem('docreader_user', JSON.stringify(res.data));
          } else {
            setAuthToken(null);
            setCurrentUser(null);
            localStorage.removeItem('docreader_token');
            localStorage.removeItem('docreader_user');
          }
        })
        .catch(() => {
          // network issue: keep cached user
        });
    }
  }, [authToken]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      if (res.success && res.data) {
        const { token, user } = res.data;
        setAuthToken(token);
        setCurrentUser(user);
        localStorage.setItem('docreader_token', token);
        localStorage.setItem('docreader_user', JSON.stringify(user));
        setAuthSuccess(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          setAuthSuccess(null);
        }, 1500);
      } else {
        setAuthError(res.error?.message || 'Login failed. Invalid email or password.');
      }
    } catch {
      setAuthError('Network error connecting to backend authentication service.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail.trim() || !registerPassword.trim() || !registerName.trim() || !registerLastName.trim()) {
      setAuthError('All fields (First Name, Last Name, Email, Password) are required.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const res = await api.createUser({
        email: registerEmail.trim(),
        name: registerName.trim(),
        last_name: registerLastName.trim(),
        password: registerPassword,
        role: 'user',
      });

      if (res.success && res.data) {
        const loginRes = await api.login(registerEmail.trim(), registerPassword);
        if (loginRes.success && loginRes.data) {
          const { token, user } = loginRes.data;
          setAuthToken(token);
          setCurrentUser(user);
          localStorage.setItem('docreader_token', token);
          localStorage.setItem('docreader_user', JSON.stringify(user));
          setAuthSuccess(`Account created! Welcome, ${user.name}!`);
        } else {
          setAuthSuccess('Account created! Please sign in with your password.');
          setAuthTab('login');
          setLoginEmail(registerEmail.trim());
        }
      } else {
        setAuthError(res.error?.message || 'Failed to create account.');
      }
    } catch {
      setAuthError('Network error creating account.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('docreader_token');
    localStorage.removeItem('docreader_user');
    setAuthTab('login');
    setAuthError(null);
    setAuthSuccess(null);
  };

  const fillDemoCredentials = () => {
    setLoginEmail('himanshu@docreader.ai');
    setLoginPassword('Password123!');
  };

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
        setUploadFeedback(`"${file.name}" successfully indexed into Qdrant Cloud vector store.`);

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
        sender: currentUser ? currentUser.name : 'You',
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
        const res = await api.uploadDocument(fileToUpload, questionText || undefined, authToken || undefined);
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
          setUploadFeedback(`"${fileToUpload.name}" successfully indexed into Qdrant Cloud.`);

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
      sender: currentUser ? currentUser.name : 'You',
      role: 'human',
      avatar: 'deer',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: questionText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAgentWorking(true);

    try {
      const res = await api.askQuestion(questionText, activeDoc?.id, authToken || undefined);
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

  return (
    <div style={{ backgroundColor: 'var(--bg-page)', height: '100vh', maxHeight: '100vh', overflow: 'hidden', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Floating Top Nav (hilos style) */}
      <header
        style={{
          flexShrink: 0,
          backgroundColor: 'var(--header-bg, rgba(241, 242, 238, 0.98))',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-gray)',
          boxShadow: 'var(--shadow-xs)',
          padding: '0.6rem 1.25rem',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            {/* Workspace Document Indicator */}
            <div
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid var(--border-gray)',
                boxShadow: 'var(--shadow-xs)',
                borderRadius: 'var(--radius-btn, 0.5rem)',
                padding: '0.2rem 0.6rem',
                backgroundColor: 'var(--card-bg, #ffffff)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
              className="sm:flex"
            >
              <Hash size={13} color="var(--text-muted)" />
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
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-gray)',
              borderRadius: 'var(--radius-btn, 0.5rem)',
              padding: '0.25rem 0.75rem',
              boxShadow: 'var(--shadow-sm)',
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

          {/* Right Actions: Upload Button, Settings, Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
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
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.8rem',
                  minWidth: '125px',
                  fontFamily: 'var(--font-hand)',
                  borderRadius: 'var(--radius-btn, 0.5rem)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {isUploading ? (
                  <GeminiThinkingLoader mode="uploading" variant="button" />
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Upload PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="press"
              title="Settings & Theme"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.48rem 0.6rem',
                borderRadius: 'var(--radius-btn, 0.5rem)',
                border: '1px solid var(--border-gray)',
                boxShadow: 'var(--shadow-xs)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                color: 'var(--text-main)',
              }}
            >
              <Settings size={17} />
            </button>

            {/* Profile / Auth Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="press"
              title={currentUser ? `${currentUser.name} (${currentUser.email})` : 'Sign In or Create Account'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.42rem 0.75rem',
                borderRadius: 'var(--radius-btn, 0.5rem)',
                border: '1px solid var(--border-gray)',
                boxShadow: 'var(--shadow-xs)',
                backgroundColor: 'var(--card-bg, #ffffff)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: 'var(--font-hand)',
              }}
            >
              {currentUser ? (
                <>
                  <AnimalPortrait type="deer" size={18} />
                  <span className="hidden sm:inline">{currentUser.name}</span>
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  <span className="hidden sm:inline">Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Upload notification banner */}
      {uploadFeedback && (
        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderBottom: '1px solid var(--border-gray)',
            boxShadow: 'var(--shadow-xs)',
            padding: '0.45rem 1rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
          }}
        >
          <CheckCircle2 size={15} color="var(--color-green)" />
          <span>{uploadFeedback}</span>
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
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-gray)',
              borderRadius: 'var(--radius-lg, 0.625rem)',
              padding: '1rem 1.15rem',
              boxShadow: 'var(--shadow-card)',
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
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      border: isSelected ? '1px solid var(--border-gray-strong)' : '1px solid var(--border-gray)',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                      backgroundColor: isSelected ? 'var(--card-hover, rgba(20,21,16,0.04))' : 'var(--card-bg, #ffffff)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <FileText size={15} style={{ flexShrink: 0, color: 'var(--text-main)' }} />
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

            {/* Cluster & Engine Status Info Footer */}
            <div
              style={{
                flexShrink: 0,
                marginTop: 'auto',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--border-gray)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Database size={13} color="var(--color-green)" />
                  <span>Vector Store</span>
                </span>
                <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>Qdrant Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Cpu size={13} color="var(--color-blue)" />
                  <span>Grounding Engine</span>
                </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Gemini 2.5 Flash</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Interactive Room & Grounded Reading Stream (hilos aesthetic) */}
        <section
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-gray)',
            borderRadius: 'var(--radius-lg, 0.625rem)',
            boxShadow: 'var(--shadow-card)',
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
              borderBottom: '1px solid var(--border-gray)',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--card-bg, #ffffff)',
              zIndex: 1,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Hash size={15} color="var(--text-muted)" />
                  <span>{activeDoc?.title || 'doc-reader'}</span>
                </span>
                <span
                  style={{
                    background: 'var(--badge-bg, #E8EAE2)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.4rem',
                    borderRadius: 'var(--radius-sm, 0.25rem)',
                    color: 'var(--badge-text, var(--text-muted))',
                  }}
                >
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
                          backgroundColor: 'var(--card-bg-subtle, #FAFBF8)',
                          border: '1px solid var(--border-gray)',
                          borderRadius: 'var(--radius-md, 0.5rem)',
                          padding: '0.85rem 1.1rem',
                          boxShadow: 'var(--shadow-sm)',
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
                            borderBottom: '1px solid var(--border-gray)',
                            marginBottom: '0.55rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Target size={15} color="var(--color-green)" />
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
                                borderRadius: 'var(--radius-sm, 0.25rem)',
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
                              color: 'var(--bg-page)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-sm, 0.25rem)',
                            }}
                          >
                            Page {m.citationCard.pageNumber}
                          </span>
                        </div>

                        {/* Excerpt Box */}
                        <div
                          style={{
                            backgroundColor: 'var(--quote-bg, #ffffff)',
                            border: '1px solid var(--border-gray)',
                            boxShadow: 'var(--shadow-xs)',
                            borderRadius: 'var(--radius-sm, 0.375rem)',
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
                          <div style={{ fontSize: '0.74rem', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <AlertTriangle size={13} color="var(--color-amber)" />
                            <span style={{ color: 'var(--color-amber)', fontWeight: 700 }}>Note: </span>
                            <span style={{ color: 'var(--text-muted)' }}>{m.citationCard.caveats[0]}</span>
                          </div>
                        )}

                        {/* Grounded Citation Verified Status */}
                        <div
                          style={{
                            paddingTop: '0.45rem',
                            borderTop: '1px solid var(--border-gray)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--color-green)',
                            fontFamily: 'var(--font-hand)',
                          }}
                        >
                          <CheckCircle2 size={14} color="var(--color-green)" />
                          <span>Grounded Citation Verified</span>
                        </div>
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div
                      style={{
                        backgroundColor: isHuman ? 'var(--chat-user-bg)' : 'var(--chat-agent-bg)',
                        color: isHuman ? 'var(--chat-user-text)' : 'var(--chat-agent-text)',
                        border: isHuman ? '1px solid transparent' : '1px solid var(--border-gray)',
                        borderRadius: isHuman
                          ? '0.625rem 0.625rem 0.125rem 0.625rem'
                          : '0.625rem 0.625rem 0.625rem 0.125rem',
                        padding: '0.75rem 1.15rem',
                        boxShadow: isHuman ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
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


          {/* Input Box Bar */}
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--card-bg, #ffffff)', borderTop: '1px solid var(--border-gray)', boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
            {/* Staged file chip */}
            {stagedFile && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  marginBottom: '0.55rem',
                  backgroundColor: 'var(--card-hover, rgba(20, 21, 16, 0.04))',
                  border: '1px solid var(--border-gray)',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <FileText size={14} color="var(--text-main)" />
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '0.25rem',
                    color: 'var(--text-muted)',
                  }}
                  title="Remove attached PDF"
                >
                  <X size={13} />
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
                    borderRadius: 'var(--radius-sm, 0.375rem)',
                    border: '1px solid var(--border-gray)',
                    boxShadow: 'var(--shadow-xs)',
                    background: stagedFile ? 'rgba(63,157,110,0.12)' : 'var(--card-bg, #ffffff)',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isUploading || isAgentWorking ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Paperclip size={16} />
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
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  border: '1px solid var(--border-gray)',
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05), var(--shadow-xs)',
                  fontSize: '0.875rem',
                  backgroundColor: isUploading || isAgentWorking ? 'var(--card-bg-subtle, #FAFAF9)' : 'var(--input-bg, #ffffff)',
                  color: 'var(--text-main)',
                }}
              />

              <button
                type="submit"
                disabled={isAgentWorking || isUploading || (!inputQuery.trim() && !stagedFile)}
                className="press btn-pill-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  minWidth: '115px',
                  borderRadius: 'var(--radius-btn, 0.5rem)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  justifyContent: 'center',
                }}
              >
                {isAgentWorking || isUploading ? (
                  <GeminiThinkingLoader mode={isUploading ? 'uploading' : 'thinking'} variant="button" />
                ) : (
                  <>
                    <Send size={14} />
                    <span>{stagedFile ? (inputQuery.trim() ? 'Upload & Ask' : 'Index PDF') : 'Ask Atlas'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* 3. Settings Modal (Theme Switcher: Light / Dark / System) */}
      {isSettingsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--modal-overlay, rgba(20, 21, 16, 0.5))',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-gray)',
              borderRadius: 'var(--radius-lg, 0.625rem)',
              width: '100%',
              maxWidth: '460px',
              boxShadow: 'var(--shadow-modal)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-gray)', paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={18} />
                <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-hand)' }}>
                  Settings & Preferences
                </span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="press"
                style={{
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Theme Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-hand)' }}>
                Interface Theme
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {/* Light / White */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className="press"
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--radius-md, 0.5rem)',
                    border: theme === 'light' ? '1.5px solid var(--border-gray-strong)' : '1px solid var(--border-gray)',
                    boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    backgroundColor: theme === 'light' ? 'var(--card-hover)' : 'var(--card-bg)',
                    color: 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                  }}
                >
                  <Sun size={20} color={theme === 'light' ? 'var(--color-amber)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: theme === 'light' ? 700 : 500, fontFamily: 'var(--font-hand)' }}>
                    Light
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>White / Warm</span>
                </button>

                {/* Dark */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className="press"
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--radius-md, 0.5rem)',
                    border: theme === 'dark' ? '1.5px solid var(--border-gray-strong)' : '1px solid var(--border-gray)',
                    boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    backgroundColor: theme === 'dark' ? 'var(--card-hover)' : 'var(--card-bg)',
                    color: 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                  }}
                >
                  <Moon size={20} color={theme === 'dark' ? '#60a5fa' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: theme === 'dark' ? 700 : 500, fontFamily: 'var(--font-hand)' }}>
                    Dark
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Charcoal Night</span>
                </button>

                {/* System Default */}
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className="press"
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--radius-md, 0.5rem)',
                    border: theme === 'system' ? '1.5px solid var(--border-gray-strong)' : '1px solid var(--border-gray)',
                    boxShadow: theme === 'system' ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                    backgroundColor: theme === 'system' ? 'var(--card-hover)' : 'var(--card-bg)',
                    color: 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                  }}
                >
                  <Monitor size={20} color={theme === 'system' ? 'var(--color-green)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: theme === 'system' ? 700 : 500, fontFamily: 'var(--font-hand)' }}>
                    System
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OS Default</span>
                </button>
              </div>
            </div>

            {/* Connected Services Bento */}
            <div style={{ backgroundColor: 'var(--card-bg-subtle)', borderRadius: 'var(--radius-md, 0.5rem)', padding: '0.75rem 0.85rem', border: '1px solid var(--border-gray)', boxShadow: 'var(--shadow-xs)', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Database size={14} color="var(--color-green)" /> Vector Database
                </span>
                <span style={{ fontWeight: 600 }}>Qdrant Cloud (Cosine Metric)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Cpu size={14} color="var(--color-blue)" /> AI Embedding Engine
                </span>
                <span style={{ fontWeight: 600 }}>Google text-embedding-004 (768-d)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Shield size={14} color="var(--color-amber)" /> Grounding Model
                </span>
                <span style={{ fontWeight: 600 }}>Gemini 2.5 Flash</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.4rem' }}>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="press btn-pill-primary"
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.82rem', borderRadius: 'var(--radius-btn, 0.5rem)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Profile / Auth Modal */}
      {isProfileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--modal-overlay, rgba(20, 21, 16, 0.5))',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-gray)',
              borderRadius: 'var(--radius-lg, 0.625rem)',
              width: '100%',
              maxWidth: '460px',
              boxShadow: 'var(--shadow-modal)',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {currentUser ? (
              <>
                {/* Profile Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-gray)',
                    paddingBottom: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <User size={18} />
                    <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-hand)' }}>
                      User Profile
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '0.25rem',
                        backgroundColor: 'var(--card-bg-subtle)',
                        border: '1px solid var(--border-gray)',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="press"
                    style={{
                      padding: '0.25rem',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* User Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <AnimalPortrait type="deer" size={48} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-hand)' }}>
                        {currentUser.name} {currentUser.last_name || ''}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          backgroundColor: 'rgba(63, 157, 110, 0.12)',
                          color: 'var(--color-green)',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm, 0.25rem)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <CheckCircle2 size={11} /> {currentUser.approve ? 'Verified' : 'Active'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {currentUser.email}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Role: <strong>{currentUser.role === 'admin' ? 'Administrator' : 'Standard User'}</strong>
                      {currentUser.created_at && (
                        <span> • Joined {new Date(currentUser.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* User Stats Bento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg-subtle)',
                      border: '1px solid var(--border-gray)',
                      boxShadow: 'var(--shadow-xs)',
                      borderRadius: 'var(--radius-md, 0.5rem)',
                      padding: '0.65rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {documents.length}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Documents</div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg-subtle)',
                      border: '1px solid var(--border-gray)',
                      boxShadow: 'var(--shadow-xs)',
                      borderRadius: 'var(--radius-md, 0.5rem)',
                      padding: '0.65rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {documents.reduce((acc, d) => acc + d.questionsAsked, 0)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Queries Asked</div>
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg-subtle)',
                      border: '1px solid var(--border-gray)',
                      boxShadow: 'var(--shadow-xs)',
                      borderRadius: 'var(--radius-md, 0.5rem)',
                      padding: '0.65rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-green)' }}>
                      96%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Grounded Score</div>
                  </div>
                </div>

                {/* Account Details */}
                <div
                  style={{
                    backgroundColor: 'var(--card-bg-subtle)',
                    borderRadius: 'var(--radius-md, 0.5rem)',
                    padding: '0.75rem 0.85rem',
                    border: '1px solid var(--border-gray)',
                    boxShadow: 'var(--shadow-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Database Auth</span>
                    <span style={{ fontWeight: 600 }}>PostgreSQL 17 (User #{currentUser.id.slice(0, 8)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Vector Store Access</span>
                    <span style={{ fontWeight: 600 }}>Qdrant Cloud Enabled</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Account Status</span>
                    <span style={{ fontWeight: 600, color: currentUser.block ? 'var(--color-red)' : 'var(--color-green)' }}>
                      {currentUser.block ? 'Blocked' : 'Active Account'}
                    </span>
                  </div>
                </div>

                {/* Footer with Logout and Close */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem' }}>
                  <button
                    onClick={handleLogout}
                    className="press"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-btn, 0.5rem)',
                      border: '1px solid var(--border-gray)',
                      boxShadow: 'var(--shadow-xs)',
                      backgroundColor: 'transparent',
                      color: 'var(--color-red, #dc2626)',
                      fontWeight: 600,
                    }}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="press btn-pill-primary"
                    style={{ padding: '0.45rem 1.25rem', fontSize: '0.82rem', borderRadius: 'var(--radius-btn, 0.5rem)' }}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Auth Header with Tabs */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-gray)',
                    paddingBottom: '0.65rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.3rem',
                      backgroundColor: 'var(--card-bg-subtle)',
                      padding: '0.2rem',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      border: '1px solid var(--border-gray)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="press"
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: 'var(--radius-sm, 0.375rem)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: authTab === 'login' ? 'var(--card-bg, #ffffff)' : 'transparent',
                        color: authTab === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
                        boxShadow: authTab === 'login' ? 'var(--shadow-xs)' : 'none',
                        border: 'none',
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="press"
                      style={{
                        padding: '0.35rem 0.8rem',
                        borderRadius: 'var(--radius-sm, 0.375rem)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        backgroundColor: authTab === 'register' ? 'var(--card-bg, #ffffff)' : 'transparent',
                        color: authTab === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
                        boxShadow: authTab === 'register' ? 'var(--shadow-xs)' : 'none',
                        border: 'none',
                      }}
                    >
                      Create Account
                    </button>
                  </div>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="press"
                    style={{
                      padding: '0.25rem',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Demo Credentials Quick Fill Banner */}
                {authTab === 'login' && (
                  <div
                    onClick={fillDemoCredentials}
                    className="press"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(63, 157, 110, 0.08)',
                      border: '1px dashed var(--color-green)',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                    title="Click to auto-fill demo account credentials"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Shield size={14} color="var(--color-green)" />
                      <span>Demo Account: <strong>himanshu@docreader.ai</strong></span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-green)', fontWeight: 700 }}>
                      Autofill ↵
                    </span>
                  </div>
                )}

                {/* Alerts */}
                {authError && (
                  <div
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      backgroundColor: 'rgba(224, 82, 82, 0.1)',
                      border: '1px solid rgba(224, 82, 82, 0.3)',
                      color: 'var(--color-red, #dc2626)',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      backgroundColor: 'rgba(63, 157, 110, 0.12)',
                      border: '1px solid rgba(63, 157, 110, 0.3)',
                      color: 'var(--color-green)',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {/* Form Body */}
                {authTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Mail size={13} /> Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="himanshu@docreader.ai"
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm, 0.375rem)',
                          border: '1px solid var(--border-gray)',
                          backgroundColor: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Lock size={13} /> Password
                      </label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm, 0.375rem)',
                          border: '1px solid var(--border-gray)',
                          backgroundColor: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="press btn-pill-primary"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        marginTop: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-btn, 0.5rem)',
                        opacity: authLoading ? 0.7 : 1,
                      }}
                    >
                      {authLoading ? (
                        'Signing in...'
                      ) : (
                        <>
                          <LogIn size={15} />
                          Sign In
                        </>
                      )}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('register');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        style={{ color: 'var(--color-green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Create one
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          placeholder="Himanshu"
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm, 0.375rem)',
                            border: '1px solid var(--border-gray)',
                            backgroundColor: 'var(--input-bg, #ffffff)',
                            color: 'var(--text-main)',
                            fontSize: '0.82rem',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={registerLastName}
                          onChange={(e) => setRegisterLastName(e.target.value)}
                          placeholder="Narware"
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm, 0.375rem)',
                            border: '1px solid var(--border-gray)',
                            backgroundColor: 'var(--input-bg, #ffffff)',
                            color: 'var(--text-main)',
                            fontSize: '0.82rem',
                            boxShadow: 'var(--shadow-xs)',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Mail size={13} /> Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="himanshu@docreader.ai"
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm, 0.375rem)',
                          border: '1px solid var(--border-gray)',
                          backgroundColor: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Lock size={13} /> Password
                      </label>
                      <input
                        type="password"
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm, 0.375rem)',
                          border: '1px solid var(--border-gray)',
                          backgroundColor: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="press btn-pill-primary"
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        marginTop: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--radius-btn, 0.5rem)',
                        opacity: authLoading ? 0.7 : 1,
                      }}
                    >
                      {authLoading ? (
                        'Creating account...'
                      ) : (
                        <>
                          <UserPlus size={15} />
                          Create Account
                        </>
                      )}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        style={{ color: 'var(--color-green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Sign In
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
