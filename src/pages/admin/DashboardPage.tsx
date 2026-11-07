// src/pages/admin/DashboardPage.tsx
// Страница дашборда админ-панели с ключевыми метриками.

import React, { useEffect, useState } from 'react';
import { fetchAdminStats } from '../../services/adminService';
import type { AdminStats } from '../../services/adminService';

export function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Загрузка...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
        Ошибка загрузки статистики: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Дашборд администрирования</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Всего пользователей"
          value={stats?.totalUsers ?? 0}
          icon="👥"
          color="bg-blue-500"
        />
        <StatCard
          title="Активных сегодня"
          value={stats?.activeToday ?? 0}
          icon="🟢"
          color="bg-green-500"
        />
        <StatCard
          title="Ожидающих жалоб"
          value={stats?.totalReports ?? 0}
          icon="⚠️"
          color="bg-yellow-500"
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">Статус системы</h2>
        <p className="text-gray-400">
          Админ-панель CipherLink v4.0 работает в режиме только метаданных.
          Содержимое зашифрованных сообщений недоступно администрации.
        </p>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-400 text-sm uppercase tracking-wider">{title}</span>
      </div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
