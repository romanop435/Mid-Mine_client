import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MinecraftFolder, Version, launch } from '@xmcl/core';
import {
  getFabricLoaders,
  getForgeVersionList,
  getVersionList,
  install as installMinecraft,
  installDependencies,
  installFabric,
  installForge,
  installNeoForged,
} from '@xmcl/installer';
import { LauncherDatabase } from './database';
import { JavaService } from './java-service';
import { AuthService } from './auth-service';
import { ProgressionService } from './progression-service';
import type { InstallInstanceInput, InstanceSummary, VersionCatalogEntry, VersionCatalogType } from '@shared/types';

function sanitizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/gi, '-');
}

export class InstanceService {
  private versionCatalogCache: VersionCatalogEntry[] = [];
  private catalogFetchedAt = 0;

  constructor(
    private readonly db: LauncherDatabase,
    private readonly javaService: JavaService,
    private readonly authService: AuthService,
    private readonly progression: ProgressionService,
  ) {}

  list() {
    return this.db.listInstances();
  }

  async getVersionCatalog(force = false) {
    const stale = Date.now() - this.catalogFetchedAt > 15 * 60 * 1000;
    if (!force && this.versionCatalogCache.length > 0 && !stale) {
      return this.versionCatalogCache;
    }

    const manifest = await getVersionList();
    this.versionCatalogCache = manifest.versions.map((entry) => ({
      id: entry.id,
      type: entry.type as VersionCatalogType,
      releaseTime: entry.releaseTime,
      javaMajor: this.javaService.getRequiredJavaMajor(entry.id),
    }));
    this.catalogFetchedAt = Date.now();
    return this.versionCatalogCache;
  }

  async install(input: InstallInstanceInput) {
    const settings = this.db.getSettings();
    const id = randomUUID();
    const installPath = join(settings.gameDirectory, 'instances', sanitizeName(input.name));
    await mkdir(installPath, { recursive: true });

    const instance: InstanceSummary & { versionId?: string | null } = {
      id,
      name: input.name,
      minecraftVersion: input.minecraftVersion,
      loader: input.loader,
      loaderVersion: input.loaderVersion ?? null,
      group: input.group ?? 'Основные сборки',
      icon: null,
      status: 'installing',
      installed: false,
      installPath,
      lastPlayedAt: null,
      playtimeMinutes: 0,
      updateAvailable: false,
      selected: this.db.listInstances().length === 0,
      versionId: null,
    };
    this.db.upsertInstance(instance);
    this.db.upsertDownload({
      id,
      kind: 'instance',
      label: `Установка ${input.name}`,
      progress: 0.05,
      transferredBytes: 0,
      totalBytes: 100,
      status: 'running',
      error: null,
    });
    this.db.addLog('install', 'info', `Начата установка ${input.name}`);

    try {
      const runtime = await this.javaService.ensureJavaForVersion(settings, input.minecraftVersion);
      if (!runtime.javaPath) throw new Error('Не удалось подготовить Java runtime');
      const minecraft = new MinecraftFolder(installPath);
      const versions = await getVersionList();
      const versionMeta = versions.versions.find((entry) => entry.id === input.minecraftVersion);
      if (!versionMeta) {
        throw new Error(`Версия Minecraft ${input.minecraftVersion} не найдена`);
      }

      this.db.upsertDownload({ id, kind: 'instance', label: `Установка ${input.name}`, progress: 0.3, transferredBytes: 30, totalBytes: 100, status: 'running', error: null });
      await installMinecraft(versionMeta, minecraft, {
        assetsDownloadConcurrency: settings.downloadConcurrency,
        librariesDownloadConcurrency: settings.downloadConcurrency,
      });

      let versionId = input.minecraftVersion;
      let resolvedLoaderVersion = input.loaderVersion ?? null;

      if (input.loader === 'fabric') {
        const loaders = await getFabricLoaders();
        resolvedLoaderVersion = input.loaderVersion ?? loaders.find((entry) => entry.stable)?.version ?? loaders[0]?.version ?? null;
        if (!resolvedLoaderVersion) throw new Error('Не удалось определить версию Fabric loader');
        this.db.upsertDownload({ id, kind: 'instance', label: `Установка ${input.name}`, progress: 0.65, transferredBytes: 65, totalBytes: 100, status: 'running', error: null });
        versionId = await installFabric({
          minecraftVersion: input.minecraftVersion,
          version: resolvedLoaderVersion,
          minecraft,
          side: 'client',
        });
      } else if (input.loader === 'forge') {
        const forgeList = await getForgeVersionList({ minecraft: input.minecraftVersion });
        const selectedForge = forgeList.versions.find((entry) => entry.version === input.loaderVersion) ?? forgeList.versions.find((entry) => entry.type === 'recommended') ?? forgeList.versions[0];
        if (!selectedForge) throw new Error('Не удалось определить Forge installer');
        resolvedLoaderVersion = selectedForge.version;
        this.db.upsertDownload({ id, kind: 'instance', label: `Установка ${input.name}`, progress: 0.65, transferredBytes: 65, totalBytes: 100, status: 'running', error: null });
        versionId = await installForge({ mcversion: input.minecraftVersion, version: selectedForge.version }, minecraft, { java: runtime.javaPath });
      } else if (input.loader === 'neoforge') {
        if (!input.loaderVersion) throw new Error('Для NeoForge укажите конкретную версию загрузчика');
        resolvedLoaderVersion = input.loaderVersion;
        this.db.upsertDownload({ id, kind: 'instance', label: `Установка ${input.name}`, progress: 0.65, transferredBytes: 65, totalBytes: 100, status: 'running', error: null });
        versionId = await installNeoForged('neoforge', input.loaderVersion, minecraft, { java: runtime.javaPath });
      }

      await this.applyGameOptions(minecraft.root);
      this.db.upsertInstance({
        ...instance,
        status: 'installed',
        installed: true,
        selected: true,
        loaderVersion: resolvedLoaderVersion,
        versionId,
      });
      this.db.setSelectedInstance(id);
      this.db.completeInstanceInstall(id, versionId);
      this.db.upsertDownload({ id, kind: 'instance', label: `Установка ${input.name}`, progress: 1, transferredBytes: 100, totalBytes: 100, status: 'completed', error: null });

      const profile = this.db.getActiveProfile();
      if (profile) {
        this.progression.record(profile.id, 'install_instance', 1, id, 'instance', 'Сборка установлена', `${input.name} готова к запуску`);
      }

      this.db.addLog('install', 'success', `Установка ${input.name} завершена`);
      return this.db.getInstance(id);
    } catch (error) {
      this.db.updateInstanceStatus(id, 'error');
      this.db.upsertDownload({
        id,
        kind: 'instance',
        label: `Установка ${input.name}`,
        progress: 1,
        transferredBytes: 100,
        totalBytes: 100,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка установки',
      });
      this.db.addLog('install', 'error', error instanceof Error ? error.message : 'Неизвестная ошибка установки');
      throw error;
    }
  }

