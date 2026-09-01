// Phase 9.5: МИНИМАЛЬНЫЙ App.tsx — только CreateIdentity + SeedPhraseModal
// Цель: убедиться, что модалка работает, прежде чем восстанавливать остальной функционал
import React, { useState, useEffect } from 'react';
import CreateIdentity from './components/CreateIdentity';
import SeedPhraseModal from './components/SeedPhraseModal';
import { generateIdentity } from './services/cryptoService';
import { apiService } from './services/apiService';

const App: React.FC = () => {
  const [identity, setIdentity] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('piligrim-identity');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [pendingIdentity, setPendingIdentity] = useState<any>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);

  useEffect(() => {
    console.log('[PILIGRIM] App mounted (minimal version)');
  }, []);

  const handleCreateIdentity = async () => {
    console.log('🚀 [PILIGRIM] START: handleCreateIdentity вызван');
    try {
      console.log('🔑 [PILIGRIM] Шаг 1: generateIdentity()...');
      const startTime = Date.now();
      const newIdentity = await generateIdentity();
      console.log(`✅ [PILIGRIM] generateIdentity() завершен за ${Date.now() - startTime}ms`);

      setPendingIdentity(newIdentity);
      setShowSeedModal(true);
      console.log('🎭 [PILIGRIM] setShowSeedModal(true) выполнен');

      apiService.register(newIdentity.uid, newIdentity.publicKey)
        .then(() => console.log('✅ [PILIGRIM] register success'))
        .catch((err: any) => console.warn('⚠️ [PILIGRIM] register failed (ignored):', err?.message || err));
    } catch (error) {
      console.error('❌ [PILIGRIM] Ошибка в handleCreateIdentity:', error);
    }
  };

  const handleSeedConfirmed = () => {
    console.log('✅ [PILIGRIM] Seed phrase подтверждена, сохраняем Identity');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
        setPendingIdentity(null);
        setShowSeedModal(false);
      } catch (e) {
        console.error('❌ [PILIGRIM] Ошибка сохранения identity:', e);
      }
    }
  };

  const handleSeedSkip = () => {
    console.log('⏭️ [PILIGRIM] Seed phrase пропущена');
    if (pendingIdentity) {
      try {
        localStorage.setItem('piligrim-identity', JSON.stringify(pendingIdentity));
        setIdentity(pendingIdentity);
      } catch {}
      setPendingIdentity(null);
      setShowSeedModal(false);
    }
  };

  // Phase 9.5 fix: сначала показываем SeedPhraseModal, потом identity
  if (showSeedModal && pendingIdentity?.seedPhrase) {
    return (
      <div>
        {identity && (
          <div className="min-h-screen bg-slate-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-4">🎉 Добро пожаловать, {identity.username}!</h1>
            <p className="text-slate-400">Identity создана успешно. Phase 9.5 minimal version.</p>
            <button
              onClick={() => {
                localStorage.removeItem('piligrim-identity');
                setIdentity(null);
              }}
              className="mt-4 px-4 py-2 bg-red-600 rounded"
            >
              Выйти
            </button>
          </div>
        )}
        <SeedPhraseModal
          seedPhrase={pendingIdentity.seedPhrase}
          username={pendingIdentity.username}
          onConfirm={handleSeedConfirmed}
          onSkip={handleSeedSkip}
        />
      </div>
    );
  }

  if (!identity) {
    return <CreateIdentity onCreateIdentity={handleCreateIdentity} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">🎉 Добро пожаловать, {identity.username}!</h1>
      <p className="text-slate-400">Identity создана успешно. Phase 9.5 minimal version.</p>
      <button
        onClick={() => {
          localStorage.removeItem('piligrim-identity');
          setIdentity(null);
        }}
        className="mt-4 px-4 py-2 bg-red-600 rounded"
      >
        Выйти
      </button>
    </div>
  );
};

export default App;
