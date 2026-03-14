import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Save, ShieldCheck, User } from 'lucide-react';
import { GlassCard, GlowButton, MetricCard, ProgressBar, SectionHeader, StatusBadge } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';
import { formatMinutes, percentage } from '@renderer/lib/format';

export function ProfilePage() {
  const { snapshot, updateProfile, pickAvatar } = useLauncherStore();
  const profile = snapshot?.profile;
  const progression = snapshot?.progression;
  const [username, setUsername] = useState(profile?.username ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [location, setLocation] = useState(profile?.location ?? 'Россия, Москва');

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setEmail(profile?.email ?? '');
    setLocation(profile?.location ?? 'Россия, Москва');
  }, [profile?.id, profile?.username, profile?.email, profile?.location]);

  const progress = useMemo(() => {
    if (!progression) return 0;
    return percentage(progression.currentXp, progression.levelStartXp, progression.nextLevelXp);
  }, [progression]);

  if (!snapshot || !profile || !progression) return null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <SectionHeader title="Профиль игрока" subtitle="Локальный аккаунт или лицензионный Microsoft-профиль" />

      <div className="grid grid-cols-[0.95fr_1.05fr] gap-5">
        <div className="space-y-4">
          <GlassCard className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-green-400/25 bg-gradient-to-br from-green-400/20 to-cyan-400/10">
                {profile.avatarPath ? (
                  <img src={`file:///${profile.avatarPath.replace(/\\/g, '/')}`} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-14 w-14 text-green-400" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{profile.username}</h3>
                {profile.isPremium ? <StatusBadge tone="success">Premium</StatusBadge> : <StatusBadge>Standard</StatusBadge>}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{profile.type === 'microsoft' ? 'Microsoft аккаунт для лицензии' : 'Локальный аккаунт Mid-Mine'}</p>
              <p className="mt-2 text-sm text-zinc-400">{profile.email ?? 'Email не указан'}</p>
              <div className="mt-5 flex gap-2">
                <GlowButton className="px-4 py-2" onClick={() => void pickAvatar(profile.id)}>
                  <span className="inline-flex items-center gap-2"><ImagePlus className="h-4 w-4" />Аватар</span>
                </GlowButton>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="mb-4 text-sm font-semibold text-white">Данные профиля</p>
            <div className="space-y-3">
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" placeholder="Ник" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} disabled={profile.type === 'microsoft'} placeholder="Email" className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white disabled:opacity-60" />
              <input value={location} onChange={(event) => setLocation(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" placeholder="Локация" />
              <button className="rounded-xl border border-green-400/25 bg-green-400/15 px-4 py-2 text-sm text-white" onClick={() => void updateProfile({ id: profile.id, username, email, location, isPremium: profile.isPremium })}>
                <span className="inline-flex items-center gap-2"><Save className="h-4 w-4" />Сохранить профиль</span>
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-300" />
              <p className="text-sm font-semibold text-white">Статус аккаунта</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-zinc-400">
              <p>Ник в лаунчере: {profile.username}</p>
              <p>Ник для запуска Minecraft: {profile.username}</p>
              <p>Тип аккаунта: {profile.type === 'microsoft' ? 'Microsoft Licensed' : 'Local Mid-Mine Account'}</p>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Время через лаунчер" value={formatMinutes(progression.totalPlaytimeMinutes)} />
            <MetricCard label="Установлено сборок" value={String(progression.installedBuilds)} accent="#22d3ee" />
            <MetricCard label="Стрик входов" value={String(progression.loginStreak)} accent="#fb923c" />
            <MetricCard label="Запуски" value={String(progression.launches)} accent="#60a5fa" />
            <MetricCard label="Проверки файлов" value={String(progression.verifiedFilesCount)} accent="#4ade80" />
            <MetricCard label="Новостей прочитано" value={String(progression.newsReadCount)} accent="#a78bfa" />
          </div>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">XP и уровень лаунчера</p>
              <StatusBadge tone="success">Уровень {progression.level}</StatusBadge>
            </div>
            <div className="mt-4">
              <ProgressBar value={progress} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span>{progression.currentXp} XP</span>
              <span>{progression.nextLevelXp} XP</span>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Последние достижения</p>
              <StatusBadge>{profile.isPremium ? 'Premium Track' : 'Launcher-only'}</StatusBadge>
            </div>
            <div className="mt-4 space-y-3">
              {progression.achievements.slice(0, 5).map((achievement) => (
                <div key={achievement.id} className="rounded-xl border border-white/8 bg-white/4 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${achievement.color}18`, border: `1px solid ${achievement.color}30` }}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{achievement.title}</p>
                        <StatusBadge tone={achievement.unlockedAt ? 'success' : 'neutral'}>
                          {achievement.progress}/{achievement.target}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
