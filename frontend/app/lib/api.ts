const BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL !== undefined 
    ? process.env.NEXT_PUBLIC_API_URL 
    : (typeof window !== 'undefined' ? '' : 'http://localhost:4000');

interface RequestOptions extends RequestInit {
  body?: any;
}

// Token Storage Helpers
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function saveTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem('user');
  try {
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

export function saveCurrentUser(user: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}

// Custom Error Class
export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token refresh lock to prevent multiple calls
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=session_expired';
    }
    throw new Error('Refresh token expired');
  }

  const json = await response.json();
  const { accessToken, refreshToken: newRefreshToken } = json.data;
  saveTokens(accessToken, newRefreshToken);
  return accessToken;
}

// Main API Client Request Wrapper
export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach access token
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response = await fetch(url, fetchOptions);

  // Handle Token Expiration (401)
  if (response.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newAccessToken = await refreshAccessToken();
        isRefreshing = false;
        
        // Execute queued requests
        refreshQueue.forEach(callback => callback(newAccessToken));
        refreshQueue = [];
      } catch (err) {
        isRefreshing = false;
        refreshQueue = [];
        throw new ApiError(401, 'Session expired. Please login again.');
      }
    }

    // Wait for token refresh to complete
    const retryWithNewToken = new Promise<string>((resolve) => {
      refreshQueue.push((token) => resolve(token));
    });

    const newAccessToken = await retryWithNewToken;
    headers.set('Authorization', `Bearer ${newAccessToken}`);
    response = await fetch(url, fetchOptions);
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      json.error?.message || response.statusText || 'Request failed',
      json.error?.code,
      json.error?.details
    );
  }

  return json;
}

// Request Verb Helpers
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) => 
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) => 
    apiFetch<T>(endpoint, { ...options, method: 'POST', body }),
    
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) => 
    apiFetch<T>(endpoint, { ...options, method: 'PUT', body }),
    
  delete: <T = any>(endpoint: string, options?: RequestOptions) => 
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

  // Helper for SSE stream response (AI Chat)
  stream: async (endpoint: string, body: any, onChunk: (text: string) => void, onDone: () => void, onError: (err: any) => void) => {
    const url = `${BASE_URL}${endpoint}`;
    const token = getAccessToken();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || 'Streaming request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE formatting is: data: {"text": "..."}\n\n
        const lines = buffer.split('\n');
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith('data: ')) {
            const dataStr = cleanedLine.substring(6);
            if (dataStr === '[DONE]') {
              onDone();
              return;
            }
            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.error) {
                onError(new Error(dataObj.error));
                return;
              }
              if (dataObj.text) {
                onChunk(dataObj.text);
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  }
};
