import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LauncherShell } from './components/LauncherShell';
import { useLauncherStore } from './store/useLauncherStore';
import { HomePage } from './pages/HomePage';
import { ModsPage } from './pages/ModsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { VersionsPage } from './pages/VersionsPage';
import { ServersPage } from './pages/ServersPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { AuthPage } from './pages/AuthPage';
import type { LauncherSnapshot } from '@shared/types';

export default function App() {
  const location = useLocation();
  const { snapshot, loading, error, hydrate, setSnapshot } = useLauncherStore();

  useEffect(() => {
    void hydrate();
    const off = window.launcherApi.on('app:changed', (payload) => {
      setSnapshot(payload as LauncherSnapshot);
    });
    return off;
  }, [hydrate, setSnapshot]);

  if (loading && !snapshot) {
    return <div className="min-h-screen bg-[#05060f] text-white flex items-center justify-center">Загрузка Mid-Mine...</div>;
  }

  if (!snapshot) {
    return <div className="min-h-screen bg-[#05060f] text-white flex items-center justify-center">Снимок состояния недоступен</div>;
  }

  if (!snapshot.profile || (snapshot.profile.type !== 'microsoft' && !snapshot.profile.email)) {
    return <AuthPage />;
  }

  return (
    <LauncherShell profile={snapshot.profile}>
      {error ? (
        <div className="absolute top-4 right-4 z-30 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="h-full overflow-hidden"
        >
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/mods" element={<ModsPage />} />
            <Route path="/versions" element={<VersionsPage />} />
            <Route path="/servers" element={<ServersPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </LauncherShell>
  );
}
