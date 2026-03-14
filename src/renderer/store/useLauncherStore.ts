import { create } from 'zustand';
import type {
  InstallInstanceInput,
  LauncherSnapshot,
  LauncherSettings,
  LocalAccountInput,
  MicrosoftDeviceStart,
  ModSearchItem,
  Profile,
  ServerEntry,
  VersionCatalogEntry,
} from '@shared/types';

type LauncherState = {
  snapshot: LauncherSnapshot | null;
  loading: boolean;
  error: string | null;
  modResults: ModSearchItem[];
  authFlow: MicrosoftDeviceStart | null;
  activeNewsId: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  setError: (error: string | null) => void;
  setSnapshot: (snapshot: LauncherSnapshot) => void;
  selectInstance: (instanceId: string) => Promise<void>;
  installInstance: (payload: InstallInstanceInput) => Promise<void>;
  launchInstance: (instanceId: string, serverAddress?: string) => Promise<void>;
  verifyInstance: (instanceId: string) => Promise<void>;
  removeInstance: (instanceId: string) => Promise<void>;
  searchMods: (query: string, loader: string, version: string) => Promise<void>;
  installMod: (instanceId: string, versionId: string) => Promise<void>;
  importMod: (instanceId: string) => Promise<void>;
  toggleMod: (instanceId: string, modId: string, enabled: boolean) => Promise<void>;
  removeMod: (instanceId: string, modId: string) => Promise<void>;
  saveSettings: (settings: LauncherSettings) => Promise<void>;
  detectJava: () => Promise<string | null>;
  chooseDirectory: (kind: 'game' | 'mods' | 'screenshots') => Promise<string | null>;
  openNews: (articleId: string) => Promise<void>;
  claimTask: (taskId: string) => Promise<void>;
  versionCatalog: () => Promise<VersionCatalogEntry[]>;
  registerLocal: (payload: LocalAccountInput) => Promise<void>;
  loginLocal: (email: string, password: string) => Promise<void>;
  beginMicrosoftLogin: () => Promise<void>;
  completeMicrosoftLogin: (flowId: string) => Promise<void>;
  updateProfile: (profile: Partial<Profile> & Pick<Profile, 'id'>) => Promise<void>;
  pickAvatar: (profileId: string) => Promise<void>;
  saveServer: (server: Partial<ServerEntry> & Pick<ServerEntry, 'name' | 'host' | 'port'>) => Promise<void>;
  pingServer: (serverId: string) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
  checkUpdates: () => Promise<void>;
};

async function loadSnapshot() {
  return window.launcherApi.app.getSnapshot();
}

export const useLauncherStore = create<LauncherState>((set, get) => ({
  snapshot: null,
  loading: true,
  error: null,
  modResults: [],
  authFlow: null,
  activeNewsId: null,
  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await loadSnapshot();
      set({ snapshot, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Не удалось загрузить launcher snapshot', loading: false });
    }
  },
  refresh: async () => {
    const snapshot = await loadSnapshot();
    set({ snapshot });
  },
  setError: (error) => set({ error }),
  setSnapshot: (snapshot) => set({ snapshot, loading: false }),
  selectInstance: async (instanceId) => {
    await window.launcherApi.instances.setSelected(instanceId);
    await get().refresh();
  },
  installInstance: async (payload) => {
    await window.launcherApi.instances.install(payload);
    await get().refresh();
  },
  launchInstance: async (instanceId, serverAddress) => {
    await window.launcherApi.instances.launch(instanceId, serverAddress);
    await get().refresh();
  },
  verifyInstance: async (instanceId) => {
    await window.launcherApi.instances.verify(instanceId);
    await get().refresh();
  },
  removeInstance: async (instanceId) => {
    await window.launcherApi.instances.remove(instanceId);
    await get().refresh();
  },
  searchMods: async (query, loader, version) => {
    const modResults = await window.launcherApi.mods.search(query, loader, version);
    set({ modResults });
  },
  installMod: async (instanceId, versionId) => {
    await window.launcherApi.mods.install(instanceId, versionId);
    await get().refresh();
  },
  importMod: async (instanceId) => {
    await window.launcherApi.mods.importFile(instanceId);
    await get().refresh();
  },
  toggleMod: async (instanceId, modId, enabled) => {
    await window.launcherApi.mods.toggle(instanceId, modId, enabled);
    await get().refresh();
  },
  removeMod: async (instanceId, modId) => {
    await window.launcherApi.mods.remove(instanceId, modId);
    await get().refresh();
  },
  saveSettings: async (settings) => {
    await window.launcherApi.settings.update(settings);
    await get().refresh();
  },
  detectJava: async () => {
    const result = await window.launcherApi.settings.detectJava();
    return result.javaPath ?? null;
  },
  chooseDirectory: (kind) => window.launcherApi.settings.chooseDirectory(kind),
  openNews: async (articleId) => {
    await window.launcherApi.news.open(articleId);
    set({ activeNewsId: articleId });
    await get().refresh();
  },
  claimTask: async (taskId) => {
    await window.launcherApi.progression.claimTask(taskId);
    await get().refresh();
  },
  versionCatalog: async () => {
    return window.launcherApi.instances.getVersionCatalog();
  },
  registerLocal: async (payload) => {
    await window.launcherApi.auth.registerLocal(payload);
    await get().refresh();
  },
  loginLocal: async (email, password) => {
    await window.launcherApi.auth.loginLocal(email, password);
    await get().refresh();
  },
  beginMicrosoftLogin: async () => {
    const authFlow = await window.launcherApi.auth.beginMicrosoftLogin();
    set({ authFlow });
  },
  completeMicrosoftLogin: async (flowId) => {
    await window.launcherApi.auth.completeMicrosoftLogin(flowId);
    set({ authFlow: null });
    await get().refresh();
  },
  updateProfile: async (profile) => {
    await window.launcherApi.auth.updateProfile(profile);
    await get().refresh();
  },
  pickAvatar: async (profileId) => {
    await window.launcherApi.auth.pickAvatar(profileId);
    await get().refresh();
  },
  saveServer: async (server) => {
    await window.launcherApi.servers.save(server);
    await get().refresh();
  },
  pingServer: async (serverId) => {
    await window.launcherApi.servers.ping(serverId);
    await get().refresh();
  },
  removeServer: async (serverId) => {
    await window.launcherApi.servers.remove(serverId);
    await get().refresh();
  },
  checkUpdates: async () => {
    await window.launcherApi.updates.check();
    await get().refresh();
  },
}));
