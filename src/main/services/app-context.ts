import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BrowserWindow, type App } from 'electron';
import { DATABASE_NAME } from '@shared/constants';
import { LauncherDatabase } from './database';
import { JavaService } from './java-service';
import { UpdateService } from './update-service';
import { ProgressionService } from './progression-service';
import { SettingsService } from './settings-service';
import { NewsService } from './news-service';
import { ServerService } from './server-service';
import { AuthService } from './auth-service';
import { InstanceService } from './instance-service';
import { ModService } from './mod-service';

export interface AppContext {
  db: LauncherDatabase;
  java: JavaService;
  update: UpdateService;
  progression: ProgressionService;
  settings: SettingsService;
  news: NewsService;
  servers: ServerService;
  auth: AuthService;
  instances: InstanceService;
  mods: ModService;
  getSnapshot: () => ReturnType<LauncherDatabase['getSnapshot']>;
  publishSnapshot: () => void;
}

function broadcast(channel: string, payload: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

export async function initializeAppContext(app: App): Promise<AppContext> {
  const baseDir = join(app.getPath('userData'), 'data');
  mkdirSync(baseDir, { recursive: true });

  const db = new LauncherDatabase(join(baseDir, DATABASE_NAME));

  const java = new JavaService(join(baseDir, 'runtimes'));
  const update = new UpdateService();
  const progression = new ProgressionService(db);
  const settings = new SettingsService(db, java);
  const news = new NewsService(db, progression);
  const servers = new ServerService(db);
  const auth = new AuthService(db, baseDir);
  const instances = new InstanceService(db, java, auth, progression);
  const mods = new ModService(db);

  const active = db.getActiveProfile();
  if (active) {
    progression.onLauncherOpen(active.id);
  }
  await news.syncRemote().catch(() => undefined);
  const versionCatalog = await instances.getVersionCatalog().catch(() => []);

  const context: AppContext = {
    db,
    java,
    update,
    progression,
    settings,
    news,
    servers,
    auth,
    instances,
    mods,
    getSnapshot: () => db.getSnapshot(db.getActiveProfile()?.id ?? null, update.getState(), versionCatalog),
    publishSnapshot: () => {
      broadcast('app:changed', db.getSnapshot(db.getActiveProfile()?.id ?? null, update.getState(), versionCatalog));
      broadcast('logs:changed', db.listLogs());
      broadcast('downloads:changed', db.listDownloads());
    },
  };

  return context;
}
