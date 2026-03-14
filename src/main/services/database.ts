import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  DEFAULT_GAME_DIRECTORY,
  DEFAULT_JAVA_CHANNEL,
  DEFAULT_RAM_MB,
  DEFAULT_RESOLUTION,
  LEVEL_XP_BASE,
  MIDMINE_DEFAULT_SERVER,
} from '@shared/constants';
import { seededAchievements, seededNews, seededTasks } from '@shared/seeds';
import type {
  ActivityItem,
  DownloadJob,
  InstanceSummary,
  LauncherSettings,
  LogEntry,
  NewsArticle,
  Profile,
  ServerEntry,
  TaskAction,
  TaskProgress,
  UpdateState,
  VersionCatalogEntry,
} from '@shared/types';

const DEFAULT_SETTINGS: LauncherSettings = {
  javaPath: null,
  javaChannel: DEFAULT_JAVA_CHANNEL,
  ramMb: DEFAULT_RAM_MB,
  gameDirectory: DEFAULT_GAME_DIRECTORY,
  autoUpdate: true,
  closeLauncherOnGameStart: false,
  keepLauncherOpen: true,
  notificationsEnabled: true,
  quickLaunch: true,
  diagnosticsHud: false,
  downloadConcurrency: 4,
  resolution: DEFAULT_RESOLUTION,
  fullscreen: true,
  vsync: true,
  renderDistance: 60,
  musicVolume: 80,
  soundVolume: 100,
  ambientSound: true,
};

