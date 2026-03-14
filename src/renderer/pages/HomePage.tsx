import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Play, Rocket, ScrollText, Star } from 'lucide-react';
import { GlowButton, GlassCard, MetricCard, ProgressBar, SectionHeader, StatusBadge } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';
import { formatDate, formatMinutes, percentage } from '@renderer/lib/format';

export function HomePage() {
  const { snapshot, selectInstance, launchInstance, openNews, claimTask } = useLauncherStore();
  const selected = useMemo(
    () => snapshot?.instances.find((instance) => instance.selected) ?? snapshot?.instances[0] ?? null,
    [snapshot],
  );

  if (!snapshot) return null;

  const progress = percentage(snapshot.progression.currentXp, snapshot.progression.levelStartXp, snapshot.progression.nextLevelXp);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="relative overflow-hidden min-h-[340px]">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.18) 0%, rgba(5,150,105,0.12) 40%, rgba(6,182,212,0.08) 100%)' }} />
        <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex items-center gap-2 mb-4 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-xs text-green-300">
            <Rocket className="w-3 h-3" />
            Mid-Mine Launcher
          </div>
          <h2 className="text-5xl font-bold text-white mb-3" style={{ textShadow: '0 0 40px rgba(34,197,94,0.25)' }}>
            Готов играть?
          </h2>
          <p className="text-zinc-400 mb-8">Выбери установленную сборку и начни приключение</p>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <span className="text-sm text-zinc-400 mr-3">Сборка</span>
              <select
                value={selected?.id ?? ''}
                onChange={(event) => void selectInstance(event.target.value)}
                className="appearance-none rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white"
              >
                {snapshot.instances.map((instance) => (
                  <option key={instance.id} value={instance.id} style={{ background: '#111827' }}>
                    {instance.name} • {instance.loader}
                  </option>
                ))}
              </select>
            </div>
            {selected ? (
              <GlowButton className="px-14 py-4 text-lg" onClick={() => void launchInstance(selected.id)}>
                <span className="inline-flex items-center gap-3">
                  <Play className="w-5 h-5 fill-white" />
                  Играть
                </span>
              </GlowButton>
            ) : (
              <Link to="/versions">
                <GlowButton>Установить первую сборку</GlowButton>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 px-6 py-5">
        <MetricCard label="Время через лаунчер" value={formatMinutes(snapshot.progression.totalPlaytimeMinutes)} subLabel={`${snapshot.progression.launches} запусков`} />
        <MetricCard label="Установленные сборки" value={String(snapshot.progression.installedBuilds)} subLabel={selected ? selected.name : 'Выберите сборку'} accent="#22d3ee" />
        <MetricCard label="Прочитанные новости" value={String(snapshot.progression.newsReadCount)} subLabel="Учитывается для XP" accent="#60a5fa" />
        <MetricCard label="Проверки файлов" value={String(snapshot.progression.verifiedFilesCount)} subLabel="Launcher-only метрика" accent="#fb923c" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-5 px-6 pb-6">
        <GlassCard className="p-5">
          <SectionHeader title="Прогресс лаунчера" subtitle={`Уровень ${snapshot.progression.level}`} />
          <div className="mt-5 space-y-3">
            <ProgressBar value={progress} />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{snapshot.progression.currentXp} XP</span>
              <span>{snapshot.progression.nextLevelXp} XP</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {snapshot.progression.tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-xl border border-white/8 bg-white/4 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{task.description}</p>
                    </div>
                    <StatusBadge tone={task.completedAt ? 'success' : 'neutral'}>{task.xpReward} XP</StatusBadge>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={(task.progress / task.target) * 100} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {task.progress} / {task.target}
                    </span>
                    {task.progress >= task.target && !task.claimedAt ? (
                      <button className="text-green-300" onClick={() => void claimTask(task.id)}>
                        Забрать
                      </button>
                    ) : (
                      <span>{task.claimedAt ? 'Получено' : 'В процессе'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionHeader title="Активность" subtitle="Последние события Mid-Mine" />
          <div className="mt-5 space-y-3">
            {snapshot.activity.slice(0, 6).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-white/8 bg-white/4 p-3">
                <p className="text-sm font-semibold text-white">{entry.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{entry.description}</p>
                <p className="text-[11px] text-zinc-600 mt-2">{formatDate(entry.createdAt)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-5 px-6 pb-8">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-4 h-4 text-green-400" />
            <h3 className="text-base font-semibold text-white">Последние новости</h3>
          </div>
          <div className="space-y-4">
            {snapshot.news.map((item) => (
              <button
                key={item.id}
                onClick={() => void openNews(item.id)}
                className="w-full rounded-2xl overflow-hidden text-left border border-white/8 bg-white/4 hover:bg-white/8 transition-colors"
              >
                <div className="flex items-start gap-4 p-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0">
                    {item.coverImage ? <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge tone={item.readAt ? 'neutral' : 'success'}>{item.category}</StatusBadge>
                      <span className="text-xs text-zinc-600">{formatDate(item.publishedAt)}</span>
                    </div>
                    <h4 className="text-base font-semibold text-white">{item.title}</h4>
                    <p className="text-sm text-zinc-400 mt-2">{item.excerpt}</p>
                    {item.readAt ? <p className="text-[11px] text-green-300 mt-2">Прочитано</p> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Загрузки и статус</h3>
          </div>
          <div className="space-y-3">
            {snapshot.downloads.length === 0 ? (
              <p className="text-sm text-zinc-500">Активных задач нет</p>
            ) : (
              snapshot.downloads.map((job) => (
                <div key={job.id} className="rounded-xl border border-white/8 bg-white/4 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{job.label}</p>
                    <StatusBadge tone={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'warn' : 'neutral'}>
                      {job.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={job.progress * 100} />
                  </div>
                </div>
              ))
            )}
            <Link to="/versions" className="inline-flex text-sm text-green-300 mt-4">
              Открыть менеджер версий
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