  async update(instanceId: string) {
    const instance = this.requireInstance(instanceId);
    return this.verify(instanceId, true, instance);
  }

  async verify(instanceId: string, updating = false, existing?: InstanceSummary) {
    const instance = existing ?? this.requireInstance(instanceId);
    const versionId = this.getVersionId(instance);
    this.db.updateInstanceStatus(instance.id, updating ? 'updating' : 'verifying');
    this.db.addLog('install', 'info', `${updating ? 'Обновление' : 'Проверка'} ${instance.name}`);

    try {
      const resolved = await Version.parse(instance.installPath, versionId);
      await installDependencies(resolved, {
        assetsDownloadConcurrency: this.db.getSettings().downloadConcurrency,
        librariesDownloadConcurrency: this.db.getSettings().downloadConcurrency,
      });
      await this.applyGameOptions(instance.installPath);
      this.db.updateInstanceStatus(instance.id, 'installed');
      const profile = this.db.getActiveProfile();
      if (profile) {
        this.progression.record(profile.id, 'verify_files', 1, instance.id, 'verify', 'Проверка завершена', `${instance.name} успешно проверена`);
      }
      this.db.addLog('install', 'success', `${instance.name} успешно проверена`);
      return this.db.getInstance(instance.id);
    } catch (error) {
      this.db.updateInstanceStatus(instance.id, 'error');
      this.db.addLog('install', 'error', error instanceof Error ? error.message : 'Проверка завершилась ошибкой');
      throw error;
    }
  }

  async remove(instanceId: string) {
    const instance = this.requireInstance(instanceId);
    if (existsSync(instance.installPath)) {
      await rm(instance.installPath, { recursive: true, force: true });
    }
    this.db.removeInstance(instanceId);
    this.db.addLog('install', 'warn', `Сборка ${instance.name} удалена`);
    const fallback = this.db.listInstances()[0];
    if (fallback) {
      this.db.setSelectedInstance(fallback.id);
    }
    return this.db.listInstances();
  }

