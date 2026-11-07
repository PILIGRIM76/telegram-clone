// src/pages/admin/ReportsPage.tsx
// Страница управления жалобами (репортами) админ-панели.

import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminReports,
  resolveReport,
  dismissReport,
  type AdminReport,
} from '../../services/adminService';

type StatusFilter = 'pending' | 'resolved' | 'dismissed' | 'all';

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: 'Ожидающие',
  resolved: 'Разрешённые',
  dismissed: 'Отклонённые',
  all: 'Все',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  resolved: 'bg-green-500/20 text-green-400',
  dismissed: 'bg-red-500/20 text-red-400',
};

export function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusFilter === 'all' ? 'pending' : statusFilter;
      const data: AdminReport[] = await fetchAdminReports(status);
      setReports(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleResolve = async (report: AdminReport) => {
    if (!window.confirm(`Разрешить жалобу #${report.id}?`)) return;
    try {
      await resolveReport(report.id);
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, status: 'resolved' } : r
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve report');
    }
  };

  const handleDismiss = async (report: AdminReport) => {
    if (!window.confirm(`Отклонить жалобу #${report.id}?`)) return;
    try {
      await dismissReport(report.id);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss report');
    }
  };

  const filteredReports =
    statusFilter === 'all'
      ? reports
      : reports.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Загрузка жалоб...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
        Ошибка загрузки жалоб: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Жалобы (Reports)</h1>
        <div className="flex gap-2 w-full md:w-auto">
          {['pending', 'resolved', 'dismissed', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as StatusFilter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {STATUS_LABELS[status as StatusFilter]}
            </button>
          ))}
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
              <th className="p-4 text-left text-gray-300 font-medium">ID</th>
              <th className="p-4 text-left text-gray-300 font-medium">Reporter UID</th>
              <th className="p-4 text-left text-gray-300 font-medium">Target User</th>
              <th className="p-4 text-left text-gray-300 font-medium">Target Message</th>
              <th className="p-4 text-left text-gray-300 font-medium">Причина</th>
              <th className="p-4 text-left text-gray-300 font-medium">Дата</th>
              <th className="p-4 text-left text-gray-300 font-medium">Статус</th>
              <th className="p-4 text-right text-gray-300 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr key={report.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-4 text-white font-mono text-sm">#{report.id}</td>
                <td className="p-4 text-white font-mono text-sm">{report.reporterId}</td>
                <td className="p-4 text-gray-300 font-mono text-sm">
                  {report.targetUserId || '—'}
                </td>
                <td className="p-4 text-gray-300 font-mono text-sm">
                  {report.messageId || '—'}
                </td>
                <td className="p-4 text-white max-w-xs truncate" title={report.reason}>
                  {report.reason}
                </td>
                <td className="p-4 text-gray-400 text-sm">
                  {new Date(report.createdAt).toLocaleString('ru-RU')}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}
                  >
                    {report.status === 'pending'
                      ? 'Ожидает'
                      : report.status === 'resolved'
                        ? 'Разрешён'
                        : 'Отклонён'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {report.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleResolve(report)}
                        className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleDismiss(report)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  {report.status !== 'pending' && (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredReports.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Жалобы не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
