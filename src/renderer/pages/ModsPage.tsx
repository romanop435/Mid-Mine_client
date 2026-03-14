import { useEffect, useMemo, useState } from 'react';
import { Download, Package, Plus, Search, Trash2 } from 'lucide-react';
import { GlassCard, SectionHeader, StatusBadge } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';
import type { ModSearchItem } from '@shared/types';

export function ModsPage() {
  const { snapshot, modResults, searchMods, installMod, importMod, toggleMod, removeMod } = useLauncherStore();
  const [tab, setTab] = useState<'installed' | 'catalog'>('installed');
  const [query, setQuery] = useState('');
  const [installedMods, setInstalledMods] = useState<ModSearchItem[]>([]);

  const selected = useMemo(
    () => snapshot?.instances.find((instance) => instance.selected) ?? snapshot?.instances[0] ?? null,
    [snapshot],
  );

  useEffect(() => {
    if (!selected) {
      setInstalledMods([]);
      return;
    }
    void window.launcherApi.mods.listInstalled(selected.id).then(setInstalledMods);
  }, [selected, snapshot]);

  if (!snapshot) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-5 border-b border-white/6 bg-white/2 backdrop-blur-xl">
        <SectionHeader
          title="Менеджер модов"
          subtitle={selected ? `${selected.name} • ${installedMods.length} установлено` : 'Сначала установите и выберите сборку'}
          trailing={
            selected ? (
              <button className="rounded-xl border border-green-400/25 bg-green-400/15 px-4 py-2 text-sm text-white" onClick={() => void importMod(selected.id)}>
                <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" />Из файла</span>
              </button>
            ) : null
          }
        />
        <div className="relative mt-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск модов..."
            className="w-full rounded-xl border border-white/10 bg-white/6 py-2.5 pl-10 pr-4 text-white"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button className={`rounded-xl px-4 py-2 text-sm ${tab === 'installed' ? 'bg-green-500/20 text-white border border-green-400/25' : 'bg-white/4 text-zinc-400 border border-white/8'}`} onClick={() => setTab('installed')}>
            Установленные
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm ${tab === 'catalog' ? 'bg-green-500/20 text-white border border-green-400/25' : 'bg-white/4 text-zinc-400 border border-white/8'}`}
            onClick={() => {
              setTab('catalog');
              if (selected) void searchMods(query || 'optimization', selected.loader, selected.minecraftVersion);
            }}
          >
            Каталог Modrinth
          </button>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {tab === 'installed' ? (
          installedMods.length === 0 ? (
            <GlassCard className="p-8 text-center text-zinc-500">У выбранной сборки пока нет установленных модов</GlassCard>
          ) : (
            installedMods
              .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.description.toLowerCase().includes(query.toLowerCase()))
              .map((mod) => (
                <GlassCard key={mod.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/6 flex items-center justify-center">
                        <Package className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{mod.title}</p>
                          <StatusBadge tone={mod.enabled ? 'success' : 'neutral'}>{mod.enabled ? 'Активен' : 'Отключён'}</StatusBadge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{mod.description}</p>
                        <p className="text-[11px] text-zinc-600 mt-2">v{mod.versionNumber} • {mod.author}</p>
                      </div>
                    </div>
                    {selected ? (
                      <div className="flex items-center gap-2">
                        <button className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-white" onClick={() => void toggleMod(selected.id, mod.id, !mod.enabled)}>
                          {mod.enabled ? 'Отключить' : 'Включить'}
                        </button>
                        <button className="rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-red-200" onClick={() => void removeMod(selected.id, mod.id)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </GlassCard>
              ))
          )
        ) : (
          modResults.map((mod) => (
            <GlassCard key={mod.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{mod.title}</p>
                    {mod.installed ? <StatusBadge tone="success">Установлен</StatusBadge> : null}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{mod.description}</p>
                  <p className="text-[11px] text-zinc-600 mt-2">v{mod.versionNumber} • {mod.author} • {mod.downloads.toLocaleString('ru-RU')} загрузок</p>
                </div>
                {selected && !mod.installed ? (
                  <button className="rounded-xl border border-green-400/25 bg-green-400/15 px-4 py-2 text-xs text-green-200" onClick={() => void installMod(selected.id, mod.versionId)}>
                    <span className="inline-flex items-center gap-2"><Download className="w-3 h-3" />Установить</span>
                  </button>
                ) : null}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
