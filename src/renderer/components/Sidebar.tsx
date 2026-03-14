import { Download, FolderOpen, Home, Package, Settings, Trophy, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import type { NavRoute, Profile } from '@shared/types';

const items: Array<{ to: NavRoute; label: string; icon: typeof Home }> = [
  { to: '/home', label: 'Главная', icon: Home },
  { to: '/mods', label: 'Моды', icon: Package },
  { to: '/versions', label: 'Версии', icon: Download },
  { to: '/servers', label: 'Серверы', icon: FolderOpen },
  { to: '/achievements', label: 'Достижения', icon: Trophy },
  { to: '/profile', label: 'Профиль', icon: User },
  { to: '/settings', label: 'Настройки', icon: Settings },
];

export function Sidebar({ profile }: { profile: Profile | null }) {
  return (
    <aside
      className="w-60 flex flex-col min-h-screen relative z-10"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(40px) saturate(180%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(16,185,129,0.15))',
              border: '1px solid rgba(34,197,94,0.3)',
              boxShadow: '0 0 20px rgba(34,197,94,0.15)',
            }}
          >
            <span className="text-green-400 text-sm font-bold">MM</span>
          </div>
          <div>
            <h1
              className="text-lg font-bold"
              style={{
                background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Mid-Mine
            </h1>
            <p className="text-xs text-zinc-500">Launcher v1</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className="block mb-1">
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl relative overflow-hidden"
                  style={
                    isActive
                      ? {
                          background: 'rgba(34,197,94,0.15)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          boxShadow: '0 0 20px rgba(34,197,94,0.08)',
                        }
                      : {
                          background: 'transparent',
                          border: '1px solid transparent',
                        }
                  }
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? '#4ade80' : 'rgba(161,161,170,0.8)' }} />
                  <span className="text-sm" style={{ color: isActive ? '#f0fdf4' : 'rgba(161,161,170,0.8)' }}>
                    {item.label}
                  </span>
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #16a34a, #0d9488)' }}
          >
            <span className="text-white text-xs font-bold">{profile?.username.slice(0, 1).toUpperCase() ?? 'S'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white truncate">{profile?.username ?? 'Guest'}</p>
            <p className="text-[11px] text-zinc-500">{profile?.type === 'microsoft' ? 'Microsoft' : 'Offline'}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: '0 0 6px #4ade80' }} />
        </div>
      </div>
    </aside>
  );
}
