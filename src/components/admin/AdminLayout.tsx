// src/components/admin/AdminLayout.tsx
// Макет админ-панели CipherLink v4.0.
// Боковое меню, верхняя панель и область контента с роутингом страниц.

import React, { useState } from 'react';
import { DashboardPage } from '../../pages/admin/DashboardPage';
import { UsersPage } from '../../pages/admin/UsersPage';
import { ReportsPage } from '../../pages/admin/ReportsPage';
import { SettingsPage } from '../../pages/admin/SettingsPage';

const SIDEBAR_ITEMS = [
  { key: 'dashboard', label: 'Дашборд', icon: '📊' },
  { key: 'users', label: 'Пользователи', icon: '👥' },
  { key: 'reports', label: 'Жалобы', icon: '⚠️' },
  { key: 'settings', label: 'Настройки', icon: '⚙️' },
];

const PAGE_COMPONENTS: Record<string, React.ElementType> = {
  dashboard: DashboardPage,
  users: UsersPage,
  reports: ReportsPage,
  settings: SettingsPage,
};

export function AdminLayout() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const PageComponent = PAGE_COMPONENTS[activeItem] ?? DashboardPage;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Боковое меню */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6">
          <div className="text-lg font-bold mb-8 tracking-tight">
            CipherLink Admin
          </div>
          <nav>
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveItem(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeItem === item.key
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-gray-700">
          <button
            onClick={() => {
              localStorage.removeItem('piligrim-access-token');
              localStorage.removeItem('cipherlink-access-token');
              localStorage.removeItem('cipherlink-is-admin');
              window.location.href = '/';
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <span>🚪</span>
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Основная область контента */}
      <main className="flex-1 overflow-auto bg-gray-900 p-6">
        <PageComponent />
      </main>
    </div>
  );
}
