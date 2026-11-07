// src/services/adminService.ts
// Типизированный клиент для админских эндпоинтов CipherLink v4.0.
// Использует существующий fetch с токеном авторизации из localStorage.

const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.4:4000';

function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem('piligrim-access-token') ||
    localStorage.getItem('cipherlink-access-token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface AdminStats {
  totalUsers: number;
  activeToday: number;
  totalReports: number;
}

export interface AdminUser {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  isOnline: boolean;
  lastSeen?: number;
  createdAt: string;
}

export interface PaginatedUsers {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminReport {
  id: number;
  reporterId: string;
  reporterUsername?: string;
  targetUserId?: string;
  messageId?: string;
  reason: string;
  status: string;
  createdAt: string;
}

/** Получает статистику для админ-дашборда. */
export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await fetch(`${API_URL}/api/admin/stats`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status}`);
  }
  const data = await response.json();
  return data.stats;
}

/** Получает пагинированный список пользователей. */
export async function fetchAdminUsers(
  page: number,
  limit: number,
  search = ''
): Promise<PaginatedUsers> {
  const url = new URL(`${API_URL}/api/admin/users`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (search) url.searchParams.set('search', search);

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  return await response.json();
}

/** Блокирует пользователя (устанавливает role = 'banned'). */
export async function banAdminUser(uid: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/users/${uid}/ban`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to ban user: ${response.status}`);
  }
}

/** Получает список жалоб (репортов) с указанным статусом. */
export async function fetchAdminReports(status = 'pending'): Promise<AdminReport[]> {
  const url = new URL(`${API_URL}/api/admin/reports`);
  url.searchParams.set('status', status);

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.status}`);
  }
  const data = await response.json();
  return data.reports;
}

/** Отмечает жалобу как разрешённую. */
export async function resolveReport(reportId: number): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/admin/reports/${reportId}/resolve`,
    { method: 'POST', headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to resolve report: ${response.status}`);
  }
}

/** Отклоняет жалобу. */
export async function dismissReport(reportId: number): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/admin/reports/${reportId}/dismiss`,
    { method: 'POST', headers: getAuthHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to dismiss report: ${response.status}`);
  }
}
