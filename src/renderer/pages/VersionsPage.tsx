import { useMemo, useState } from 'react';
import { Download, Play, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { GlowButton, GlassCard, ProgressBar, SectionHeader, StatusBadge } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';

export function VersionsPage() {
  const { snapshot, installInstance, selectInstance, launchInstance, verifyInstance, removeInstance } = useLauncherStore();
  const [name, setName] = useState('Mid-Mine Vanilla');
  const [minecraftVersion, setMinecraftVersion] = useState('1.20.1');
  const [loader, setLoader] = useState<'vanilla' | 'fabric' | 'forge' | 'neoforge'>('vanilla');
  const [loaderVersion, setLoaderVersion] = useState('');
  const [filter, setFilter] = useState<'release' | 'snapshot'>('release');

  const selected = useMemo(
    () => snapshot?.instances.find((instance) => instance.selected) ?? snapshot?.instances[0] ?? null,
    [snapshot],
  );

  const catalog = useMemo(
    () => (snapshot?.versionCatalog ?? []).filter((entry) => filter === 'release' ? entry.type === 'release' : entry.type === 'snapshot'),
    [filter, snapshot?.versionCatalog],
  );

  if (!snapshot) return null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <SectionHeader title="Версии и сборки" subtitle="Все релизы и снапшоты Minecraft, установка Vanilla / Fabric / Forge / NeoForge" />

      <div className="grid grid-cols-[1.15fr_1fr] gap-5">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Новая установка / модпак</h3>
            <div className="flex gap-2">
              <button className={`rounded-xl px-4 py-2 text-sm ${filter === 'release' ? 'bg-green-500/20 text-white border border-green-400/25' : 'bg-white/4 text-zinc-400 border border-white/8'}`} onClick={() => setFilter('release')}>
                Releases
              </button>
              <button className={`rounded-xl px-4 py-2 text-sm ${filter === 'snapshot' ? 'bg-green-500/20 text-white border border-green-400/25' : 'bg-white/4 text-zinc-400 border border-white/8'}`} onClick={() => setFilter('snapshot')}>
                Snapshots
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5">
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Название</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Minecraft</span>
              <select value={minecraftVersion} onChange={(event) => setMinecraftVersion(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white">
                {catalog.map((version) => (
                  <option key={version.id} value={version.id} style={{ background: '#111827' }}>
                    {version.id} • Java {version.javaMajor}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Загрузчик</span>
              <select value={loader} onChange={(event) => setLoader(event.target.value as typeof loader)} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white">
                <option value="vanilla" style={{ background: '#111827' }}>Vanilla</option>
                <option value="fabric" style={{ background: '#111827' }}>Fabric</option>
                <option value="forge" style={{ background: '#111827' }}>Forge</option>
                <option value="neoforge" style={{ background: '#111827' }}>NeoForge</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-zinc-300">
              <span>Версия загрузчика</span>
              <input value={loaderVersion} onChange={(event) => setLoaderVersion(event.target.value)} placeholder={loader === 'neoforge' ? 'Обязательно для NeoForge' : 'Авто или конкретная'} className="w-full rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-white" />
            </label>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Java будет скачана автоматически под выбранную версию Minecraft. Для сборки модпака установи версию, затем добавь моды на странице `Моды`.
          </p>
          <div className="mt-5">
            <GlowButton
              onClick={() =>
                void installInstance({
                  name,
                  minecraftVersion,
                  loader,
                  loaderVersion: loaderVersion || null,
                  group: 'Основные сборки',
                })
              }
            >
              <span className="inline-flex items-center gap-2"><Download className="w-4 h-4" />Установить сборку</span>
            </GlowButton>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="text-lg font-semibold text-white">Выбранная сборка</h3>
          {selected ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{selected.name}</p>
                    <p className="text-sm text-zinc-500">{selected.minecraftVersion} • {selected.loader}{selected.loaderVersion ? ` ${selected.loaderVersion}` : ''}</p>
                  </div>
                  <StatusBadge tone={selected.installed ? 'success' : 'neutral'}>{selected.status}</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <button className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white" onClick={() => void launchInstance(selected.id)}>
                    <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />Запустить</span>
                  </button>
                  <button className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white" onClick={() => void verifyInstance(selected.id)}>
                    <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Проверить</span>
                  </button>
                  <button className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200" onClick={() => void removeInstance(selected.id)}>
                    <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" />Удалить</span>
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm text-zinc-400">Путь установки</p>
                <p className="mt-1 break-all text-xs text-zinc-500">{selected.installPath}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Установленные сборки появятся здесь</p>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <SectionHeader title="Установленные сборки" subtitle={`${snapshot.instances.length} записей`} />
        <div className="mt-5 space-y-3">
          {snapshot.instances.map((instance) => (
            <div key={instance.id} className="rounded-xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <button className="text-left" onClick={() => void selectInstance(instance.id)}>
                    <p className="text-base font-semibold text-white">{instance.name}</p>
                    <p className="text-sm text-zinc-500">{instance.minecraftVersion} • {instance.loader}{instance.loaderVersion ? ` ${instance.loaderVersion}` : ''}</p>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {instance.selected ? <StatusBadge tone="success">Активна</StatusBadge> : null}
                  <StatusBadge>{instance.status}</StatusBadge>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={instance.installed ? 100 : 35} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white" onClick={() => void launchInstance(instance.id)}>
                  <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />Играть</span>
                </button>
                <button className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white" onClick={() => void verifyInstance(instance.id)}>
                  <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Обновить / repair</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
