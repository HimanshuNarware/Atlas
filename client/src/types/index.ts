export interface User {
  id: string;
  email: string;
  name: string;
  last_name: string;
  role: 'admin' | 'user';
  approve: boolean;
  delete: boolean;
  block: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DocUploadResponse {
  documentId: string;
  status: string;
  filename: string;
  mimetype?: string;
  size?: number;
  message?: string;
  uploadedAt?: string;
  chunksCount?: number;
  answer?: string;
  citations?: Array<{
    pageNumber: number;
    chunkId: string;
    excerpt: string;
  }>;
}

export interface DocAnsResponse {
  question: string;
  documentId: string;
  answer: string;
  citations: Array<{
    pageNumber: number;
    chunkId: string;
    excerpt: string;
  }>;
  insufficientEvidence: boolean;
  answeredAt: string;
}

export interface DocHistoryItem {
  id: string;
  title: string;
  uploadedAt: string;
  questionsAsked: number;
  status: string;
}
