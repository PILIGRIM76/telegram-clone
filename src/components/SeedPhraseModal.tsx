import React, { useState } from 'react';

interface SeedPhraseModalProps {
  seedPhrase: string;
  onConfirm: () => void;
  onSkip?: () => void; // Опционально: пропустить (не рекомендуется)
  username?: string; // Показывается в заголовке
}

const SeedPhraseModal: React.FC<SeedPhraseModalProps> = ({
  seedPhrase,
  onConfirm,
  onSkip,
  username
}) => {
  const [hasSaved, setHasSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = seedPhrase.trim().split(/\s+/);
  const isValidPhrase = words.length === 12;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Не удалось скопировать:', err);
    }
  };

  const handleConfirm = () => {
    if (!hasSaved) return;
    onConfirm();
  };

  if (!isValidPhrase) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md">
          <p className="text-red-400">Ошибка: seed-фраза должна содержать 12 слов (получено {words.length})</p>
          <button onClick={onSkip} className="mt-4 bg-slate-600 px-4 py-2 rounded text-white">
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-yellow-600/40">

        {/* Заголовок с предупреждением */}
        <div className="p-6 border-b border-slate-700 bg-yellow-900/20">
          <h2 className="text-2xl font-bold text-yellow-300 mb-2 flex items-center">
            <span className="mr-2">🔐</span>
            Сохраните вашу seed-фразу
          </h2>
          {username && (
            <p className="text-sm text-slate-400">Пользователь: <span className="text-cyan-300">{username}</span></p>
          )}
        </div>

        {/* Предупреждение */}
        <div className="p-6 bg-red-900/20 border-b border-slate-700">
          <p className="text-red-300 font-semibold mb-2">
            ⚠️ Это единственный способ восстановить ваш аккаунт
          </p>
          <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside">
            <li>Запишите эти 12 слов <strong>на бумаге</strong> и храните в безопасном месте</li>
            <li>Не храните их в открытом виде на компьютере или в облаке</li>
            <li>Если вы потеряете seed-фразу — доступ к аккаунту будет невозможен</li>
            <li>Никому не показывайте эту фразу</li>
          </ul>
        </div>

        {/* Сетка 3x4 с 12 словами */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {words.map((word, index) => (
              <div
                key={index}
                className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center"
              >
                <span className="text-xs text-slate-500 font-mono mr-2 w-6 text-right">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <span className="text-white font-mono font-semibold">{word}</span>
              </div>
            ))}
          </div>

          {/* Кнопка копирования */}
          <button
            onClick={handleCopy}
            className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-white text-sm flex items-center justify-center transition-colors"
          >
            {copied ? (
              <>
                <span className="mr-2">✓</span>
                Скопировано в буфер обмена
              </>
            ) : (
              <>
                <span className="mr-2">📋</span>
                Скопировать фразу
              </>
            )}
          </button>
        </div>

        {/* Подтверждение */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50">
          <label className="flex items-start space-x-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={hasSaved}
              onChange={(e) => setHasSaved(e.target.checked)}
              className="mt-1 w-5 h-5 accent-cyan-500 cursor-pointer"
            />
            <span className="text-sm text-slate-200 select-none">
              <strong className="text-white">Я сохранил эту фразу в безопасном месте.</strong>
              {' '}
              Я понимаю, что без неё восстановить аккаунт будет невозможно.
            </span>
          </label>

          {/* Кнопки действий */}
          <div className="flex space-x-3">
            <button
              onClick={handleConfirm}
              disabled={!hasSaved}
              className={`flex-1 px-6 py-3 rounded font-semibold transition-all ${
                hasSaved
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {hasSaved ? '✓ Продолжить' : 'Отметьте чекбокс для продолжения'}
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-4 py-3 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors text-sm"
                title="Пропустить (НЕ рекомендуется)"
              >
                Пропустить
              </button>
            )}
          </div>

          {onSkip && (
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              ⚠️ Пропуск — на свой страх и риск. Без seed-фразы восстановление невозможно.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeedPhraseModal;