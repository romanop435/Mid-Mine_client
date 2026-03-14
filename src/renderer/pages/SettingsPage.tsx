import { useEffect, useState } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import { GlassCard, GlowButton, SectionHeader } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';
import type { LauncherSettings } from '@shared/types';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-12 h-6 rounded-full relative"
      style={{
        background: checked ? 'linear-gradient(135deg, rgba(34,197,94,0.7), rgba(16,185,129,0.6))' : 'rgba(255,255,255,0.12)',
        border: checked ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: checked ? 26 : 4 }} />
    </button>
  );
}

export function SettingsPage() {
  const { snapshot, saveSettings, detectJava, chooseDirectory } = useLauncherStore();
  const [settings, setSettings] = useState<LauncherSettings | null>(snapshot?.settings ?? null);

  useEffect(() => {
    setSettings(snapshot?.settings ?? null);
  }, [snapshot]);

  if (!snapshot || !settings) return null;

  const patch = <K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) =>
    setSettings((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <SectionHeader title="Настройки" subtitle="Настройки лаунчера и defaults для игровых инстансов" trailing={<GlowButton onClick={() => void saveSettings(settings)}>Сохранить</GlowButton>} />

      <GlassCard className="p-5">
        <h3 className="text-lg font-semibold text-white">Игра и Java</h3>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>RAM (MB)</span>
            <input type="number" value={settings.ramMb} onChange={(event) => patch('ramMb', Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Версия Java</span>
            <input value={settings.javaChannel} onChange={(event) => patch('javaChannel', event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300 col-span-2">
            <span>Путь к Java</span>
            <div className="flex gap-2">
              <input value={settings.javaPath ?? ''} onChange={(event) => patch('javaPath', event.target.value || null)} className="flex-1 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
              <button className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white" onClick={() => void detectJava().then((path) => path && patch('javaPath', path))}>
                <span className="inline-flex items-center gap-2"><Search className="w-4 h-4" />Найти</span>
              </button>
            </div>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5">
          {[
            ['quickLaunch', 'Быстрый запуск'],
            ['diagnosticsHud', 'Показывать FPS / diagnostics HUD'],
            ['autoUpdate', 'Автообновление'],
            ['notificationsEnabled', 'Уведомления'],
            ['closeLauncherOnGameStart', 'Закрывать лаунчер при запуске игры'],
            ['keepLauncherOpen', 'Держать лаунчер открытым'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3">
              <span className="text-sm text-zinc-300">{label}</span>
              <Toggle checked={Boolean(settings[key as keyof LauncherSettings])} onChange={(value) => patch(key as keyof LauncherSettings, value as never)} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-lg font-semibold text-white">Графика и звук</h3>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Разрешение</span>
            <input value={settings.resolution} onChange={(event) => patch('resolution', event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Дальность прорисовки</span>
            <input type="number" value={settings.renderDistance} onChange={(event) => patch('renderDistance', Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Музыка</span>
            <input type="range" min={0} max={100} value={settings.musicVolume} onChange={(event) => patch('musicVolume', Number(event.target.value))} className="w-full" />
          </label>
          <label className="space-y-2 text-sm text-zinc-300">
            <span>Звуки</span>
            <input type="range" min={0} max={100} value={settings.soundVolume} onChange={(event) => patch('soundVolume', Number(event.target.value))} className="w-full" />
          </label>
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3">
            <span className="text-sm text-zinc-300">Fullscreen</span>
            <Toggle checked={settings.fullscreen} onChange={(value) => patch('fullscreen', value)} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3">
            <span className="text-sm text-zinc-300">VSync</span>
            <Toggle checked={settings.vsync} onChange={(value) => patch('vsync', value)} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h3 className="text-lg font-semibold text-white">Пути</h3>
        <div className="space-y-4 mt-5">
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">Папка игры</p>
            <div className="flex gap-2">
              <input value={settings.gameDirectory} onChange={(event) => patch('gameDirectory', event.target.value)} className="flex-1 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
              <button className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white" onClick={() => void chooseDirectory('game').then((path) => path && patch('gameDirectory', path))}>
                <span className="inline-flex items-center gap-2"><FolderOpen className="w-4 h-4" />Обзор</span>
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
