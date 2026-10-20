import { ApiResponse, LoginResponse, User, DocUploadResponse, DocAnsResponse, DocHistoryItem } from '../types';

// In dev, defaults to http://localhost:5000. In production builds served by Nginx proxy, defaults to '' (relative path).
const BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:5000' : '');

function getHeaders(token?: string, adminToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

export const api = {
  // --- User & Auth Endpoints (userRouter) ---
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const res = await fetch(`${BASE_URL}/userrouter/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async createUser(payload: {
    email: string;
    name: string;
    last_name: string;
    password: string;
    role?: 'admin' | 'user';
    approve?: boolean;
    block?: boolean;
    delete?: boolean;
  }): Promise<ApiResponse<User>> {
    const res = await fetch(`${BASE_URL}/userrouter/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async listUsers(adminToken: string): Promise<ApiResponse<User[]>> {
    const res = await fetch(`${BASE_URL}/userrouter`, {
      method: 'GET',
      headers: getHeaders(adminToken, adminToken),
    });
    return res.json();
  },

  async updateUser(
    id: string,
    payload: { name?: string; last_name?: string; password?: string },
    userToken: string
  ): Promise<ApiResponse<User>> {
    const res = await fetch(`${BASE_URL}/userrouter/${id}`, {
      method: 'PATCH',
      headers: getHeaders(userToken),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async blockUser(id: string, block: boolean, adminToken: string): Promise<ApiResponse<User>> {
    const res = await fetch(`${BASE_URL}/userrouter/${id}/block`, {
      method: 'PATCH',
      headers: getHeaders(adminToken, adminToken),
      body: JSON.stringify({ block }),
    });
    return res.json();
  },

  async approveUser(id: string, approve: boolean, adminToken: string): Promise<ApiResponse<User>> {
    const res = await fetch(`${BASE_URL}/userrouter/${id}/approve`, {
      method: 'PATCH',
      headers: getHeaders(adminToken, adminToken),
      body: JSON.stringify({ approve }),
    });
    return res.json();
  },

  async deleteUser(id: string, adminToken: string): Promise<ApiResponse<{ message: string }>> {
    const res = await fetch(`${BASE_URL}/userrouter/${id}`, {
      method: 'DELETE',
      headers: getHeaders(adminToken, adminToken),
    });
    return res.json();
  },

  // --- DocReader Endpoints (docReaderRouter) ---
  async uploadDocument(file: File, question?: string, token?: string): Promise<ApiResponse<DocUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    if (question && question.trim().length > 0) {
      formData.append('question', question.trim());
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/docReaderRouter/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },

  async askQuestion(question: string, documentId?: string, token?: string): Promise<ApiResponse<DocAnsResponse>> {
    const res = await fetch(`${BASE_URL}/docReaderRouter/ans`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ question, documentId }),
    });
    return res.json();
  },

  async getHistory(token?: string): Promise<ApiResponse<DocHistoryItem[]>> {
    const res = await fetch(`${BASE_URL}/docReaderRouter/history`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    return res.json();
  },
};
