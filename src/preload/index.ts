import { contextBridge, ipcRenderer } from 'electron';
import type {
  InstallInstanceInput,
  LocalAccountInput,
  LauncherSettings,
  Profile,
  ServerEntry,
} from '@shared/types';

const listenerMap = new Map<string, Set<(payload: unknown) => void>>();

const api = {
  app: {
    getSnapshot: () => ipcRenderer.invoke('app:getSnapshot'),
  },
  auth: {
    listProfiles: () => ipcRenderer.invoke('auth:listProfiles'),
    registerLocal: (payload: LocalAccountInput) => ipcRenderer.invoke('auth:registerLocal', payload),
    loginLocal: (email: string, password: string) => ipcRenderer.invoke('auth:loginLocal', email, password),
    setActiveProfile: (profileId: string) => ipcRenderer.invoke('auth:setActiveProfile', profileId),
    beginMicrosoftLogin: () => ipcRenderer.invoke('auth:beginMicrosoftLogin'),
    completeMicrosoftLogin: (deviceCode: string) => ipcRenderer.invoke('auth:completeMicrosoftLogin', deviceCode),
    logout: (profileId: string) => ipcRenderer.invoke('auth:logout', profileId),
    updateProfile: (profile: Partial<Profile> & Pick<Profile, 'id'>) => ipcRenderer.invoke('auth:updateProfile', profile),
    pickAvatar: (profileId: string) => ipcRenderer.invoke('auth:pickAvatar', profileId),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: LauncherSettings) => ipcRenderer.invoke('settings:update', settings),
    detectJava: () => ipcRenderer.invoke('settings:detectJava'),
    chooseDirectory: (kind: 'game' | 'mods' | 'screenshots') => ipcRenderer.invoke('settings:chooseDirectory', kind),
  },
  instances: {
    list: () => ipcRenderer.invoke('instances:list'),
    getVersionCatalog: (force?: boolean) => ipcRenderer.invoke('instances:getVersionCatalog', force),
    install: (payload: InstallInstanceInput) => ipcRenderer.invoke('instances:install', payload),
    update: (instanceId: string) => ipcRenderer.invoke('instances:update', instanceId),
    verify: (instanceId: string) => ipcRenderer.invoke('instances:verify', instanceId),
    remove: (instanceId: string) => ipcRenderer.invoke('instances:remove', instanceId),
    launch: (instanceId: string, serverId?: string) => ipcRenderer.invoke('instances:launch', instanceId, serverId),
    setSelected: (instanceId: string) => ipcRenderer.invoke('instances:setSelected', instanceId),
  },
  mods: {
    listInstalled: (instanceId: string) => ipcRenderer.invoke('mods:listInstalled', instanceId),
    search: (query: string, loader: string, version: string) => ipcRenderer.invoke('mods:search', query, loader, version),
    install: (instanceId: string, versionId: string) => ipcRenderer.invoke('mods:install', instanceId, versionId),
    importFile: (instanceId: string) => ipcRenderer.invoke('mods:importFile', instanceId),
    toggle: (instanceId: string, modId: string, enabled: boolean) => ipcRenderer.invoke('mods:toggle', instanceId, modId, enabled),
    remove: (instanceId: string, modId: string) => ipcRenderer.invoke('mods:remove', instanceId, modId),
  },
  news: {
    list: () => ipcRenderer.invoke('news:list'),
    open: (articleId: string) => ipcRenderer.invoke('news:open', articleId),
  },
  progression: {
    getSummary: () => ipcRenderer.invoke('progression:getSummary'),
    claimTask: (taskId: string) => ipcRenderer.invoke('progression:claimTask', taskId),
    getActivity: () => ipcRenderer.invoke('progression:getActivity'),
  },
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    save: (server: Partial<ServerEntry> & Pick<ServerEntry, 'name' | 'host' | 'port'>) => ipcRenderer.invoke('servers:save', server),
    remove: (serverId: string) => ipcRenderer.invoke('servers:remove', serverId),
    ping: (serverId: string) => ipcRenderer.invoke('servers:ping', serverId),
  },
  logs: {
    list: () => ipcRenderer.invoke('logs:list'),
  },
  updates: {
    getState: () => ipcRenderer.invoke('updates:getState'),
    check: () => ipcRenderer.invoke('updates:check'),
    apply: () => ipcRenderer.invoke('updates:apply'),
  },
  on: (channel: string, listener: (payload: unknown) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: unknown) => listener(payload);
    const set = listenerMap.get(channel) ?? new Set<(payload: unknown) => void>();
    set.add(listener);
    listenerMap.set(channel, set);
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
      const existing = listenerMap.get(channel);
      existing?.delete(listener);
      if (existing?.size === 0) {
        listenerMap.delete(channel);
      }
    };
  },
};

contextBridge.exposeInMainWorld('launcherApi', api);

export type LauncherApi = typeof api;
