import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dialog } from 'electron';
import { MinecraftFolder } from '@xmcl/core';
import { LauncherDatabase } from './database';
import type { ModSearchItem } from '@shared/types';

const MODRINTH_API = 'https://api.modrinth.com/v2';

function loaderFacet(loader: string) {
  return loader === 'vanilla' ? null : loader;
}

export class ModService {
  constructor(private readonly db: LauncherDatabase) {}

  listInstalled(instanceId: string): ModSearchItem[] {
    return this.db.listMods(instanceId).map((row: any) => ({
      id: row.id,
      projectId: row.project_id ?? '',
      versionId: row.version_id ?? '',
      title: row.title,
      description: row.description,
      author: row.author,
      downloads: Number(row.downloads),
      versionNumber: row.version_number,
      iconUrl: row.icon_url,
      installed: true,
      enabled: Number(row.enabled) === 1,
      localFileName: row.local_file_name,
    }));
  }

  async search(query: string, loader: string, version: string): Promise<ModSearchItem[]> {
    const facets: string[][] = [['project_type:mod']];
    const mappedLoader = loaderFacet(loader);
    if (mappedLoader) facets.push([`categories:${mappedLoader}`]);
    if (version) facets.push([`versions:${version}`]);

    const effectiveQuery = query.trim() || 'mod';
    const searchResponse = await fetch(`${MODRINTH_API}/search?query=${encodeURIComponent(effectiveQuery)}&limit=30&index=relevance&facets=${encodeURIComponent(JSON.stringify(facets))}`);
    if (!searchResponse.ok) throw new Error('Не удалось загрузить каталог Modrinth');
    const search = await searchResponse.json() as {
      hits: Array<{ project_id: string; title: string; description: string; author: string; downloads: number; icon_url: string | null }>;
    };

    const installedProjectIds = new Set<string>(this.db.listMods(this.getSelectedInstanceId()).map((row: any) => row.project_id).filter(Boolean));
    return Promise.all(search.hits.map(async (hit) => {
      const versionsResponse = await fetch(`${MODRINTH_API}/project/${hit.project_id}/version?loaders=${encodeURIComponent(JSON.stringify(mappedLoader ? [mappedLoader] : ['fabric', 'forge', 'neoforge']))}&game_versions=${encodeURIComponent(JSON.stringify([version]))}`);
      const versions = versionsResponse.ok ? await versionsResponse.json() as Array<any> : [];
      const latest = versions[0];
      return {
        id: latest?.id ?? hit.project_id,
        projectId: hit.project_id,
        versionId: latest?.id ?? '',
        title: hit.title,
        description: hit.description,
        author: hit.author,
        downloads: hit.downloads,
        versionNumber: latest?.version_number ?? version,
        iconUrl: hit.icon_url,
        installed: installedProjectIds.has(hit.project_id),
        enabled: installedProjectIds.has(hit.project_id),
        localFileName: null,
      } satisfies ModSearchItem;
    }));
  }

  async install(instanceId: string, versionId: string) {
    const versionResponse = await fetch(`${MODRINTH_API}/version/${versionId}`);
    if (!versionResponse.ok) throw new Error('Не удалось загрузить информацию о версии мода');
    const version = await versionResponse.json() as any;
    const primaryFile = version.files.find((file: any) => file.primary) ?? version.files[0];
    if (!primaryFile) throw new Error('У версии мода нет доступных файлов');

    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    await mkdir(folder.mods, { recursive: true });
    const targetFile = join(folder.mods, primaryFile.filename);

    const modResponse = await fetch(primaryFile.url);
    if (!modResponse.ok) throw new Error('Не удалось скачать мод');
    const buffer = Buffer.from(await modResponse.arrayBuffer());
    await writeFile(targetFile, buffer);

    this.db.upsertMod({
      id: version.id,
      instanceId,
      projectId: version.project_id,
      versionId: version.id,
      title: version.name,
      description: version.changelog ?? 'Установлено через Modrinth',
      author: version.author_id,
      downloads: Number(version.downloads ?? 0),
      versionNumber: version.version_number,
      iconUrl: null,
      localFileName: primaryFile.filename,
      enabled: true,
      source: 'modrinth',
    });
    return this.listInstalled(instanceId);
  }

  async importFile(instanceId: string) {
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    await mkdir(folder.mods, { recursive: true });

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Minecraft Mods', extensions: ['jar'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return this.listInstalled(instanceId);

    const sourceFile = result.filePaths[0]!;
    const targetFile = join(folder.mods, basename(sourceFile));
    await copyFile(sourceFile, targetFile);
    this.db.upsertMod({
      id: randomUUID(),
      instanceId,
      projectId: null,
      versionId: null,
      title: basename(sourceFile, '.jar'),
      description: 'Импортирован вручную',
      author: 'Local File',
      downloads: 0,
      versionNumber: 'custom',
      iconUrl: null,
      localFileName: basename(sourceFile),
      enabled: true,
      source: 'local',
    });
    return this.listInstalled(instanceId);
  }

  async toggle(instanceId: string, modId: string, enabled: boolean) {
    const row = this.db.listMods(instanceId).find((item: any) => item.id === modId);
    if (!row) throw new Error('Мод не найден');
    if (typeof row.local_file_name !== 'string' || !row.local_file_name) throw new Error('У мода нет локального файла');
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    const enabledPath = join(folder.mods, row.local_file_name.replace(/\.disabled$/, ''));
    const disabledPath = `${enabledPath}.disabled`;

    if (enabled && existsSync(disabledPath)) {
      await rename(disabledPath, enabledPath);
    } else if (!enabled && existsSync(enabledPath)) {
      await rename(enabledPath, disabledPath);
    }

    this.db.setModEnabled(modId, enabled);
    return this.listInstalled(instanceId);
  }

  async remove(instanceId: string, modId: string) {
    const row = this.db.listMods(instanceId).find((item: any) => item.id === modId);
    if (!row) throw new Error('Мод не найден');
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    if (typeof row.local_file_name === 'string' && row.local_file_name) {
      const filePath = join(folder.mods, row.local_file_name);
      const disabledPath = `${filePath}.disabled`;
      if (existsSync(filePath)) await rm(filePath, { force: true });
      if (existsSync(disabledPath)) await rm(disabledPath, { force: true });
    }
    this.db.removeMod(modId);
    return this.listInstalled(instanceId);
  }

  private requireInstance(instanceId: string) {
    const instance = this.db.getInstance(instanceId);
    if (!instance) throw new Error('Сборка не найдена');
    return instance;
  }

  private getSelectedInstanceId() {
    return this.db.listInstances().find((instance) => instance.selected)?.id ?? '';
  }
}