function isoNow() {
  return new Date().toISOString();
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getWeekKey(date = new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((current.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getPeriodKey(type: 'one_time' | 'daily' | 'weekly') {
  if (type === 'daily') return getDayKey();
  if (type === 'weekly') return getWeekKey();
  return 'one_time';
}

function mapBoolean(value: unknown) {
  return Number(value) === 1;
}

export class LauncherDatabase {
  readonly db: DatabaseSync;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
    this.seed();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        type TEXT NOT NULL,
        is_premium INTEGER NOT NULL DEFAULT 0,
        avatar_path TEXT,
        skin_path TEXT,
        email TEXT,
        password_hash TEXT,
        password_salt TEXT,
        location TEXT,
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        login_streak INTEGER NOT NULL DEFAULT 0,
        last_open_day TEXT
      );
      CREATE TABLE IF NOT EXISTS auth_tokens (
        profile_id TEXT PRIMARY KEY,
        encrypted_blob TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        xuid TEXT,
        uuid TEXT,
        username TEXT,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS instances (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        minecraft_version TEXT NOT NULL,
        loader TEXT NOT NULL,
        loader_version TEXT,
        group_name TEXT NOT NULL,
        icon TEXT,
        status TEXT NOT NULL,
        installed INTEGER NOT NULL DEFAULT 0,
        install_path TEXT NOT NULL,
        version_id TEXT,
        last_played_at TEXT,
        playtime_minutes INTEGER NOT NULL DEFAULT 0,
        update_available INTEGER NOT NULL DEFAULT 0,
        selected INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS instance_files (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        hash TEXT,
        size INTEGER,
        FOREIGN KEY(instance_id) REFERENCES instances(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS mods (
        id TEXT PRIMARY KEY,
        instance_id TEXT NOT NULL,
        project_id TEXT,
        version_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        author TEXT NOT NULL,
        downloads INTEGER NOT NULL DEFAULT 0,
        version_number TEXT NOT NULL,
        icon_url TEXT,
        local_file_name TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        source TEXT NOT NULL,
        installed_at TEXT NOT NULL,
        FOREIGN KEY(instance_id) REFERENCES instances(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS news_articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        cover_image TEXT,
        published_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS news_reads (
        article_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        read_at TEXT NOT NULL,
        PRIMARY KEY(article_id, profile_id),
        FOREIGN KEY(article_id) REFERENCES news_articles(id) ON DELETE CASCADE,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        target INTEGER NOT NULL,
        xp_reward INTEGER NOT NULL,
        claimable INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_progress (
        task_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        period_key TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        claimed_at TEXT,
        PRIMARY KEY(task_id, profile_id, period_key),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS achievement_defs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        action TEXT NOT NULL,
        target INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS achievement_progress (
        achievement_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        unlocked_at TEXT,
        PRIMARY KEY(achievement_id, profile_id),
        FOREIGN KEY(achievement_id) REFERENCES achievement_defs(id) ON DELETE CASCADE,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS xp_events (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        source_action TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reference_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        instance_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        exit_code INTEGER,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY(instance_id) REFERENCES instances(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS favorite_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        version_hint TEXT,
        last_status TEXT NOT NULL,
        motd TEXT,
        latency_ms INTEGER,
        online_players INTEGER,
        max_players INTEGER,
        checked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        progress REAL NOT NULL DEFAULT 0,
        transferred_bytes INTEGER NOT NULL DEFAULT 0,
        total_bytes INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        error TEXT
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        read_at TEXT
      );
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    this.ensureColumn('profiles', 'is_premium', 'INTEGER NOT NULL DEFAULT 0');
    this.ensureColumn('profiles', 'password_hash', 'TEXT');
    this.ensureColumn('profiles', 'password_salt', 'TEXT');
  }

  private ensureColumn(table: string, column: string, definition: string) {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!rows.some((row) => row.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  private seed() {
    const hasSettings = this.db.prepare('SELECT id FROM settings WHERE id = 1').get();
    if (!hasSettings) {
      this.db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(DEFAULT_SETTINGS));
    }

    const taskInsert = this.db.prepare(`
      INSERT INTO tasks (id, title, description, type, action, target, xp_reward, claimable)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        type = excluded.type,
        action = excluded.action,
        target = excluded.target,
        xp_reward = excluded.xp_reward,
        claimable = excluded.claimable
    `);
    for (const task of seededTasks) {
      taskInsert.run(task.id, task.title, task.description, task.type, task.action, task.target, task.xpReward, task.claimable ? 1 : 0);
    }

    const achievementInsert = this.db.prepare(`
      INSERT INTO achievement_defs (id, title, description, icon, color, action, target)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        icon = excluded.icon,
        color = excluded.color,
        action = excluded.action,
        target = excluded.target
    `);
    for (const achievement of seededAchievements) {
      achievementInsert.run(achievement.id, achievement.title, achievement.description, achievement.icon, achievement.color, achievement.action, achievement.target);
    }

    const newsInsert = this.db.prepare(`
      INSERT INTO news_articles (id, title, category, excerpt, content, cover_image, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image = excluded.cover_image,
        published_at = excluded.published_at
    `);
    for (const article of seededNews) {
      newsInsert.run(article.id, article.title, article.category, article.excerpt, article.content, article.coverImage, article.publishedAt);
    }

    this.upsertServer({
      id: MIDMINE_DEFAULT_SERVER.id,
      name: MIDMINE_DEFAULT_SERVER.name,
      host: MIDMINE_DEFAULT_SERVER.host,
      port: MIDMINE_DEFAULT_SERVER.port,
      versionHint: MIDMINE_DEFAULT_SERVER.versionHint,
      lastStatus: 'unknown',
      motd: 'Официальный сервер Mid-Mine',
      latencyMs: null,
      onlinePlayers: null,
      maxPlayers: null,
      checkedAt: null,
    });
  }

  getSettings(): LauncherSettings {
    const row = this.db.prepare('SELECT data FROM settings WHERE id = 1').get() as { data: string };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.data) };
  }

  updateSettings(settings: LauncherSettings) {
    this.db.prepare('UPDATE settings SET data = ? WHERE id = 1').run(JSON.stringify(settings));
  }

  listProfiles(): Profile[] {
    return this.db.prepare(`
      SELECT id, username, type, is_premium, avatar_path, skin_path, email, location, created_at, last_used_at, is_active
      FROM profiles
      ORDER BY is_active DESC, last_used_at DESC
    `).all().map((row: any) => ({
      id: row.id,
      username: row.username,
      type: row.type,
      isPremium: mapBoolean(row.is_premium),
      avatarPath: row.avatar_path,
      skinPath: row.skin_path,
      email: row.email,
      location: row.location,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      isActive: mapBoolean(row.is_active),
    }));
  }

  getActiveProfile(): Profile | null {
    return this.listProfiles().find((profile) => profile.isActive) ?? null;
  }

  createLocalProfile(input: {
    email: string;
    username: string;
    passwordHash: string;
    passwordSalt: string;
  }) {
    const existingByEmail = this.db.prepare('SELECT id FROM profiles WHERE lower(email) = lower(?) LIMIT 1').get(input.email) as { id: string } | undefined;
    if (existingByEmail) throw new Error('Аккаунт с таким email уже существует');
    const existingByName = this.db.prepare('SELECT id FROM profiles WHERE lower(username) = lower(?) LIMIT 1').get(input.username) as { id: string } | undefined;
    if (existingByName) throw new Error('Ник уже занят');

    this.db.prepare('UPDATE profiles SET is_active = 0').run();
    const id = randomUUID();
    const now = isoNow();
    this.db.prepare(`
      INSERT INTO profiles (id, username, type, is_premium, avatar_path, skin_path, email, password_hash, password_salt, location, created_at, last_used_at, is_active, login_streak)
      VALUES (?, ?, 'local', 0, NULL, NULL, ?, ?, ?, 'Россия, Москва', ?, ?, 1, 0)
    `).run(id, input.username, input.email, input.passwordHash, input.passwordSalt, now, now);
    return this.getActiveProfile()!;
  }

  getLocalProfileByEmail(email: string) {
    const row = this.db.prepare(`
      SELECT id, email, username, password_hash, password_salt
      FROM profiles
      WHERE lower(email) = lower(?) AND type = 'local'
      LIMIT 1
    `).get(email) as {
      id: string;
      email: string;
      username: string;
      password_hash: string | null;
      password_salt: string | null;
    } | undefined;
    return row ?? null;
  }

  activateProfile(profileId: string) {
    this.db.prepare('UPDATE profiles SET is_active = 0').run();
    this.db.prepare('UPDATE profiles SET is_active = 1, last_used_at = ? WHERE id = ?').run(isoNow(), profileId);
    return this.getActiveProfile();
  }

  upsertMicrosoftProfile(input: {
    username: string;
    email: string | null;
    uuid: string;
    xuid: string | null;
    encryptedBlob: string;
    expiresAt: string;
  }) {
    this.db.prepare('UPDATE profiles SET is_active = 0').run();
    const existing = input.email
      ? this.db.prepare('SELECT id FROM profiles WHERE lower(email) = lower(?) LIMIT 1').get(input.email) as { id: string } | undefined
      : undefined;
    const id = existing?.id ?? randomUUID();
    const now = isoNow();
    this.db.prepare(`
      INSERT INTO profiles (id, username, type, is_premium, email, created_at, last_used_at, is_active, location)
      VALUES (?, ?, 'microsoft', 1, ?, ?, ?, 1, 'Microsoft Account')
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        type = 'microsoft',
        is_premium = 1,
        email = excluded.email,
        last_used_at = excluded.last_used_at,
        is_active = 1,
        location = excluded.location
    `).run(id, input.username, input.email, now, now);
    this.db.prepare(`
      INSERT INTO auth_tokens (profile_id, encrypted_blob, expires_at, xuid, uuid, username)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        encrypted_blob = excluded.encrypted_blob,
        expires_at = excluded.expires_at,
        xuid = excluded.xuid,
        uuid = excluded.uuid,
        username = excluded.username
    `).run(id, input.encryptedBlob, input.expiresAt, input.xuid, input.uuid, input.username);
    return this.getActiveProfile()!;
  }

  clearAuthSession(profileId: string) {
    this.db.prepare('DELETE FROM auth_tokens WHERE profile_id = ?').run(profileId);
  }

  setActiveProfile(profileId: string) {
    return this.activateProfile(profileId);
  }

  clearActiveProfile() {
    this.db.prepare('UPDATE profiles SET is_active = 0').run();
  }

  updateProfile(input: Partial<Profile> & Pick<Profile, 'id'>) {
    const existing = this.listProfiles().find((profile) => profile.id === input.id);
    if (!existing) throw new Error('Профиль не найден');
    const merged = { ...existing, ...input };
    this.db.prepare(`
      UPDATE profiles
      SET username = ?, avatar_path = ?, skin_path = ?, email = ?, location = ?, is_premium = ?, last_used_at = ?
      WHERE id = ?
    `).run(
      merged.username,
      merged.avatarPath,
      merged.skinPath,
      merged.email,
      merged.location,
      merged.isPremium ? 1 : 0,
      isoNow(),
      merged.id,
    );
  }

  touchLauncherOpen(profileId: string) {
    const row = this.db.prepare('SELECT login_streak, last_open_day FROM profiles WHERE id = ?').get(profileId) as any;
    const today = getDayKey();
    let streak = Number(row?.login_streak ?? 0);
    if (row?.last_open_day === today) return streak;

    if (row?.last_open_day) {
      const previous = new Date();
      previous.setUTCDate(previous.getUTCDate() - 1);
      streak = row.last_open_day === getDayKey(previous) ? streak + 1 : 1;
    } else {
      streak = 1;
    }

    this.db.prepare('UPDATE profiles SET login_streak = ?, last_open_day = ? WHERE id = ?').run(streak, today, profileId);
    return streak;
  }

  replaceNews(articles: Omit<NewsArticle, 'readAt'>[]) {
    const insert = this.db.prepare(`
      INSERT INTO news_articles (id, title, category, excerpt, content, cover_image, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image = excluded.cover_image,
        published_at = excluded.published_at
    `);
    for (const article of articles) {
      insert.run(article.id, article.title, article.category, article.excerpt, article.content, article.coverImage, article.publishedAt);
    }
  }

  listNews(profileId: string): NewsArticle[] {
    return this.db.prepare(`
      SELECT n.id, n.title, n.category, n.excerpt, n.content, n.cover_image, n.published_at, r.read_at
      FROM news_articles n
      LEFT JOIN news_reads r ON r.article_id = n.id AND r.profile_id = ?
      ORDER BY n.published_at DESC
    `).all(profileId).map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      excerpt: row.excerpt,
      content: row.content,
      coverImage: row.cover_image,
      publishedAt: row.published_at,
      readAt: row.read_at,
    }));
  }

  markNewsRead(profileId: string, articleId: string) {
    const existing = this.db.prepare('SELECT article_id FROM news_reads WHERE article_id = ? AND profile_id = ?').get(articleId, profileId);
    if (existing) return false;
    this.db.prepare('INSERT INTO news_reads (article_id, profile_id, read_at) VALUES (?, ?, ?)').run(articleId, profileId, isoNow());
    return true;
  }

  listInstances(): InstanceSummary[] {
    return this.db.prepare(`
      SELECT id, name, minecraft_version, loader, loader_version, group_name, icon, status, installed, install_path, last_played_at, playtime_minutes, update_available, selected
      FROM instances
      ORDER BY selected DESC, installed DESC, last_played_at DESC, name ASC
    `).all().map((row: any) => ({
      id: row.id,
      name: row.name,
      minecraftVersion: row.minecraft_version,
      loader: row.loader,
      loaderVersion: row.loader_version,
      group: row.group_name,
      icon: row.icon,
      status: row.status,
      installed: mapBoolean(row.installed),
      installPath: row.install_path,
      lastPlayedAt: row.last_played_at,
      playtimeMinutes: Number(row.playtime_minutes ?? 0),
      updateAvailable: mapBoolean(row.update_available),
      selected: mapBoolean(row.selected),
    }));
  }

  getInstance(instanceId: string) {
    return this.listInstances().find((instance) => instance.id === instanceId) ?? null;
  }

  upsertInstance(input: Omit<InstanceSummary, 'playtimeMinutes'> & { playtimeMinutes?: number; versionId?: string | null }) {
    this.db.prepare(`
      INSERT INTO instances (id, name, minecraft_version, loader, loader_version, group_name, icon, status, installed, install_path, version_id, last_played_at, playtime_minutes, update_available, selected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        minecraft_version = excluded.minecraft_version,
        loader = excluded.loader,
        loader_version = excluded.loader_version,
        group_name = excluded.group_name,
        icon = excluded.icon,
        status = excluded.status,
        installed = excluded.installed,
        install_path = excluded.install_path,
        version_id = excluded.version_id,
        last_played_at = excluded.last_played_at,
        playtime_minutes = excluded.playtime_minutes,
        update_available = excluded.update_available,
        selected = excluded.selected
    `).run(
      input.id,
      input.name,
      input.minecraftVersion,
      input.loader,
      input.loaderVersion,
      input.group,
      input.icon,
      input.status,
      input.installed ? 1 : 0,
      input.installPath,
      input.versionId ?? null,
      input.lastPlayedAt,
      input.playtimeMinutes ?? 0,
      input.updateAvailable ? 1 : 0,
      input.selected ? 1 : 0,
    );
  }

  setSelectedInstance(instanceId: string) {
    this.db.prepare('UPDATE instances SET selected = 0').run();
    this.db.prepare('UPDATE instances SET selected = 1 WHERE id = ?').run(instanceId);
  }

  updateInstanceStatus(instanceId: string, status: string) {
    this.db.prepare('UPDATE instances SET status = ? WHERE id = ?').run(status, instanceId);
  }

  completeInstanceInstall(instanceId: string, versionId: string) {
    this.db.prepare(`
      UPDATE instances
      SET installed = 1, status = 'installed', update_available = 0, version_id = ?
      WHERE id = ?
    `).run(versionId, instanceId);
  }

  removeInstance(instanceId: string) {
    this.db.prepare('DELETE FROM instances WHERE id = ?').run(instanceId);
  }

  updateInstancePlaytime(instanceId: string, minutes: number) {
    this.db.prepare(`
      UPDATE instances
      SET playtime_minutes = playtime_minutes + ?, last_played_at = ?, status = 'installed'
      WHERE id = ?
    `).run(minutes, isoNow(), instanceId);
  }

  createSession(profileId: string, instanceId: string) {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO sessions (id, profile_id, instance_id, started_at)
      VALUES (?, ?, ?, ?)
    `).run(id, profileId, instanceId, isoNow());
    return id;
  }

  finishSession(sessionId: string, exitCode: number | null) {
    const row = this.db.prepare('SELECT started_at, instance_id FROM sessions WHERE id = ?').get(sessionId) as any;
    if (!row) return { instanceId: '', durationMinutes: 0 };
    const started = new Date(row.started_at);
    const durationMinutes = Math.max(1, Math.round((Date.now() - started.getTime()) / 60000));
    this.db.prepare(`
      UPDATE sessions
      SET ended_at = ?, duration_minutes = ?, exit_code = ?
      WHERE id = ?
    `).run(isoNow(), durationMinutes, exitCode, sessionId);
    return { instanceId: row.instance_id as string, durationMinutes };
  }

  upsertDownload(job: DownloadJob) {
    this.db.prepare(`
      INSERT INTO downloads (id, kind, label, progress, transferred_bytes, total_bytes, status, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        label = excluded.label,
        progress = excluded.progress,
        transferred_bytes = excluded.transferred_bytes,
        total_bytes = excluded.total_bytes,
        status = excluded.status,
        error = excluded.error
    `).run(job.id, job.kind, job.label, job.progress, job.transferredBytes, job.totalBytes, job.status, job.error);
  }

  clearDownload(downloadId: string) {
    this.db.prepare('DELETE FROM downloads WHERE id = ?').run(downloadId);
  }

  listDownloads(): DownloadJob[] {
    return this.db.prepare(`
      SELECT id, kind, label, progress, transferred_bytes, total_bytes, status, error
      FROM downloads
      ORDER BY label ASC
    `).all().map((row: any) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      progress: Number(row.progress),
      transferredBytes: Number(row.transferred_bytes),
      totalBytes: Number(row.total_bytes),
      status: row.status,
      error: row.error,
    }));
  }

  addLog(scope: LogEntry['scope'], level: LogEntry['level'], message: string) {
    this.db.prepare(`
      INSERT INTO logs (id, scope, level, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), scope, level, message, isoNow());
  }

  listLogs(): LogEntry[] {
    return this.db.prepare(`
      SELECT id, scope, level, message, timestamp
      FROM logs
      ORDER BY timestamp DESC
      LIMIT 200
    `).all().map((row: any) => ({
      id: row.id,
      scope: row.scope,
      level: row.level,
      message: row.message,
      timestamp: row.timestamp,
    }));
  }

  addActivity(profileId: string, kind: string, title: string, description: string) {
    this.db.prepare(`
      INSERT INTO activity_log (id, profile_id, kind, title, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), profileId, kind, title, description, isoNow());
  }

  listActivity(profileId: string): ActivityItem[] {
    return this.db.prepare(`
      SELECT id, kind, title, description, created_at
      FROM activity_log
      WHERE profile_id = ?
      ORDER BY created_at DESC
      LIMIT 24
    `).all(profileId).map((row: any) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
    }));
  }

  upsertServer(server: ServerEntry) {
    this.db.prepare(`
      INSERT INTO favorite_servers (id, name, host, port, version_hint, last_status, motd, latency_ms, online_players, max_players, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        host = excluded.host,
        port = excluded.port,
        version_hint = excluded.version_hint,
        last_status = excluded.last_status,
        motd = excluded.motd,
        latency_ms = excluded.latency_ms,
        online_players = excluded.online_players,
        max_players = excluded.max_players,
        checked_at = excluded.checked_at
    `).run(
      server.id,
      server.name,
      server.host,
      server.port,
      server.versionHint,
      server.lastStatus,
      server.motd,
      server.latencyMs,
      server.onlinePlayers,
      server.maxPlayers,
      server.checkedAt,
    );
  }

  listServers(): ServerEntry[] {
    return this.db.prepare(`
      SELECT id, name, host, port, version_hint, last_status, motd, latency_ms, online_players, max_players, checked_at
      FROM favorite_servers
      ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, name ASC
    `).all(MIDMINE_DEFAULT_SERVER.id).map((row: any) => ({
      id: row.id,
      name: row.name,
      host: row.host,
      port: Number(row.port),
      versionHint: row.version_hint,
      lastStatus: row.last_status,
      motd: row.motd,
      latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
      onlinePlayers: row.online_players === null ? null : Number(row.online_players),
      maxPlayers: row.max_players === null ? null : Number(row.max_players),
      checkedAt: row.checked_at,
    }));
  }

  removeServer(serverId: string) {
    if (serverId === MIDMINE_DEFAULT_SERVER.id) return;
    this.db.prepare('DELETE FROM favorite_servers WHERE id = ?').run(serverId);
  }

  upsertMod(input: {
    id: string;
    instanceId: string;
    projectId: string | null;
    versionId: string | null;
    title: string;
    description: string;
    author: string;
    downloads: number;
    versionNumber: string;
    iconUrl: string | null;
    localFileName: string | null;
    enabled: boolean;
    source: string;
  }) {
    this.db.prepare(`
      INSERT INTO mods (id, instance_id, project_id, version_id, title, description, author, downloads, version_number, icon_url, local_file_name, enabled, source, installed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        instance_id = excluded.instance_id,
        project_id = excluded.project_id,
        version_id = excluded.version_id,
        title = excluded.title,
        description = excluded.description,
        author = excluded.author,
        downloads = excluded.downloads,
        version_number = excluded.version_number,
        icon_url = excluded.icon_url,
        local_file_name = excluded.local_file_name,
        enabled = excluded.enabled,
        source = excluded.source
    `).run(
      input.id,
      input.instanceId,
      input.projectId,
      input.versionId,
      input.title,
      input.description,
      input.author,
      input.downloads,
      input.versionNumber,
      input.iconUrl,
      input.localFileName,
      input.enabled ? 1 : 0,
      input.source,
      isoNow(),
    );
  }

  listMods(instanceId: string) {
    return this.db.prepare(`
      SELECT id, project_id, version_id, title, description, author, downloads, version_number, icon_url, local_file_name, enabled
      FROM mods
      WHERE instance_id = ?
      ORDER BY title ASC
    `).all(instanceId);
  }

  setModEnabled(modId: string, enabled: boolean) {
    this.db.prepare('UPDATE mods SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, modId);
  }

  removeMod(modId: string) {
    this.db.prepare('DELETE FROM mods WHERE id = ?').run(modId);
  }

  getTaskProgress(profileId: string): TaskProgress[] {
    const rows = this.db.prepare(`
      SELECT t.id, t.title, t.description, t.type, t.action, t.target, t.xp_reward, t.claimable,
             p.progress, p.completed_at, p.claimed_at
      FROM tasks t
      LEFT JOIN task_progress p
        ON p.task_id = t.id AND p.profile_id = ? AND p.period_key = CASE t.type
          WHEN 'daily' THEN ?
          WHEN 'weekly' THEN ?
          ELSE 'one_time'
        END
      ORDER BY t.type ASC, t.title ASC
    `).all(profileId, getDayKey(), getWeekKey());
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      action: row.action,
      target: Number(row.target),
      xpReward: Number(row.xp_reward),
      claimable: mapBoolean(row.claimable),
      progress: Number(row.progress ?? 0),
      completedAt: row.completed_at,
      claimedAt: row.claimed_at,
    }));
  }

  private ensureTaskRow(profileId: string, taskId: string, type: 'one_time' | 'daily' | 'weekly') {
    const periodKey = getPeriodKey(type);
    this.db.prepare(`
      INSERT INTO task_progress (task_id, profile_id, period_key, progress)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(task_id, profile_id, period_key) DO NOTHING
    `).run(taskId, profileId, periodKey);
    return periodKey;
  }

  incrementAction(profileId: string, action: TaskAction, amount = 1) {
    const tasks = this.db.prepare('SELECT id, type, target FROM tasks WHERE action = ?').all(action) as Array<{ id: string; type: 'one_time' | 'daily' | 'weekly'; target: number }>;
    for (const task of tasks) {
      const periodKey = this.ensureTaskRow(profileId, task.id, task.type);
      this.db.prepare(`
        UPDATE task_progress
        SET progress = MIN(progress + ?, ?),
            completed_at = CASE
              WHEN progress + ? >= ? AND completed_at IS NULL THEN ?
              ELSE completed_at
            END
        WHERE task_id = ? AND profile_id = ? AND period_key = ?
      `).run(amount, task.target, amount, task.target, isoNow(), task.id, profileId, periodKey);
    }

    const achievements = this.db.prepare('SELECT id, target FROM achievement_defs WHERE action = ?').all(action) as Array<{ id: string; target: number }>;
    for (const achievement of achievements) {
      this.db.prepare(`
        INSERT INTO achievement_progress (achievement_id, profile_id, progress, unlocked_at)
        VALUES (?, ?, 0, NULL)
        ON CONFLICT(achievement_id, profile_id) DO NOTHING
      `).run(achievement.id, profileId);

      this.db.prepare(`
        UPDATE achievement_progress
        SET progress = MIN(progress + ?, ?),
            unlocked_at = CASE
              WHEN progress + ? >= ? AND unlocked_at IS NULL THEN ?
              ELSE unlocked_at
            END
        WHERE achievement_id = ? AND profile_id = ?
      `).run(amount, achievement.target, amount, achievement.target, isoNow(), achievement.id, profileId);
    }
  }

  claimTask(profileId: string, taskId: string) {
    const task = this.getTaskProgress(profileId).find((entry) => entry.id === taskId);
    if (!task) throw new Error('Задание не найдено');
    if (task.progress < task.target) throw new Error('Задание ещё не выполнено');
    if (task.claimedAt) throw new Error('Награда уже получена');
    const periodKey = getPeriodKey(task.type);
    this.db.prepare(`
      UPDATE task_progress
      SET claimed_at = ?
      WHERE task_id = ? AND profile_id = ? AND period_key = ?
    `).run(isoNow(), taskId, profileId, periodKey);
    this.addXp(profileId, 'claim_task', task.xpReward, taskId);
  }

  addXp(profileId: string, sourceAction: string, amount: number, referenceId?: string | null) {
    this.db.prepare(`
      INSERT INTO xp_events (id, profile_id, source_action, amount, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), profileId, sourceAction, amount, referenceId ?? null, isoNow());
  }

  getAchievements(profileId: string) {
    return this.db.prepare(`
      SELECT d.id, d.title, d.description, d.icon, d.color, d.action, d.target,
             p.progress, p.unlocked_at
      FROM achievement_defs d
      LEFT JOIN achievement_progress p
        ON p.achievement_id = d.id AND p.profile_id = ?
      ORDER BY COALESCE(p.unlocked_at, '') DESC, d.title ASC
    `).all(profileId);
  }

  getProgression(profileId: string) {
    const totalXp = Number((this.db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE profile_id = ?').get(profileId) as any).total ?? 0);
    let level = 1;
    let levelStartXp = 0;
    let nextLevelXp = LEVEL_XP_BASE;
    while (totalXp >= nextLevelXp) {
      levelStartXp = nextLevelXp;
      level += 1;
      nextLevelXp += LEVEL_XP_BASE + (level - 1) * 180;
    }

    return {
      currentXp: totalXp,
      level,
      levelStartXp,
      nextLevelXp,
      totalPlaytimeMinutes: Number((this.db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) AS total FROM sessions WHERE profile_id = ?').get(profileId) as any).total ?? 0),
      launches: Number((this.db.prepare('SELECT COUNT(*) AS total FROM sessions WHERE profile_id = ? AND ended_at IS NOT NULL').get(profileId) as any).total ?? 0),
      loginStreak: Number((this.db.prepare('SELECT login_streak FROM profiles WHERE id = ?').get(profileId) as any)?.login_streak ?? 0),
      installedBuilds: Number((this.db.prepare('SELECT COUNT(*) AS total FROM instances WHERE installed = 1').get() as any).total ?? 0),
      verifiedFilesCount: Number((this.db.prepare("SELECT COUNT(*) AS total FROM activity_log WHERE profile_id = ? AND kind = 'verify'").get(profileId) as any).total ?? 0),
      newsReadCount: Number((this.db.prepare('SELECT COUNT(*) AS total FROM news_reads WHERE profile_id = ?').get(profileId) as any).total ?? 0),
      tasks: this.getTaskProgress(profileId),
      achievements: this.getAchievements(profileId).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        icon: row.icon,
        color: row.color,
        action: row.action,
        target: Number(row.target),
        progress: Number(row.progress ?? 0),
        unlockedAt: row.unlocked_at,
      })),
    };
  }

  getSnapshot(profileId: string | null, updateState: UpdateState, versionCatalog: VersionCatalogEntry[] = []) {
    return {
      profile: this.getActiveProfile(),
      settings: this.getSettings(),
      instances: this.listInstances(),
      versionCatalog,
      news: profileId ? this.listNews(profileId) : [],
      progression: profileId ? this.getProgression(profileId) : {
        currentXp: 0,
        level: 1,
        levelStartXp: 0,
        nextLevelXp: LEVEL_XP_BASE,
        totalPlaytimeMinutes: 0,
        launches: 0,
        loginStreak: 0,
        installedBuilds: 0,
        verifiedFilesCount: 0,
        newsReadCount: 0,
        tasks: [],
        achievements: [],
      },
      activity: profileId ? this.listActivity(profileId) : [],
      downloads: this.listDownloads(),
      logs: this.listLogs(),
      servers: this.listServers(),
      update: updateState,
    };
  }
}
