import { ipcMain } from 'electron';
import type { AppContext } from '@main/services/app-context';
import { localAccountSchema, settingsSchema, installInstanceSchema } from '@shared/contracts';
import type { LauncherSettings } from '@shared/types';

function handle(channel: string, listener: (...args: any[]) => any) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

export function registerIpc(context: AppContext) {
  handle('app:getSnapshot', () => context.getSnapshot());

  handle('auth:listProfiles', () => context.auth.listProfiles());
  handle('auth:registerLocal', async (_event, payload: any) => {
    const profile = context.auth.registerLocalAccount(localAccountSchema.parse(payload));
    context.progression.onLauncherOpen(profile.id);
    context.publishSnapshot();
    return profile;
  });
  handle('auth:loginLocal', async (_event, email: string, password: string) => {
    const profile = context.auth.loginLocalAccount(email, password);
    if (!profile) throw new Error('Не удалось активировать профиль');
    context.progression.onLauncherOpen(profile.id);
    context.publishSnapshot();
    return profile;
  });
  handle('auth:setActiveProfile', async (_event, profileId: string) => {
    const profile = context.auth.setActiveProfile(profileId);
    context.publishSnapshot();
    return profile;
  });
  handle('auth:beginMicrosoftLogin', () => context.auth.beginMicrosoftLogin());
  handle('auth:completeMicrosoftLogin', async (_event, flowId: string) => {
    const profile = await context.auth.completeMicrosoftLogin(flowId);
    context.progression.onLauncherOpen(profile.id);
    context.publishSnapshot();
    return profile;
  });
  handle('auth:logout', async (_event, profileId: string) => {
    const profiles = context.auth.logout(profileId);
    context.publishSnapshot();
    return profiles;
  });
  handle('auth:updateProfile', async (_event, profile: any) => {
    const profiles = context.auth.updateProfile(profile);
    const active = context.db.getActiveProfile();
    if (active) {
      context.progression.record(active.id, 'customize_profile', 1, active.id, 'profile', 'Профиль обновлён', 'Локальный профиль был изменён');
    }
    context.publishSnapshot();
    return profiles;
  });
  handle('auth:pickAvatar', async (_event, profileId: string) => {
    const profiles = await context.auth.pickAvatar(profileId);
    const active = context.db.getActiveProfile();
    if (active) {
      context.progression.record(active.id, 'customize_profile', 1, active.id, 'profile', 'Аватар обновлён', 'Изображение профиля изменено');
    }
    context.publishSnapshot();
    return profiles;
  });

  handle('settings:get', () => context.settings.get());
  handle('settings:update', async (_event, settings: LauncherSettings) => {
    const parsed = settingsSchema.parse(settings);
    const next = context.settings.update(parsed);
    const active = context.db.getActiveProfile();
    if (active) {
      context.progression.record(active.id, 'visit_settings', 1, active.id);
    }
    context.publishSnapshot();
    return next;
  });
  handle('settings:detectJava', () => context.settings.detectJava());
  handle('settings:chooseDirectory', (_event, kind: 'game' | 'mods' | 'screenshots') => context.settings.chooseDirectory(kind));

  handle('instances:list', () => context.instances.list());
  handle('instances:getVersionCatalog', (_event, force?: boolean) => context.instances.getVersionCatalog(Boolean(force)));
  handle('instances:install', async (_event, payload: any) => {
    const installed = await context.instances.install(installInstanceSchema.parse(payload));
    context.publishSnapshot();
    return installed;
  });
  handle('instances:update', async (_event, instanceId: string) => {
    const updated = await context.instances.update(instanceId);
    context.publishSnapshot();
    return updated;
  });
  handle('instances:verify', async (_event, instanceId: string) => {
    const verified = await context.instances.verify(instanceId);
    context.publishSnapshot();
    return verified;
  });
  handle('instances:remove', async (_event, instanceId: string) => {
    const instances = await context.instances.remove(instanceId);
    context.publishSnapshot();
    return instances;
  });
  handle('instances:launch', async (_event, instanceId: string, serverAddress?: string) => {
    const result = await context.instances.launch(instanceId, serverAddress);
    context.publishSnapshot();
    return result;
  });
  handle('instances:setSelected', async (_event, instanceId: string) => {
    const instances = context.instances.setSelected(instanceId);
    context.publishSnapshot();
    return instances;
  });

  handle('mods:listInstalled', (_event, instanceId: string) => context.mods.listInstalled(instanceId));
  handle('mods:search', (_event, query: string, loader: string, version: string) => context.mods.search(query, loader, version));
  handle('mods:install', async (_event, instanceId: string, versionId: string) => {
    const mods = await context.mods.install(instanceId, versionId);
    context.publishSnapshot();
    return mods;
  });
  handle('mods:importFile', async (_event, instanceId: string) => {
    const mods = await context.mods.importFile(instanceId);
    context.publishSnapshot();
    return mods;
  });
  handle('mods:toggle', async (_event, instanceId: string, modId: string, enabled: boolean) => {
    const mods = await context.mods.toggle(instanceId, modId, enabled);
    context.publishSnapshot();
    return mods;
  });
  handle('mods:remove', async (_event, instanceId: string, modId: string) => {
    const mods = await context.mods.remove(instanceId, modId);
    context.publishSnapshot();
    return mods;
  });

  handle('news:list', () => {
    const active = context.db.getActiveProfile();
    return active ? context.news.list(active.id) : [];
  });
  handle('news:open', async (_event, articleId: string) => {
    const active = context.db.getActiveProfile();
    if (!active) return [];
    const news = context.news.open(active.id, articleId);
    context.publishSnapshot();
    return news;
  });

  handle('progression:getSummary', () => {
    const active = context.db.getActiveProfile();
    return active ? context.db.getProgression(active.id) : null;
  });
  handle('progression:claimTask', async (_event, taskId: string) => {
    const active = context.db.getActiveProfile();
    if (!active) throw new Error('Нет активного профиля');
    const summary = context.progression.claimTask(active.id, taskId);
    context.publishSnapshot();
    return summary;
  });
  handle('progression:getActivity', () => {
    const active = context.db.getActiveProfile();
    return active ? context.db.listActivity(active.id) : [];
  });

  handle('servers:list', () => context.servers.list());
  handle('servers:save', async (_event, server: any) => {
    const result = context.servers.save(server);
    context.publishSnapshot();
    return result;
  });
  handle('servers:remove', async (_event, serverId: string) => {
    const result = context.servers.remove(serverId);
    context.publishSnapshot();
    return result;
  });
  handle('servers:ping', async (_event, serverId: string) => {
    const result = await context.servers.ping(serverId);
    context.publishSnapshot();
    return result;
  });

  handle('logs:list', () => context.db.listLogs());

  handle('updates:getState', () => context.update.getState());
  handle('updates:check', async () => {
    const state = await context.update.check();
    context.publishSnapshot();
    return state;
  });
  handle('updates:apply', () => context.update.apply());
}
