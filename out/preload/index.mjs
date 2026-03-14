import { contextBridge, ipcRenderer } from "electron";
const listenerMap = /* @__PURE__ */ new Map();
const api = {
  app: {
    getSnapshot: () => ipcRenderer.invoke("app:getSnapshot")
  },
  auth: {
    listProfiles: () => ipcRenderer.invoke("auth:listProfiles"),
    registerLocal: (payload) => ipcRenderer.invoke("auth:registerLocal", payload),
    loginLocal: (email, password) => ipcRenderer.invoke("auth:loginLocal", email, password),
    setActiveProfile: (profileId) => ipcRenderer.invoke("auth:setActiveProfile", profileId),
    beginMicrosoftLogin: () => ipcRenderer.invoke("auth:beginMicrosoftLogin"),
    completeMicrosoftLogin: (deviceCode) => ipcRenderer.invoke("auth:completeMicrosoftLogin", deviceCode),
    logout: (profileId) => ipcRenderer.invoke("auth:logout", profileId),
    updateProfile: (profile) => ipcRenderer.invoke("auth:updateProfile", profile),
    pickAvatar: (profileId) => ipcRenderer.invoke("auth:pickAvatar", profileId)
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (settings) => ipcRenderer.invoke("settings:update", settings),
    detectJava: () => ipcRenderer.invoke("settings:detectJava"),
    chooseDirectory: (kind) => ipcRenderer.invoke("settings:chooseDirectory", kind)
  },
  instances: {
    list: () => ipcRenderer.invoke("instances:list"),
    getVersionCatalog: (force) => ipcRenderer.invoke("instances:getVersionCatalog", force),
    install: (payload) => ipcRenderer.invoke("instances:install", payload),
    update: (instanceId) => ipcRenderer.invoke("instances:update", instanceId),
    verify: (instanceId) => ipcRenderer.invoke("instances:verify", instanceId),
    remove: (instanceId) => ipcRenderer.invoke("instances:remove", instanceId),
    launch: (instanceId, serverId) => ipcRenderer.invoke("instances:launch", instanceId, serverId),
    setSelected: (instanceId) => ipcRenderer.invoke("instances:setSelected", instanceId)
  },
  mods: {
    listInstalled: (instanceId) => ipcRenderer.invoke("mods:listInstalled", instanceId),
    search: (query, loader, version) => ipcRenderer.invoke("mods:search", query, loader, version),
    install: (instanceId, versionId) => ipcRenderer.invoke("mods:install", instanceId, versionId),
    importFile: (instanceId) => ipcRenderer.invoke("mods:importFile", instanceId),
    toggle: (instanceId, modId, enabled) => ipcRenderer.invoke("mods:toggle", instanceId, modId, enabled),
    remove: (instanceId, modId) => ipcRenderer.invoke("mods:remove", instanceId, modId)
  },
  news: {
    list: () => ipcRenderer.invoke("news:list"),
    open: (articleId) => ipcRenderer.invoke("news:open", articleId)
  },
  progression: {
    getSummary: () => ipcRenderer.invoke("progression:getSummary"),
    claimTask: (taskId) => ipcRenderer.invoke("progression:claimTask", taskId),
    getActivity: () => ipcRenderer.invoke("progression:getActivity")
  },
  servers: {
    list: () => ipcRenderer.invoke("servers:list"),
    save: (server) => ipcRenderer.invoke("servers:save", server),
    remove: (serverId) => ipcRenderer.invoke("servers:remove", serverId),
    ping: (serverId) => ipcRenderer.invoke("servers:ping", serverId)
  },
  logs: {
    list: () => ipcRenderer.invoke("logs:list")
  },
  updates: {
    getState: () => ipcRenderer.invoke("updates:getState"),
    check: () => ipcRenderer.invoke("updates:check"),
    apply: () => ipcRenderer.invoke("updates:apply")
  },
  on: (channel, listener) => {
    const wrapped = (_event, payload) => listener(payload);
    const set = listenerMap.get(channel) ?? /* @__PURE__ */ new Set();
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
  }
};
contextBridge.exposeInMainWorld("launcherApi", api);
//# sourceMappingURL=index.mjs.map
