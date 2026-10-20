import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DocUploadResponse, DocAnsResponse, DocHistoryItem } from '../types';

export const DocReaderDashboard: React.FC = () => {
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<DocUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);

  // Question & Answer state
  const [question, setQuestion] = useState('What are the primary findings in this report?');
  const [ansResult, setAnsResult] = useState<DocAnsResponse | null>(null);
  const [asking, setAsking] = useState(false);

  // History state
  const [historyItems, setHistoryItems] = useState<DocHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback({ message: 'Please select a document file to upload', isError: true });
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      const res = await api.uploadDocument(selectedFile);
      if (res.success && res.data) {
        setUploadResult(res.data);
        setFeedback({ message: `Document uploaded: ${res.data.filename} (${res.data.status})` });
      } else {
        setFeedback({ message: res.error?.message || 'Upload failed', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Error uploading document to backend', isError: true });
    } finally {
      setUploading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setFeedback(null);
    try {
      const res = await api.askQuestion(question, uploadResult?.documentId);
      if (res.success && res.data) {
        setAnsResult(res.data);
        setFeedback({ message: 'Answer generated successfully' });
      } else {
        setFeedback({ message: res.error?.message || 'Failed to get answer', isError: true });
      }
    } catch (err) {
      setFeedback({ message: 'Error querying docReader answer endpoint', isError: true });
    } finally {
      setAsking(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getHistory();
      if (res.success && res.data) {
        setHistoryItems(res.data);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {feedback && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: feedback.isError ? '#ef444420' : '#10b98120',
            border: `1px solid ${feedback.isError ? '#ef4444' : '#10b981'}`,
            color: feedback.isError ? '#fca5a5' : '#6ee7b7',
            fontSize: '0.9rem',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Grid: Upload & Ask */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Upload Endpoint */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Document Upload</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Endpoint: <code>POST /docReaderRouter/upload</code> (or <code>/doc-reader/upload</code>)
          </p>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">Select Document (PDF, DOCX, TXT)</label>
              <input
                type="file"
                className="form-control"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.docx,.txt"
              />
            </div>
            <button type="submit" disabled={uploading || !selectedFile} className="btn btn-primary" style={{ width: '100%' }}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>

          {uploadResult && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Upload Result</div>
              <div><strong>Doc ID:</strong> <code>{uploadResult.documentId}</code></div>
              <div><strong>Filename:</strong> {uploadResult.filename}</div>
              <div><strong>Status:</strong> {uploadResult.status}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{uploadResult.message}</div>
            </div>
          )}
        </div>

        {/* Answer Endpoint */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Ask Question (Ans Endpoint)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Endpoint: <code>POST /docReaderRouter/ans</code> (or <code>/doc-reader/ans</code>)
          </p>
          <form onSubmit={handleAskQuestion}>
            <div className="form-group">
              <label className="form-label">Question</label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="Ask any question about your document..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <button type="submit" disabled={asking} className="btn btn-primary" style={{ width: '100%' }}>
              {asking ? 'Querying...' : 'Submit Question'}
            </button>
          </form>

          {ansResult && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '0.5rem' }}>Answer Received</div>
              <p style={{ marginBottom: '0.5rem' }}>{ansResult.answer}</p>
              {ansResult.citations.length > 0 && (
                <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Citation Source:</span>
                  <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.8rem' }}>
                    "{ansResult.citations[0]?.excerpt}" (Page {ansResult.citations[0]?.pageNumber})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History Endpoint */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Document History</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Endpoint: <code>GET /docReaderRouter/history</code> (or <code>/doc-reader/history</code>)
            </p>
          </div>
          <button onClick={fetchHistory} disabled={loadingHistory} className="btn btn-outline">
            {loadingHistory ? 'Refreshing...' : 'Refresh History'}
          </button>
        </div>

        {historyItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {historyItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#0f172a',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span>Questions: {item.questionsAsked}</span>
                  <span className="badge badge-active">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No document history found.
          </div>
        )}
      </div>
    </div>
  );
};
