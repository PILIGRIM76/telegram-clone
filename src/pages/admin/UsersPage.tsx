// src/pages/admin/UsersPage.tsx
// Страница управления пользователями админ-панели.

import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminUsers,
  banAdminUser,
  type AdminUser,
  type PaginatedUsers,
} from '../../services/adminService';

const PAGE_SIZE = 20;

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data: PaginatedUsers = await fetchAdminUsers(
        pagination.page,
        pagination.limit,
        search
      );
      setUsers(data.users);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBan = async (uid: string, username: string) => {
    if (!window.confirm(`Заблокировать пользователя "${username}"?`)) return;
    try {
      await banAdminUser(uid);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: 'banned' } : u))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to ban user');
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Пользователи</h1>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Поиск по имени пользователя..."
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-gray-700 bg-gray-800 rounded-lg">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="p-4 text-left text-gray-300 font-medium">Username</th>
              <th className="p-4 text-left text-gray-300 font-medium">Роль</th>
              <th className="p-4 text-left text-gray-300 font-medium">Статус</th>
              <th className="p-4 text-left text-gray-300 font-medium">Создан</th>
              <th className="p-4 text-right text-gray-300 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.uid} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-4 text-white">
                  {user.username}{' '}
                  {user.displayName && (
                    <span className="ml-2 text-xs text-gray-400">({user.displayName})</span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-300'
                        : user.role === 'banned'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {user.role === 'admin' ? 'Админ' : user.role === 'banned' ? 'Заблокирован' : 'Пользователь'}
                  </span>
                </td>
                <td className="p-4">
                  {user.isOnline ? (
                    <span className="flex items-center gap-1.5 text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      Онлайн
                    </span>
                  ) : (
                    <span className="text-gray-400">Оффлайн</span>
                  )}
                </td>
                <td className="p-4 text-gray-300">
                  {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td className="p-4 text-right">
                  {user.role !== 'admin' && user.role !== 'banned' ? (
                    <button
                      onClick={() => handleBan(user.uid, user.username)}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                    >
                      Заблокировать
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Строка {pagination.page} из {pagination.totalPages} • Всего:{' '}
          {pagination.total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
            }
            disabled={pagination.page <= 1 || loading}
            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium disabled:opacity-50"
          >
            Назад
          </button>
          <button
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
            disabled={pagination.page >= pagination.totalPages || loading}
            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}
