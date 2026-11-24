import type {
  AdminDiagramRecord,
  AdminStats,
  AdminUserRecord,
  AuthUser,
  DiagramDocument,
  DiagramFolder,
  PaginationMeta,
  UserRole,
} from '../types';

const TOKEN_STORAGE_KEY = 'mermaid-studio-auth-token';
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string })?.error || `Request gagal (${res.status})`,
      res.status
    );
  }
  return data as T;
}

export const authApi = {
  register(payload: { name: string; email: string; password: string }) {
    return request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login(payload: { email: string; password: string }) {
    return request<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  me() {
    return request<{ user: AuthUser }>('/auth/me');
  },

  updateProfile(payload: { name?: string; currentPassword?: string; newPassword?: string }) {
    return request<{ user: AuthUser }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export interface WorkspaceResponse {
  folders: DiagramFolder[];
  diagrams: DiagramDocument[];
  activeDiagramId: string;
  darkMode: boolean;
}

export const workspaceApi = {
  getWorkspace() {
    return request<WorkspaceResponse>('/workspace');
  },

  updatePreferences(payload: { darkMode?: boolean; activeDiagramId?: string }) {
    return request<{ ok: boolean }>('/workspace/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  saveFolder(folder: DiagramFolder) {
    return request<{ folder: DiagramFolder }>('/workspace/folders', {
      method: 'POST',
      body: JSON.stringify(folder),
    });
  },

  deleteFolder(id: string) {
    return request<{ ok: boolean }>(`/workspace/folders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  saveDiagram(diagram: DiagramDocument) {
    return request<{ diagram: DiagramDocument }>(
      `/workspace/diagrams/${encodeURIComponent(diagram.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(diagram),
      }
    );
  },

  deleteDiagram(id: string) {
    return request<{ ok: boolean }>(`/workspace/diagrams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  importWorkspace(payload: {
    folders: DiagramFolder[];
    diagrams: DiagramDocument[];
    darkMode?: boolean;
  }) {
    return request<{ ok: boolean }>('/workspace/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const adminApi = {
  getStats() {
    return request<{ stats: AdminStats }>('/admin/stats');
  },

  listUsers(params?: { search?: string; role?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<{ users: AdminUserRecord[]; pagination: PaginationMeta }>(
      `/admin/users${qs ? `?${qs}` : ''}`
    );
  },

  createUser(payload: { name: string; email: string; password: string; role: UserRole }) {
    return request<{ user: AdminUserRecord }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUser(
    id: string,
    payload: { name?: string; role?: UserRole; isActive?: boolean; newPassword?: string }
  ) {
    return request<{ user: AdminUserRecord }>(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id: string) {
    return request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listDiagrams(params?: { search?: string; userId?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.userId) q.set('userId', params.userId);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<{ diagrams: AdminDiagramRecord[]; pagination: PaginationMeta }>(
      `/admin/diagrams${qs ? `?${qs}` : ''}`
    );
  },

  getDiagramDetail(userId: string, diagramId: string) {
    return request<{ diagram: { id: string; userId: string; title: string; code: string; notes: string; updatedAt: number } }>(
      `/admin/diagrams/${encodeURIComponent(userId)}/${encodeURIComponent(diagramId)}`
    );
  },

  deleteDiagram(userId: string, diagramId: string) {
    return request<{ ok: boolean }>(
      `/admin/diagrams/${encodeURIComponent(userId)}/${encodeURIComponent(diagramId)}`,
      { method: 'DELETE' }
    );
  },
};
