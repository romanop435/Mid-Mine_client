import { useMemo } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { GlassCard, SectionHeader, StatusBadge } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';

export function ServersPage() {
  const { snapshot, pingServer, launchInstance } = useLauncherStore();
  const server = snapshot?.servers[0] ?? null;
  const selectedInstance = useMemo(
    () => snapshot?.instances.find((instance) => instance.selected) ?? snapshot?.instances[0] ?? null,
    [snapshot],
  );

  if (!snapshot || !server) return null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <SectionHeader title="Официальный сервер" subtitle="Единственный сервер лаунчера по умолчанию" />

      <div className="grid grid-cols-[1.05fr_0.95fr] gap-5">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-white">{server.name}</p>
              <p className="mt-2 text-sm text-zinc-400">{server.host}:{server.port}</p>
              <p className="mt-1 text-sm text-zinc-500">{server.versionHint ?? 'Vanilla 1.20.1'}</p>
            </div>
            <StatusBadge tone={server.lastStatus === 'online' ? 'success' : server.lastStatus === 'offline' ? 'warn' : 'neutral'}>
              {server.lastStatus}
            </StatusBadge>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs text-zinc-500">MOTD</p>
              <p className="mt-2 text-sm text-white">{server.motd ?? 'Нет данных'}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs text-zinc-500">Пинг</p>
              <p className="mt-2 text-sm text-white">{server.latencyMs ?? '—'} ms</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/4 p-4">
              <p className="text-xs text-zinc-500">Игроки</p>
              <p className="mt-2 text-sm text-white">{server.onlinePlayers ?? '—'} / {server.maxPlayers ?? '—'}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white" onClick={() => void pingServer(server.id)}>
              <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Обновить статус</span>
            </button>
            {selectedInstance ? (
              <button className="rounded-xl border border-green-400/25 bg-green-400/15 px-4 py-2 text-sm text-white" onClick={() => void launchInstance(selectedInstance.id, `${server.host}:${server.port}`)}>
                <span className="inline-flex items-center gap-2"><Play className="h-4 w-4" />Играть на сервере</span>
              </button>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-white">Рекомендуемая сборка</h3>
          {selectedInstance ? (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/4 p-4">
              <p className="text-base font-semibold text-white">{selectedInstance.name}</p>
              <p className="mt-1 text-sm text-zinc-500">{selectedInstance.minecraftVersion} • {selectedInstance.loader}</p>
              <p className="mt-4 text-xs text-zinc-500">
                Для Mid-Mine | Clans SMP лучше использовать Vanilla 1.20.1. Если нужна кастомизация, создай отдельный модпак и добавь моды на странице `Моды`.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Сначала установите сборку, чтобы быстрый вход на сервер был доступен.</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
