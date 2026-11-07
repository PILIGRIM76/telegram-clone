// src/pages/admin/SettingsPage.tsx
// Страница системных настроек админ-панели.
// Содержит информацию о версии и секцию "Опасная зона" с заглушками.

import React from 'react';

const APP_VERSION = 'v4.0';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <span className="px-2 py-1 rounded-lg bg-gray-700 text-xs font-mono text-gray-300">
          {APP_VERSION}
        </span>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">Общая информация</h2>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Версия приложения</span>
            <span className="text-white font-mono">{APP_VERSION}</span>
          </div>
          <div className="flex justify-between">
            <span>Режим работы</span>
            <span className="text-white">Админ-панель (только метаданные)</span>
          </div>
          <div className="flex justify-between">
            <span>E2EE шифрование</span>
            <span className="text-white">Включено (Signal Protocol)</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">Опасная зона (Danger Zone)</h2>
        <p className="text-sm text-gray-400 mb-4">
          Действия в этом разделе могут повлиять на работу всей системы.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Очистить кэш</h3>
              <p className="text-xs text-gray-500">Очистка временных файлов и кэша сервера</p>
            </div>
            <button
              onClick={() => alert('Not implemented yet')}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              Clear Cache
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Перезапуск сервера</h3>
              <p className="text-xs text-gray-500">Перезапуск бэкенд-сервера CipherLink</p>
            </div>
            <button
              onClick={() => alert('Not implemented yet')}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              Restart Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