  async launch(instanceId: string, serverAddress?: string) {
    const instance = this.requireInstance(instanceId);
    const settings = this.db.getSettings();
    const runtime = await this.javaService.ensureJavaForVersion(settings, instance.minecraftVersion);
    if (!runtime.javaPath) throw new Error('Java runtime не подготовлен');
    const profile = this.db.getActiveProfile();
    if (!profile) throw new Error('Активный профиль не найден');

    await this.applyGameOptions(instance.installPath);
    this.db.updateInstanceStatus(instance.id, 'launching');
    this.db.addLog('launch', 'info', `Запуск ${instance.name}`);

    const sessionId = this.db.createSession(profile.id, instance.id);
    const auth = await this.authService.getLaunchAuth(profile);
    const version = this.getVersionId(instance);
    const resolution = settings.resolution.split('x');
    const width = Number(resolution[0] ?? 1920);
    const height = Number(resolution[1] ?? 1080);

    const child = await launch({
      gamePath: instance.installPath,
      javaPath: runtime.javaPath,
      version,
      maxMemory: settings.ramMb,
      minMemory: Math.min(2048, settings.ramMb),
      launcherBrand: 'Mid-Mine',
      launcherName: 'Mid-Mine Launcher',
      gameProfile: {
        name: profile.username,
        id: (auth?.uuid ?? profile.id).replace(/-/g, ''),
      },
      accessToken: auth?.accessToken ?? 'offline',
      userType: auth ? 'mojang' : 'legacy',
      quickPlayMultiplayer: serverAddress,
      resolution: {
        width,
        height,
        fullscreen: settings.fullscreen,
      },
      extraJVMArgs: [
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+UseG1GC',
      ],
      extraExecOption: {
        detached: false,
      },
    });

    child.stdout?.on('data', (chunk) => {
      this.db.addLog('launch', 'info', chunk.toString().trim());
    });
    child.stderr?.on('data', (chunk) => {
      this.db.addLog('launch', 'warn', chunk.toString().trim());
    });
    child.on('close', (code) => {
      const result = this.db.finishSession(sessionId, code);
      this.db.updateInstancePlaytime(instance.id, result.durationMinutes);
      this.db.addLog('launch', code === 0 ? 'success' : 'warn', `${instance.name} завершена с кодом ${code ?? 0}`);
      this.progression.record(profile.id, 'launch_game', 1, instance.id, 'launch', 'Сессия завершена', `${instance.name} закрыта`);
      this.progression.record(profile.id, 'play_minutes', result.durationMinutes, instance.id);
      this.db.updateInstanceStatus(instance.id, 'installed');
    });

    return { ok: true };
  }

  setSelected(instanceId: string) {
    this.db.setSelectedInstance(instanceId);
    return this.db.listInstances();
  }

  private requireInstance(instanceId: string) {
    const instance = this.db.getInstance(instanceId);
    if (!instance) throw new Error('Сборка не найдена');
    return instance;
  }

  private getVersionId(instance: InstanceSummary) {
    const row = this.db.db.prepare('SELECT version_id FROM instances WHERE id = ?').get(instance.id) as { version_id: string | null } | undefined;
    return row?.version_id || instance.minecraftVersion;
  }

  private async applyGameOptions(gamePath: string) {
    const settings = this.db.getSettings();
    const folder = new MinecraftFolder(gamePath);
    const nextOptions = new Map<string, string>([
      ['fullscreen', settings.fullscreen ? 'true' : 'false'],
      ['enableVsync', settings.vsync ? 'true' : 'false'],
      ['renderDistance', String(Math.max(2, Math.round(settings.renderDistance / 4)))],
      ['soundCategory_music', String(settings.musicVolume / 100)],
      ['soundCategory_master', String(settings.soundVolume / 100)],
      ['soundCategory_ambient', settings.ambientSound ? '1' : '0'],
    ]);

    let content = '';
    if (existsSync(folder.options)) {
      content = await readFile(folder.options, 'utf8');
    }
    const entries = new Map<string, string>();
    for (const line of content.split(/\r?\n/)) {
      if (!line.includes(':')) continue;
      const [key, ...rest] = line.split(':');
      if (!key) continue;
      entries.set(key, rest.join(':'));
    }
    for (const [key, value] of nextOptions.entries()) {
      entries.set(key, value);
    }
    const serialized = Array.from(entries.entries()).map(([key, value]) => `${key}:${value}`).join('\n');
    await writeFile(folder.options, serialized, 'utf8');
  }
}
