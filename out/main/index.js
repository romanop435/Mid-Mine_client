import { dialog, safeStorage, BrowserWindow, ipcMain, app } from "electron";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { randomUUID, randomBytes, scryptSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { rm, writeFile, readdir, mkdir, copyFile, readFile, rename } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import electronUpdater from "electron-updater";
import { status } from "minecraft-server-util";
import { PublicClientApplication } from "@azure/msal-node";
import { MinecraftFolder, Version, launch } from "@xmcl/core";
import { getVersionList, install, getFabricLoaders, installFabric, getForgeVersionList, installForge, installNeoForged, installDependencies } from "@xmcl/installer";
import { z } from "zod";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const DATABASE_NAME = "midmine.db";
const DEFAULT_GAME_DIRECTORY = join(homedir(), "AppData", "Roaming", ".midmine");
const DEFAULT_RAM_MB = 4096;
const DEFAULT_RESOLUTION = "1920x1080";
const DEFAULT_JAVA_CHANNEL = "Java 21";
const LEVEL_XP_BASE = 450;
const UPDATE_FEED_ENV = "MIDMINE_UPDATE_FEED";
const NEWS_FEED_ENV = "MIDMINE_NEWS_FEED_URL";
const MIDMINE_DEFAULT_SERVER = {
  id: "midmine-default-server",
  name: "Mid-Mine | Clans SMP",
  host: "45.11.16.75",
  port: 26002,
  versionHint: "Vanilla 1.20.1"
};
const seededNews = [
  {
    id: "news-launcher-2-0",
    title: "Обновление Mid-Mine 2.0",
    category: "Лаунчер",
    excerpt: "Новая версия с улучшенной производительностью, поддержкой сборок и переработанной домашней страницей.",
    content: "Mid-Mine Launcher 2.0 приносит стеклянный интерфейс, менеджер модов, полноценную установку сборок и новую систему прогресса внутри лаунчера.",
    coverImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-03-10T10:00:00.000Z"
  },
  {
    id: "news-fabric-support",
    title: "Fabric для 1.20.4 уже доступен",
    category: "Сборки",
    excerpt: "Добавили установку Fabric и быстрый импорт модов из Modrinth прямо из лаунчера.",
    content: "Теперь Mid-Mine умеет ставить чистую Fabric-сборку на Minecraft 1.20.4 и подтягивать совместимые моды через Modrinth API.",
    coverImage: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-03-05T14:30:00.000Z"
  },
  {
    id: "news-daily-tasks",
    title: "Ежедневные задания активированы",
    category: "Прогресс",
    excerpt: "Открывайте лаунчер, читайте новости и устанавливайте сборки, чтобы получать XP и достижения.",
    content: "Система заданий полностью локальная. Никакие игровые статистики Minecraft не читаются, кроме времени сессии, запущенной через лаунчер.",
    coverImage: "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-03-01T09:15:00.000Z"
  }
];
const seededTasks = [
  {
    id: "daily-open-launcher",
    title: "Ежедневный вход",
    description: "Откройте лаунчер сегодня",
    type: "daily",
    action: "launcher_open",
    target: 1,
    xpReward: 120,
    claimable: true
  },
  {
    id: "read-one-news",
    title: "Прочитать новость",
    description: "Откройте 1 новость в разделе Home",
    type: "daily",
    action: "read_news",
    target: 1,
    xpReward: 150,
    claimable: true
  },
  {
    id: "install-first-build",
    title: "Установить сборку",
    description: "Установите любую сборку или версию",
    type: "one_time",
    action: "install_instance",
    target: 1,
    xpReward: 500,
    claimable: true
  },
  {
    id: "launch-once",
    title: "Первый запуск",
    description: "Запустите игру через Mid-Mine",
    type: "one_time",
    action: "launch_game",
    target: 1,
    xpReward: 650,
    claimable: true
  },
  {
    id: "play-30-minutes",
    title: "Полчаса в игре",
    description: "Проведите 30 минут в игре через лаунчер",
    type: "weekly",
    action: "play_minutes",
    target: 30,
    xpReward: 800,
    claimable: true
  },
  {
    id: "verify-files",
    title: "Проверка файлов",
    description: "Запустите проверку установленной сборки",
    type: "one_time",
    action: "verify_files",
    target: 1,
    xpReward: 350,
    claimable: true
  }
];
const seededAchievements = [
  {
    id: "first-launcher-open",
    title: "First Launch",
    description: "Откройте Mid-Mine впервые",
    icon: "🚀",
    color: "#4ade80",
    action: "launcher_open",
    target: 1
  },
  {
    id: "first-build-install",
    title: "Installed First Build",
    description: "Установите первую сборку или версию",
    icon: "📦",
    color: "#22d3ee",
    action: "install_instance",
    target: 1
  },
  {
    id: "first-task-complete",
    title: "Completed First Task",
    description: "Завершите первое задание",
    icon: "✅",
    color: "#f59e0b",
    action: "claim_task",
    target: 1
  },
  {
    id: "read-10-news",
    title: "Read 10 News Posts",
    description: "Откройте 10 новостей",
    icon: "📰",
    color: "#60a5fa",
    action: "read_news",
    target: 10
  },
  {
    id: "played-10-hours",
    title: "Played 10 Total Hours",
    description: "Накопите 10 часов через лаунчер",
    icon: "⏳",
    color: "#f97316",
    action: "play_minutes",
    target: 600
  },
  {
    id: "verified-files",
    title: "Verified Files",
    description: "Один раз выполните проверку файлов",
    icon: "🛡️",
    color: "#a78bfa",
    action: "verify_files",
    target: 1
  },
  {
    id: "customized-profile",
    title: "Customized Profile",
    description: "Измените профиль или аватар",
    icon: "🎨",
    color: "#fb7185",
    action: "customize_profile",
    target: 1
  },
  {
    id: "logged-in-7-days",
    title: "Logged In 7 Days in a Row",
    description: "Заходите в лаунчер 7 дней подряд",
    icon: "🔥",
    color: "#ef4444",
    action: "login_streak",
    target: 7
  }
];
const DEFAULT_SETTINGS = {
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
  ambientSound: true
};
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function getDayKey(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().slice(0, 10);
}
function getWeekKey(date = /* @__PURE__ */ new Date()) {
  const current = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((current.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
function getPeriodKey(type) {
  if (type === "daily") return getDayKey();
  if (type === "weekly") return getWeekKey();
  return "one_time";
}
function mapBoolean(value) {
  return Number(value) === 1;
}
class LauncherDatabase {
  db;
  constructor(databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.migrate();
    this.seed();
  }
  migrate() {
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
    this.ensureColumn("profiles", "is_premium", "INTEGER NOT NULL DEFAULT 0");
    this.ensureColumn("profiles", "password_hash", "TEXT");
    this.ensureColumn("profiles", "password_salt", "TEXT");
  }
  ensureColumn(table, column, definition) {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all();
    if (!rows.some((row) => row.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
  seed() {
    const hasSettings = this.db.prepare("SELECT id FROM settings WHERE id = 1").get();
    if (!hasSettings) {
      this.db.prepare("INSERT INTO settings (id, data) VALUES (1, ?)").run(JSON.stringify(DEFAULT_SETTINGS));
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
      lastStatus: "unknown",
      motd: "Официальный сервер Mid-Mine",
      latencyMs: null,
      onlinePlayers: null,
      maxPlayers: null,
      checkedAt: null
    });
  }
  getSettings() {
    const row = this.db.prepare("SELECT data FROM settings WHERE id = 1").get();
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.data) };
  }
  updateSettings(settings) {
    this.db.prepare("UPDATE settings SET data = ? WHERE id = 1").run(JSON.stringify(settings));
  }
  listProfiles() {
    return this.db.prepare(`
      SELECT id, username, type, is_premium, avatar_path, skin_path, email, location, created_at, last_used_at, is_active
      FROM profiles
      ORDER BY is_active DESC, last_used_at DESC
    `).all().map((row) => ({
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
      isActive: mapBoolean(row.is_active)
    }));
  }
  getActiveProfile() {
    return this.listProfiles().find((profile) => profile.isActive) ?? null;
  }
  createLocalProfile(input) {
    const existingByEmail = this.db.prepare("SELECT id FROM profiles WHERE lower(email) = lower(?) LIMIT 1").get(input.email);
    if (existingByEmail) throw new Error("Аккаунт с таким email уже существует");
    const existingByName = this.db.prepare("SELECT id FROM profiles WHERE lower(username) = lower(?) LIMIT 1").get(input.username);
    if (existingByName) throw new Error("Ник уже занят");
    this.db.prepare("UPDATE profiles SET is_active = 0").run();
    const id = randomUUID();
    const now = isoNow();
    this.db.prepare(`
      INSERT INTO profiles (id, username, type, is_premium, avatar_path, skin_path, email, password_hash, password_salt, location, created_at, last_used_at, is_active, login_streak)
      VALUES (?, ?, 'local', 0, NULL, NULL, ?, ?, ?, 'Россия, Москва', ?, ?, 1, 0)
    `).run(id, input.username, input.email, input.passwordHash, input.passwordSalt, now, now);
    return this.getActiveProfile();
  }
  getLocalProfileByEmail(email) {
    const row = this.db.prepare(`
      SELECT id, email, username, password_hash, password_salt
      FROM profiles
      WHERE lower(email) = lower(?) AND type = 'local'
      LIMIT 1
    `).get(email);
    return row ?? null;
  }
  activateProfile(profileId) {
    this.db.prepare("UPDATE profiles SET is_active = 0").run();
    this.db.prepare("UPDATE profiles SET is_active = 1, last_used_at = ? WHERE id = ?").run(isoNow(), profileId);
    return this.getActiveProfile();
  }
  upsertMicrosoftProfile(input) {
    this.db.prepare("UPDATE profiles SET is_active = 0").run();
    const existing = input.email ? this.db.prepare("SELECT id FROM profiles WHERE lower(email) = lower(?) LIMIT 1").get(input.email) : void 0;
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
    return this.getActiveProfile();
  }
  clearAuthSession(profileId) {
    this.db.prepare("DELETE FROM auth_tokens WHERE profile_id = ?").run(profileId);
  }
  setActiveProfile(profileId) {
    return this.activateProfile(profileId);
  }
  clearActiveProfile() {
    this.db.prepare("UPDATE profiles SET is_active = 0").run();
  }
  updateProfile(input) {
    const existing = this.listProfiles().find((profile) => profile.id === input.id);
    if (!existing) throw new Error("Профиль не найден");
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
      merged.id
    );
  }
  touchLauncherOpen(profileId) {
    const row = this.db.prepare("SELECT login_streak, last_open_day FROM profiles WHERE id = ?").get(profileId);
    const today = getDayKey();
    let streak = Number(row?.login_streak ?? 0);
    if (row?.last_open_day === today) return streak;
    if (row?.last_open_day) {
      const previous = /* @__PURE__ */ new Date();
      previous.setUTCDate(previous.getUTCDate() - 1);
      streak = row.last_open_day === getDayKey(previous) ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    this.db.prepare("UPDATE profiles SET login_streak = ?, last_open_day = ? WHERE id = ?").run(streak, today, profileId);
    return streak;
  }
  replaceNews(articles) {
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
  listNews(profileId) {
    return this.db.prepare(`
      SELECT n.id, n.title, n.category, n.excerpt, n.content, n.cover_image, n.published_at, r.read_at
      FROM news_articles n
      LEFT JOIN news_reads r ON r.article_id = n.id AND r.profile_id = ?
      ORDER BY n.published_at DESC
    `).all(profileId).map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      excerpt: row.excerpt,
      content: row.content,
      coverImage: row.cover_image,
      publishedAt: row.published_at,
      readAt: row.read_at
    }));
  }
  markNewsRead(profileId, articleId) {
    const existing = this.db.prepare("SELECT article_id FROM news_reads WHERE article_id = ? AND profile_id = ?").get(articleId, profileId);
    if (existing) return false;
    this.db.prepare("INSERT INTO news_reads (article_id, profile_id, read_at) VALUES (?, ?, ?)").run(articleId, profileId, isoNow());
    return true;
  }
  listInstances() {
    return this.db.prepare(`
      SELECT id, name, minecraft_version, loader, loader_version, group_name, icon, status, installed, install_path, last_played_at, playtime_minutes, update_available, selected
      FROM instances
      ORDER BY selected DESC, installed DESC, last_played_at DESC, name ASC
    `).all().map((row) => ({
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
      selected: mapBoolean(row.selected)
    }));
  }
  getInstance(instanceId) {
    return this.listInstances().find((instance) => instance.id === instanceId) ?? null;
  }
  upsertInstance(input) {
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
      input.selected ? 1 : 0
    );
  }
  setSelectedInstance(instanceId) {
    this.db.prepare("UPDATE instances SET selected = 0").run();
    this.db.prepare("UPDATE instances SET selected = 1 WHERE id = ?").run(instanceId);
  }
  updateInstanceStatus(instanceId, status2) {
    this.db.prepare("UPDATE instances SET status = ? WHERE id = ?").run(status2, instanceId);
  }
  completeInstanceInstall(instanceId, versionId) {
    this.db.prepare(`
      UPDATE instances
      SET installed = 1, status = 'installed', update_available = 0, version_id = ?
      WHERE id = ?
    `).run(versionId, instanceId);
  }
  removeInstance(instanceId) {
    this.db.prepare("DELETE FROM instances WHERE id = ?").run(instanceId);
  }
  updateInstancePlaytime(instanceId, minutes) {
    this.db.prepare(`
      UPDATE instances
      SET playtime_minutes = playtime_minutes + ?, last_played_at = ?, status = 'installed'
      WHERE id = ?
    `).run(minutes, isoNow(), instanceId);
  }
  createSession(profileId, instanceId) {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO sessions (id, profile_id, instance_id, started_at)
      VALUES (?, ?, ?, ?)
    `).run(id, profileId, instanceId, isoNow());
    return id;
  }
  finishSession(sessionId, exitCode) {
    const row = this.db.prepare("SELECT started_at, instance_id FROM sessions WHERE id = ?").get(sessionId);
    if (!row) return { instanceId: "", durationMinutes: 0 };
    const started = new Date(row.started_at);
    const durationMinutes = Math.max(1, Math.round((Date.now() - started.getTime()) / 6e4));
    this.db.prepare(`
      UPDATE sessions
      SET ended_at = ?, duration_minutes = ?, exit_code = ?
      WHERE id = ?
    `).run(isoNow(), durationMinutes, exitCode, sessionId);
    return { instanceId: row.instance_id, durationMinutes };
  }
  upsertDownload(job) {
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
  clearDownload(downloadId) {
    this.db.prepare("DELETE FROM downloads WHERE id = ?").run(downloadId);
  }
  listDownloads() {
    return this.db.prepare(`
      SELECT id, kind, label, progress, transferred_bytes, total_bytes, status, error
      FROM downloads
      ORDER BY label ASC
    `).all().map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      progress: Number(row.progress),
      transferredBytes: Number(row.transferred_bytes),
      totalBytes: Number(row.total_bytes),
      status: row.status,
      error: row.error
    }));
  }
  addLog(scope, level, message) {
    this.db.prepare(`
      INSERT INTO logs (id, scope, level, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), scope, level, message, isoNow());
  }
  listLogs() {
    return this.db.prepare(`
      SELECT id, scope, level, message, timestamp
      FROM logs
      ORDER BY timestamp DESC
      LIMIT 200
    `).all().map((row) => ({
      id: row.id,
      scope: row.scope,
      level: row.level,
      message: row.message,
      timestamp: row.timestamp
    }));
  }
  addActivity(profileId, kind, title, description) {
    this.db.prepare(`
      INSERT INTO activity_log (id, profile_id, kind, title, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), profileId, kind, title, description, isoNow());
  }
  listActivity(profileId) {
    return this.db.prepare(`
      SELECT id, kind, title, description, created_at
      FROM activity_log
      WHERE profile_id = ?
      ORDER BY created_at DESC
      LIMIT 24
    `).all(profileId).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      createdAt: row.created_at
    }));
  }
  upsertServer(server) {
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
      server.checkedAt
    );
  }
  listServers() {
    return this.db.prepare(`
      SELECT id, name, host, port, version_hint, last_status, motd, latency_ms, online_players, max_players, checked_at
      FROM favorite_servers
      ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, name ASC
    `).all(MIDMINE_DEFAULT_SERVER.id).map((row) => ({
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
      checkedAt: row.checked_at
    }));
  }
  removeServer(serverId) {
    if (serverId === MIDMINE_DEFAULT_SERVER.id) return;
    this.db.prepare("DELETE FROM favorite_servers WHERE id = ?").run(serverId);
  }
  upsertMod(input) {
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
      isoNow()
    );
  }
  listMods(instanceId) {
    return this.db.prepare(`
      SELECT id, project_id, version_id, title, description, author, downloads, version_number, icon_url, local_file_name, enabled
      FROM mods
      WHERE instance_id = ?
      ORDER BY title ASC
    `).all(instanceId);
  }
  setModEnabled(modId, enabled) {
    this.db.prepare("UPDATE mods SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, modId);
  }
  removeMod(modId) {
    this.db.prepare("DELETE FROM mods WHERE id = ?").run(modId);
  }
  getTaskProgress(profileId) {
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
    return rows.map((row) => ({
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
      claimedAt: row.claimed_at
    }));
  }
  ensureTaskRow(profileId, taskId, type) {
    const periodKey = getPeriodKey(type);
    this.db.prepare(`
      INSERT INTO task_progress (task_id, profile_id, period_key, progress)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(task_id, profile_id, period_key) DO NOTHING
    `).run(taskId, profileId, periodKey);
    return periodKey;
  }
  incrementAction(profileId, action, amount = 1) {
    const tasks = this.db.prepare("SELECT id, type, target FROM tasks WHERE action = ?").all(action);
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
    const achievements = this.db.prepare("SELECT id, target FROM achievement_defs WHERE action = ?").all(action);
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
  claimTask(profileId, taskId) {
    const task = this.getTaskProgress(profileId).find((entry) => entry.id === taskId);
    if (!task) throw new Error("Задание не найдено");
    if (task.progress < task.target) throw new Error("Задание ещё не выполнено");
    if (task.claimedAt) throw new Error("Награда уже получена");
    const periodKey = getPeriodKey(task.type);
    this.db.prepare(`
      UPDATE task_progress
      SET claimed_at = ?
      WHERE task_id = ? AND profile_id = ? AND period_key = ?
    `).run(isoNow(), taskId, profileId, periodKey);
    this.addXp(profileId, "claim_task", task.xpReward, taskId);
  }
  addXp(profileId, sourceAction, amount, referenceId) {
    this.db.prepare(`
      INSERT INTO xp_events (id, profile_id, source_action, amount, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), profileId, sourceAction, amount, referenceId ?? null, isoNow());
  }
  getAchievements(profileId) {
    return this.db.prepare(`
      SELECT d.id, d.title, d.description, d.icon, d.color, d.action, d.target,
             p.progress, p.unlocked_at
      FROM achievement_defs d
      LEFT JOIN achievement_progress p
        ON p.achievement_id = d.id AND p.profile_id = ?
      ORDER BY COALESCE(p.unlocked_at, '') DESC, d.title ASC
    `).all(profileId);
  }
  getProgression(profileId) {
    const totalXp = Number(this.db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE profile_id = ?").get(profileId).total ?? 0);
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
      totalPlaytimeMinutes: Number(this.db.prepare("SELECT COALESCE(SUM(duration_minutes), 0) AS total FROM sessions WHERE profile_id = ?").get(profileId).total ?? 0),
      launches: Number(this.db.prepare("SELECT COUNT(*) AS total FROM sessions WHERE profile_id = ? AND ended_at IS NOT NULL").get(profileId).total ?? 0),
      loginStreak: Number(this.db.prepare("SELECT login_streak FROM profiles WHERE id = ?").get(profileId)?.login_streak ?? 0),
      installedBuilds: Number(this.db.prepare("SELECT COUNT(*) AS total FROM instances WHERE installed = 1").get().total ?? 0),
      verifiedFilesCount: Number(this.db.prepare("SELECT COUNT(*) AS total FROM activity_log WHERE profile_id = ? AND kind = 'verify'").get(profileId).total ?? 0),
      newsReadCount: Number(this.db.prepare("SELECT COUNT(*) AS total FROM news_reads WHERE profile_id = ?").get(profileId).total ?? 0),
      tasks: this.getTaskProgress(profileId),
      achievements: this.getAchievements(profileId).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        icon: row.icon,
        color: row.color,
        action: row.action,
        target: Number(row.target),
        progress: Number(row.progress ?? 0),
        unlockedAt: row.unlocked_at
      }))
    };
  }
  getSnapshot(profileId, updateState, versionCatalog = []) {
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
        achievements: []
      },
      activity: profileId ? this.listActivity(profileId) : [],
      downloads: this.listDownloads(),
      logs: this.listLogs(),
      servers: this.listServers(),
      update: updateState
    };
  }
}
const execFileAsync = promisify(execFile);
class JavaService {
  constructor(runtimeDir) {
    this.runtimeDir = runtimeDir;
    mkdirSync(this.runtimeDir, { recursive: true });
  }
  async detectJava(settings, requiredMajor) {
    const detected = await this.detectJavaStatus(settings, requiredMajor);
    return detected.javaPath;
  }
  async detectJavaStatus(settings, requiredMajor) {
    const candidates = [
      { path: settings.javaPath, source: "configured" },
      { path: join(process.resourcesPath, "java", "bin", "java.exe"), source: "bundled" },
      { path: process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", "java.exe") : null, source: "system" },
      { path: join(this.runtimeDir, `java-${requiredMajor ?? 21}`, "bin", "java.exe"), source: "downloaded" }
    ];
    for (const candidate of candidates) {
      if (!candidate.path || !this.isExecutable(candidate.path)) continue;
      const majorVersion = await this.getJavaMajor(candidate.path);
      if (!requiredMajor || majorVersion === null || majorVersion >= requiredMajor) {
        return { javaPath: candidate.path, source: candidate.source, majorVersion };
      }
    }
    try {
      const { stdout } = await execFileAsync("where.exe", ["java"]);
      const entries = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      for (const entry of entries) {
        if (!this.isExecutable(entry)) continue;
        const majorVersion = await this.getJavaMajor(entry);
        if (!requiredMajor || majorVersion === null || majorVersion >= requiredMajor) {
          return { javaPath: entry, source: "system", majorVersion };
        }
      }
    } catch {
      return { javaPath: null, source: "missing", majorVersion: null };
    }
    return { javaPath: null, source: "missing", majorVersion: null };
  }
  async ensureJavaForVersion(settings, minecraftVersion) {
    const requiredMajor = this.getRequiredJavaMajor(minecraftVersion);
    const detected = await this.detectJavaStatus(settings, requiredMajor);
    if (detected.javaPath) return { ...detected, requiredMajor };
    const javaPath = await this.downloadRuntime(requiredMajor);
    return {
      javaPath,
      source: "downloaded",
      majorVersion: requiredMajor,
      requiredMajor
    };
  }
  getRequiredJavaMajor(minecraftVersion) {
    const parts = minecraftVersion.split(".").map((part) => Number(part || 0));
    const major = parts[0] ?? 0;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;
    if (major > 1) return 21;
    if (minor >= 21) return 21;
    if (minor === 20 && patch >= 5) return 21;
    if (minor >= 18) return 17;
    if (minor === 17) return 16;
    return 8;
  }
  async downloadRuntime(major) {
    const response = await fetch(
      `https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse`
    );
    if (!response.ok) {
      throw new Error(`Не удалось получить ссылку на Java ${major}`);
    }
    const releases = await response.json();
    const asset = releases.find((item) => item.binary?.package?.link)?.binary?.package;
    if (!asset?.link || !asset.name) {
      throw new Error(`Для Java ${major} не найден runtime package`);
    }
    const targetDir = join(this.runtimeDir, `java-${major}`);
    const archivePath = join(this.runtimeDir, asset.name);
    await rm(targetDir, { recursive: true, force: true });
    const archiveResponse = await fetch(asset.link);
    if (!archiveResponse.ok) {
      throw new Error(`Не удалось скачать Java ${major}`);
    }
    const archiveBuffer = Buffer.from(await archiveResponse.arrayBuffer());
    await writeFile(archivePath, archiveBuffer);
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path "${archivePath}" -DestinationPath "${targetDir}" -Force`
    ]);
    const extractedRoot = await this.findJavaRoot(targetDir);
    const javaPath = join(extractedRoot, "bin", "java.exe");
    if (!this.isExecutable(javaPath)) {
      throw new Error(`Java ${major} распакована, но java.exe не найдена`);
    }
    return javaPath;
  }
  async findJavaRoot(targetDir) {
    const direct = join(targetDir, "bin", "java.exe");
    if (this.isExecutable(direct)) return targetDir;
    const entries = await readdir(targetDir, { withFileTypes: true });
    const firstDirectory = entries.find((entry) => entry.isDirectory());
    if (!firstDirectory) return targetDir;
    return join(targetDir, firstDirectory.name);
  }
  async getJavaMajor(javaPath) {
    try {
      const { stderr, stdout } = await execFileAsync(javaPath, ["-version"]);
      const source = `${stderr}
${stdout}`;
      const match = source.match(/version "(\d+)(?:\.(\d+))?/);
      if (!match) return null;
      const raw = Number(match[1]);
      return raw === 1 ? Number(match[2] ?? 8) : raw;
    } catch {
      return null;
    }
  }
  isExecutable(filePath) {
    try {
      if (!existsSync(filePath)) return false;
      accessSync(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
const { autoUpdater } = electronUpdater;
class UpdateService {
  state = {
    available: false,
    version: null,
    notes: null,
    downloaded: false,
    supported: Boolean(process.env[UPDATE_FEED_ENV]),
    message: process.env[UPDATE_FEED_ENV] ? "Проверка обновлений доступна" : "Фид обновлений не настроен. Автообновление отключено."
  };
  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.on("update-available", (info) => {
      this.state = {
        available: true,
        version: info.version,
        notes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
        downloaded: false,
        supported: true,
        message: "Доступно обновление лаунчера"
      };
    });
    autoUpdater.on("update-not-available", () => {
      this.state = {
        available: false,
        version: null,
        notes: null,
        downloaded: false,
        supported: true,
        message: "Обновления не найдены"
      };
    });
    autoUpdater.on("update-downloaded", (info) => {
      this.state = {
        available: true,
        version: info.version,
        notes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
        downloaded: true,
        supported: true,
        message: "Обновление загружено и готово к установке"
      };
    });
  }
  getState() {
    return this.state;
  }
  async check() {
    if (!this.state.supported) return this.state;
    await autoUpdater.checkForUpdates();
    return this.state;
  }
  apply() {
    if (!this.state.downloaded) return this.state;
    autoUpdater.quitAndInstall();
    return this.state;
  }
}
const XP_REWARDS = {
  launcher_open: 40,
  read_news: 65,
  install_instance: 220,
  launch_game: 180,
  play_minutes: 4,
  verify_files: 140,
  visit_settings: 50,
  customize_profile: 90,
  open_achievements: 35,
  login_streak: 25,
  claim_task: 0
};
class ProgressionService {
  constructor(db) {
    this.db = db;
  }
  onLauncherOpen(profileId) {
    const streak = this.db.touchLauncherOpen(profileId);
    this.record(profileId, "launcher_open", 1, null, "system", "Лаунчер открыт", "Ежедневный вход зарегистрирован");
    if (streak > 0) {
      this.db.incrementAction(profileId, "login_streak", 1);
    }
    return this.db.getProgression(profileId);
  }
  record(profileId, action, amount = 1, referenceId = null, kind, title, description) {
    this.db.incrementAction(profileId, action, amount);
    const xp = XP_REWARDS[action] ?? 0;
    if (xp > 0) {
      this.db.addXp(profileId, action, xp * amount, referenceId);
    }
    if (kind && title && description) {
      this.db.addActivity(profileId, kind, title, description);
    }
    return this.db.getProgression(profileId);
  }
  claimTask(profileId, taskId) {
    this.db.claimTask(profileId, taskId);
    this.db.incrementAction(profileId, "claim_task", 1);
    this.db.addActivity(profileId, "task", "Задание завершено", `Получена награда за задание ${taskId}`);
    return this.db.getProgression(profileId);
  }
}
class SettingsService {
  constructor(db, javaService) {
    this.db = db;
    this.javaService = javaService;
  }
  get() {
    return this.db.getSettings();
  }
  update(settings) {
    this.db.updateSettings(settings);
    return settings;
  }
  async detectJava() {
    const javaPath = await this.javaService.detectJava(this.db.getSettings());
    return { javaPath };
  }
  async chooseDirectory(kind) {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: kind === "game" ? "Выберите папку игры" : kind === "mods" ? "Выберите папку модов" : "Выберите папку скриншотов"
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  }
}
class NewsService {
  constructor(db, progression) {
    this.db = db;
    this.progression = progression;
  }
  syncInFlight = null;
  async syncRemote() {
    const feedUrl = process.env[NEWS_FEED_ENV];
    if (!feedUrl) return;
    if (this.syncInFlight) return this.syncInFlight;
    this.syncInFlight = (async () => {
      const response = await fetch(feedUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`Не удалось получить новости: ${response.status}`);
      }
      const payload = await response.json();
      const articles = payload.articles.map((article) => ({
        id: article.id,
        title: article.title,
        category: article.category,
        excerpt: article.excerpt,
        content: article.content,
        coverImage: article.coverImage ?? null,
        publishedAt: article.publishedAt
      }));
      this.db.replaceNews(articles);
    })().finally(() => {
      this.syncInFlight = null;
    });
    return this.syncInFlight;
  }
  async list(profileId) {
    await this.syncRemote().catch(() => void 0);
    return this.db.listNews(profileId);
  }
  async open(profileId, articleId) {
    await this.syncRemote().catch(() => void 0);
    const didRead = this.db.markNewsRead(profileId, articleId);
    if (didRead) {
      this.progression.record(
        profileId,
        "read_news",
        1,
        articleId,
        "news",
        "Новость прочитана",
        "Прогресс и XP обновлены за чтение новости"
      );
    }
    return this.db.listNews(profileId);
  }
}
class ServerService {
  constructor(db) {
    this.db = db;
  }
  list() {
    return this.db.listServers();
  }
  save(input) {
    const server = {
      id: input.id ?? randomUUID(),
      name: input.name,
      host: input.host,
      port: input.port,
      versionHint: input.versionHint ?? null,
      lastStatus: input.lastStatus ?? "unknown",
      motd: input.motd ?? null,
      latencyMs: input.latencyMs ?? null,
      onlinePlayers: input.onlinePlayers ?? null,
      maxPlayers: input.maxPlayers ?? null,
      checkedAt: input.checkedAt ?? null
    };
    this.db.upsertServer(server);
    return this.list();
  }
  remove(serverId) {
    this.db.removeServer(serverId);
    return this.list();
  }
  async ping(serverId) {
    const current = this.db.listServers().find((server) => server.id === serverId);
    if (!current) throw new Error("Сервер не найден");
    try {
      const response = await status(current.host, current.port, { timeout: 4e3, enableSRV: true });
      const updated = {
        ...current,
        versionHint: response.version.name,
        lastStatus: "online",
        motd: response.motd.clean,
        latencyMs: response.roundTripLatency,
        onlinePlayers: response.players.online,
        maxPlayers: response.players.max,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.db.upsertServer(updated);
      return updated;
    } catch (error) {
      const updated = {
        ...current,
        lastStatus: "offline",
        motd: error instanceof Error ? error.message : "Не удалось получить статус сервера",
        latencyMs: null,
        onlinePlayers: null,
        maxPlayers: null,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.db.upsertServer(updated);
      return updated;
    }
  }
}
const MS_CLIENT_ID = process.env.MIDMINE_MS_CLIENT_ID ?? "00000000402b5328";
const MS_SCOPES = ["XboxLive.signin", "offline_access"];
class AuthService {
  constructor(db, baseDir) {
    this.db = db;
    this.baseDir = baseDir;
  }
  pca = new PublicClientApplication({
    auth: {
      clientId: MS_CLIENT_ID,
      authority: "https://login.microsoftonline.com/consumers"
    }
  });
  pending = /* @__PURE__ */ new Map();
  listProfiles() {
    return this.db.listProfiles();
  }
  registerLocalAccount(input) {
    const salt = randomBytes(16).toString("hex");
    const passwordHash = this.hashPassword(input.password, salt);
    return this.db.createLocalProfile({
      email: input.email,
      username: input.username,
      passwordHash,
      passwordSalt: salt
    });
  }
  loginLocalAccount(email, password) {
    const account = this.db.getLocalProfileByEmail(email);
    if (!account?.password_hash || !account.password_salt) {
      throw new Error("Аккаунт не найден");
    }
    const passwordHash = this.hashPassword(password, account.password_salt);
    if (passwordHash !== account.password_hash) {
      throw new Error("Неверный пароль");
    }
    return this.db.activateProfile(account.id);
  }
  setActiveProfile(profileId) {
    return this.db.setActiveProfile(profileId);
  }
  updateProfile(profile) {
    this.db.updateProfile(profile);
    return this.db.listProfiles();
  }
  async pickAvatar(profileId) {
    const profile = this.db.listProfiles().find((entry) => entry.id === profileId);
    if (!profile) throw new Error("Профиль не найден");
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
    });
    if (result.canceled || result.filePaths.length === 0) return this.db.listProfiles();
    const source = result.filePaths[0];
    const avatarDir = join(this.baseDir, "avatars");
    await mkdir(avatarDir, { recursive: true });
    const filename = `${profileId}-${Date.now()}${extname(source) || ".png"}`;
    const target = join(avatarDir, filename);
    await copyFile(source, target);
    this.db.updateProfile({ id: profileId, avatarPath: target });
    return this.db.listProfiles();
  }
  logout(profileId) {
    this.db.clearAuthSession(profileId);
    this.db.clearActiveProfile();
    return this.db.listProfiles();
  }
  async beginMicrosoftLogin() {
    let deviceResponse = null;
    const promise = this.pca.acquireTokenByDeviceCode({
      scopes: MS_SCOPES,
      deviceCodeCallback: (response2) => {
        deviceResponse = {
          flowId: "",
          userCode: response2.userCode,
          verificationUri: response2.verificationUri,
          expiresIn: response2.expiresIn,
          message: response2.message
        };
      }
    });
    const flowId = randomUUID();
    this.pending.set(flowId, { promise });
    while (!deviceResponse) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const response = deviceResponse;
    return { ...response, flowId };
  }
  async completeMicrosoftLogin(flowId) {
    const flow = this.pending.get(flowId);
    if (!flow) throw new Error("Поток авторизации не найден");
    this.pending.delete(flowId);
    const result = await flow.promise;
    if (!result?.accessToken || !result.account) {
      throw new Error("Microsoft OAuth не вернул access token");
    }
    const tokenCache = this.pca.getTokenCache().serialize();
    const minecraft = await this.exchangeForMinecraftAccess(result.accessToken);
    const session = {
      profileId: "",
      accessToken: minecraft.minecraftToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1e3).toISOString(),
      xuid: minecraft.xuid ?? void 0,
      uuid: minecraft.uuid,
      msaCache: tokenCache,
      homeAccountId: result.account.homeAccountId,
      email: result.account.username ?? null,
      username: minecraft.username
    };
    const encryptedBlob = this.encrypt(JSON.stringify(session));
    return this.db.upsertMicrosoftProfile({
      username: minecraft.username,
      email: result.account.username ?? null,
      uuid: minecraft.uuid,
      xuid: minecraft.xuid ?? null,
      encryptedBlob,
      expiresAt: session.expiresAt
    });
  }
  async getLaunchAuth(profile) {
    if (profile.type !== "microsoft") return null;
    const row = this.db.db.prepare(`
      SELECT encrypted_blob
      FROM auth_tokens
      WHERE profile_id = ?
    `).get(profile.id);
    if (!row) return null;
    const session = JSON.parse(this.decrypt(row.encrypted_blob));
    if (new Date(session.expiresAt).getTime() > Date.now() + 5 * 60 * 1e3) {
      return { ...session, profileId: profile.id };
    }
    if (!session.msaCache || !session.homeAccountId) {
      return { ...session, profileId: profile.id };
    }
    const refreshPca = new PublicClientApplication({
      auth: {
        clientId: MS_CLIENT_ID,
        authority: "https://login.microsoftonline.com/consumers"
      }
    });
    refreshPca.getTokenCache().deserialize(session.msaCache);
    const account = await refreshPca.getTokenCache().getAccountByHomeId(session.homeAccountId);
    if (!account) return { ...session, profileId: profile.id };
    const refreshed = await refreshPca.acquireTokenSilent({
      account,
      scopes: MS_SCOPES
    });
    if (!refreshed?.accessToken) return { ...session, profileId: profile.id };
    const minecraft = await this.exchangeForMinecraftAccess(refreshed.accessToken);
    const renewed = {
      ...session,
      profileId: profile.id,
      accessToken: minecraft.minecraftToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1e3).toISOString(),
      uuid: minecraft.uuid,
      xuid: minecraft.xuid ?? void 0,
      username: minecraft.username,
      msaCache: refreshPca.getTokenCache().serialize()
    };
    const encryptedBlob = this.encrypt(JSON.stringify(renewed));
    this.db.upsertMicrosoftProfile({
      username: renewed.username ?? minecraft.username,
      email: renewed.email ?? null,
      uuid: renewed.uuid ?? minecraft.uuid,
      xuid: renewed.xuid ?? null,
      encryptedBlob,
      expiresAt: renewed.expiresAt
    });
    return renewed;
  }
  hashPassword(password, salt) {
    return scryptSync(password, salt, 64).toString("hex");
  }
  encrypt(raw) {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(raw).toString("base64");
    }
    return Buffer.from(raw, "utf8").toString("base64");
  }
  decrypt(raw) {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw, "base64"));
    }
    return Buffer.from(raw, "base64").toString("utf8");
  }
  async exchangeForMinecraftAccess(msAccessToken) {
    const xblResponse = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${msAccessToken}`
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT"
      })
    });
    if (!xblResponse.ok) {
      throw new Error(`Xbox Live auth failed: ${xblResponse.status}`);
    }
    const xbl = await xblResponse.json();
    const xstsResponse = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [xbl.Token]
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT"
      })
    });
    if (!xstsResponse.ok) {
      throw new Error(`XSTS auth failed: ${xstsResponse.status}`);
    }
    const xsts = await xstsResponse.json();
    const uhs = xsts.DisplayClaims.xui?.[0]?.uhs ?? xbl.DisplayClaims.xui?.[0]?.uhs;
    if (!uhs) throw new Error("Xbox user hash not returned");
    const minecraftAuthResponse = await fetch("https://api.minecraftservices.com/authentication/login_with_xbox", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${uhs};${xsts.Token}`
      })
    });
    if (!minecraftAuthResponse.ok) {
      throw new Error(`Minecraft auth failed: ${minecraftAuthResponse.status}`);
    }
    const minecraftAuth = await minecraftAuthResponse.json();
    const profileResponse = await fetch("https://api.minecraftservices.com/minecraft/profile", {
      headers: {
        Authorization: `Bearer ${minecraftAuth.access_token}`
      }
    });
    if (!profileResponse.ok) {
      throw new Error(`Minecraft profile fetch failed: ${profileResponse.status}`);
    }
    const profile = await profileResponse.json();
    return {
      minecraftToken: minecraftAuth.access_token,
      username: profile.name,
      uuid: profile.id,
      xuid: xsts.DisplayClaims.xui?.[0]?.xid ?? null
    };
  }
}
function sanitizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/gi, "-");
}
class InstanceService {
  constructor(db, javaService, authService, progression) {
    this.db = db;
    this.javaService = javaService;
    this.authService = authService;
    this.progression = progression;
  }
  versionCatalogCache = [];
  catalogFetchedAt = 0;
  list() {
    return this.db.listInstances();
  }
  async getVersionCatalog(force = false) {
    const stale = Date.now() - this.catalogFetchedAt > 15 * 60 * 1e3;
    if (!force && this.versionCatalogCache.length > 0 && !stale) {
      return this.versionCatalogCache;
    }
    const manifest = await getVersionList();
    this.versionCatalogCache = manifest.versions.map((entry) => ({
      id: entry.id,
      type: entry.type,
      releaseTime: entry.releaseTime,
      javaMajor: this.javaService.getRequiredJavaMajor(entry.id)
    }));
    this.catalogFetchedAt = Date.now();
    return this.versionCatalogCache;
  }
  async install(input) {
    const settings = this.db.getSettings();
    const id = randomUUID();
    const installPath = join(settings.gameDirectory, "instances", sanitizeName(input.name));
    await mkdir(installPath, { recursive: true });
    const instance = {
      id,
      name: input.name,
      minecraftVersion: input.minecraftVersion,
      loader: input.loader,
      loaderVersion: input.loaderVersion ?? null,
      group: input.group ?? "Основные сборки",
      icon: null,
      status: "installing",
      installed: false,
      installPath,
      lastPlayedAt: null,
      playtimeMinutes: 0,
      updateAvailable: false,
      selected: this.db.listInstances().length === 0,
      versionId: null
    };
    this.db.upsertInstance(instance);
    this.db.upsertDownload({
      id,
      kind: "instance",
      label: `Установка ${input.name}`,
      progress: 0.05,
      transferredBytes: 0,
      totalBytes: 100,
      status: "running",
      error: null
    });
    this.db.addLog("install", "info", `Начата установка ${input.name}`);
    try {
      const runtime = await this.javaService.ensureJavaForVersion(settings, input.minecraftVersion);
      if (!runtime.javaPath) throw new Error("Не удалось подготовить Java runtime");
      const minecraft = new MinecraftFolder(installPath);
      const versions = await getVersionList();
      const versionMeta = versions.versions.find((entry) => entry.id === input.minecraftVersion);
      if (!versionMeta) {
        throw new Error(`Версия Minecraft ${input.minecraftVersion} не найдена`);
      }
      this.db.upsertDownload({ id, kind: "instance", label: `Установка ${input.name}`, progress: 0.3, transferredBytes: 30, totalBytes: 100, status: "running", error: null });
      await install(versionMeta, minecraft, {
        assetsDownloadConcurrency: settings.downloadConcurrency,
        librariesDownloadConcurrency: settings.downloadConcurrency
      });
      let versionId = input.minecraftVersion;
      let resolvedLoaderVersion = input.loaderVersion ?? null;
      if (input.loader === "fabric") {
        const loaders = await getFabricLoaders();
        resolvedLoaderVersion = input.loaderVersion ?? loaders.find((entry) => entry.stable)?.version ?? loaders[0]?.version ?? null;
        if (!resolvedLoaderVersion) throw new Error("Не удалось определить версию Fabric loader");
        this.db.upsertDownload({ id, kind: "instance", label: `Установка ${input.name}`, progress: 0.65, transferredBytes: 65, totalBytes: 100, status: "running", error: null });
        versionId = await installFabric({
          minecraftVersion: input.minecraftVersion,
          version: resolvedLoaderVersion,
          minecraft,
          side: "client"
        });
      } else if (input.loader === "forge") {
        const forgeList = await getForgeVersionList({ minecraft: input.minecraftVersion });
        const selectedForge = forgeList.versions.find((entry) => entry.version === input.loaderVersion) ?? forgeList.versions.find((entry) => entry.type === "recommended") ?? forgeList.versions[0];
        if (!selectedForge) throw new Error("Не удалось определить Forge installer");
        resolvedLoaderVersion = selectedForge.version;
        this.db.upsertDownload({ id, kind: "instance", label: `Установка ${input.name}`, progress: 0.65, transferredBytes: 65, totalBytes: 100, status: "running", error: null });
        versionId = await installForge({ mcversion: input.minecraftVersion, version: selectedForge.version }, minecraft, { java: runtime.javaPath });
      } else if (input.loader === "neoforge") {
        if (!input.loaderVersion) throw new Error("Для NeoForge укажите конкретную версию загрузчика");
        resolvedLoaderVersion = input.loaderVersion;
        this.db.upsertDownload({ id, kind: "instance", label: `Установка ${input.name}`, progress: 0.65, transferredBytes: 65, totalBytes: 100, status: "running", error: null });
        versionId = await installNeoForged("neoforge", input.loaderVersion, minecraft, { java: runtime.javaPath });
      }
      await this.applyGameOptions(minecraft.root);
      this.db.upsertInstance({
        ...instance,
        status: "installed",
        installed: true,
        selected: true,
        loaderVersion: resolvedLoaderVersion,
        versionId
      });
      this.db.setSelectedInstance(id);
      this.db.completeInstanceInstall(id, versionId);
      this.db.upsertDownload({ id, kind: "instance", label: `Установка ${input.name}`, progress: 1, transferredBytes: 100, totalBytes: 100, status: "completed", error: null });
      const profile = this.db.getActiveProfile();
      if (profile) {
        this.progression.record(profile.id, "install_instance", 1, id, "instance", "Сборка установлена", `${input.name} готова к запуску`);
      }
      this.db.addLog("install", "success", `Установка ${input.name} завершена`);
      return this.db.getInstance(id);
    } catch (error) {
      this.db.updateInstanceStatus(id, "error");
      this.db.upsertDownload({
        id,
        kind: "instance",
        label: `Установка ${input.name}`,
        progress: 1,
        transferredBytes: 100,
        totalBytes: 100,
        status: "failed",
        error: error instanceof Error ? error.message : "Неизвестная ошибка установки"
      });
      this.db.addLog("install", "error", error instanceof Error ? error.message : "Неизвестная ошибка установки");
      throw error;
    }
  }
  async update(instanceId) {
    const instance = this.requireInstance(instanceId);
    return this.verify(instanceId, true, instance);
  }
  async verify(instanceId, updating = false, existing) {
    const instance = existing ?? this.requireInstance(instanceId);
    const versionId = this.getVersionId(instance);
    this.db.updateInstanceStatus(instance.id, updating ? "updating" : "verifying");
    this.db.addLog("install", "info", `${updating ? "Обновление" : "Проверка"} ${instance.name}`);
    try {
      const resolved = await Version.parse(instance.installPath, versionId);
      await installDependencies(resolved, {
        assetsDownloadConcurrency: this.db.getSettings().downloadConcurrency,
        librariesDownloadConcurrency: this.db.getSettings().downloadConcurrency
      });
      await this.applyGameOptions(instance.installPath);
      this.db.updateInstanceStatus(instance.id, "installed");
      const profile = this.db.getActiveProfile();
      if (profile) {
        this.progression.record(profile.id, "verify_files", 1, instance.id, "verify", "Проверка завершена", `${instance.name} успешно проверена`);
      }
      this.db.addLog("install", "success", `${instance.name} успешно проверена`);
      return this.db.getInstance(instance.id);
    } catch (error) {
      this.db.updateInstanceStatus(instance.id, "error");
      this.db.addLog("install", "error", error instanceof Error ? error.message : "Проверка завершилась ошибкой");
      throw error;
    }
  }
  async remove(instanceId) {
    const instance = this.requireInstance(instanceId);
    if (existsSync(instance.installPath)) {
      await rm(instance.installPath, { recursive: true, force: true });
    }
    this.db.removeInstance(instanceId);
    this.db.addLog("install", "warn", `Сборка ${instance.name} удалена`);
    const fallback = this.db.listInstances()[0];
    if (fallback) {
      this.db.setSelectedInstance(fallback.id);
    }
    return this.db.listInstances();
  }
  async launch(instanceId, serverAddress) {
    const instance = this.requireInstance(instanceId);
    const settings = this.db.getSettings();
    const runtime = await this.javaService.ensureJavaForVersion(settings, instance.minecraftVersion);
    if (!runtime.javaPath) throw new Error("Java runtime не подготовлен");
    const profile = this.db.getActiveProfile();
    if (!profile) throw new Error("Активный профиль не найден");
    await this.applyGameOptions(instance.installPath);
    this.db.updateInstanceStatus(instance.id, "launching");
    this.db.addLog("launch", "info", `Запуск ${instance.name}`);
    const sessionId = this.db.createSession(profile.id, instance.id);
    const auth = await this.authService.getLaunchAuth(profile);
    const version = this.getVersionId(instance);
    const resolution = settings.resolution.split("x");
    const width = Number(resolution[0] ?? 1920);
    const height = Number(resolution[1] ?? 1080);
    const child = await launch({
      gamePath: instance.installPath,
      javaPath: runtime.javaPath,
      version,
      maxMemory: settings.ramMb,
      minMemory: Math.min(2048, settings.ramMb),
      launcherBrand: "Mid-Mine",
      launcherName: "Mid-Mine Launcher",
      gameProfile: {
        name: profile.username,
        id: (auth?.uuid ?? profile.id).replace(/-/g, "")
      },
      accessToken: auth?.accessToken ?? "offline",
      userType: auth ? "mojang" : "legacy",
      quickPlayMultiplayer: serverAddress,
      resolution: {
        width,
        height,
        fullscreen: settings.fullscreen
      },
      extraJVMArgs: [
        "-XX:+UnlockExperimentalVMOptions",
        "-XX:+UseG1GC"
      ],
      extraExecOption: {
        detached: false
      }
    });
    child.stdout?.on("data", (chunk) => {
      this.db.addLog("launch", "info", chunk.toString().trim());
    });
    child.stderr?.on("data", (chunk) => {
      this.db.addLog("launch", "warn", chunk.toString().trim());
    });
    child.on("close", (code) => {
      const result = this.db.finishSession(sessionId, code);
      this.db.updateInstancePlaytime(instance.id, result.durationMinutes);
      this.db.addLog("launch", code === 0 ? "success" : "warn", `${instance.name} завершена с кодом ${code ?? 0}`);
      this.progression.record(profile.id, "launch_game", 1, instance.id, "launch", "Сессия завершена", `${instance.name} закрыта`);
      this.progression.record(profile.id, "play_minutes", result.durationMinutes, instance.id);
      this.db.updateInstanceStatus(instance.id, "installed");
    });
    return { ok: true };
  }
  setSelected(instanceId) {
    this.db.setSelectedInstance(instanceId);
    return this.db.listInstances();
  }
  requireInstance(instanceId) {
    const instance = this.db.getInstance(instanceId);
    if (!instance) throw new Error("Сборка не найдена");
    return instance;
  }
  getVersionId(instance) {
    const row = this.db.db.prepare("SELECT version_id FROM instances WHERE id = ?").get(instance.id);
    return row?.version_id || instance.minecraftVersion;
  }
  async applyGameOptions(gamePath) {
    const settings = this.db.getSettings();
    const folder = new MinecraftFolder(gamePath);
    const nextOptions = /* @__PURE__ */ new Map([
      ["fullscreen", settings.fullscreen ? "true" : "false"],
      ["enableVsync", settings.vsync ? "true" : "false"],
      ["renderDistance", String(Math.max(2, Math.round(settings.renderDistance / 4)))],
      ["soundCategory_music", String(settings.musicVolume / 100)],
      ["soundCategory_master", String(settings.soundVolume / 100)],
      ["soundCategory_ambient", settings.ambientSound ? "1" : "0"]
    ]);
    let content = "";
    if (existsSync(folder.options)) {
      content = await readFile(folder.options, "utf8");
    }
    const entries = /* @__PURE__ */ new Map();
    for (const line of content.split(/\r?\n/)) {
      if (!line.includes(":")) continue;
      const [key, ...rest] = line.split(":");
      if (!key) continue;
      entries.set(key, rest.join(":"));
    }
    for (const [key, value] of nextOptions.entries()) {
      entries.set(key, value);
    }
    const serialized = Array.from(entries.entries()).map(([key, value]) => `${key}:${value}`).join("\n");
    await writeFile(folder.options, serialized, "utf8");
  }
}
const MODRINTH_API = "https://api.modrinth.com/v2";
function loaderFacet(loader) {
  return loader === "vanilla" ? null : loader;
}
class ModService {
  constructor(db) {
    this.db = db;
  }
  listInstalled(instanceId) {
    return this.db.listMods(instanceId).map((row) => ({
      id: row.id,
      projectId: row.project_id ?? "",
      versionId: row.version_id ?? "",
      title: row.title,
      description: row.description,
      author: row.author,
      downloads: Number(row.downloads),
      versionNumber: row.version_number,
      iconUrl: row.icon_url,
      installed: true,
      enabled: Number(row.enabled) === 1,
      localFileName: row.local_file_name
    }));
  }
  async search(query, loader, version) {
    const facets = [["project_type:mod"]];
    const mappedLoader = loaderFacet(loader);
    if (mappedLoader) facets.push([`categories:${mappedLoader}`]);
    if (version) facets.push([`versions:${version}`]);
    const effectiveQuery = query.trim() || "mod";
    const searchResponse = await fetch(`${MODRINTH_API}/search?query=${encodeURIComponent(effectiveQuery)}&limit=30&index=relevance&facets=${encodeURIComponent(JSON.stringify(facets))}`);
    if (!searchResponse.ok) throw new Error("Не удалось загрузить каталог Modrinth");
    const search = await searchResponse.json();
    const installedProjectIds = new Set(this.db.listMods(this.getSelectedInstanceId()).map((row) => row.project_id).filter(Boolean));
    return Promise.all(search.hits.map(async (hit) => {
      const versionsResponse = await fetch(`${MODRINTH_API}/project/${hit.project_id}/version?loaders=${encodeURIComponent(JSON.stringify(mappedLoader ? [mappedLoader] : ["fabric", "forge", "neoforge"]))}&game_versions=${encodeURIComponent(JSON.stringify([version]))}`);
      const versions = versionsResponse.ok ? await versionsResponse.json() : [];
      const latest = versions[0];
      return {
        id: latest?.id ?? hit.project_id,
        projectId: hit.project_id,
        versionId: latest?.id ?? "",
        title: hit.title,
        description: hit.description,
        author: hit.author,
        downloads: hit.downloads,
        versionNumber: latest?.version_number ?? version,
        iconUrl: hit.icon_url,
        installed: installedProjectIds.has(hit.project_id),
        enabled: installedProjectIds.has(hit.project_id),
        localFileName: null
      };
    }));
  }
  async install(instanceId, versionId) {
    const versionResponse = await fetch(`${MODRINTH_API}/version/${versionId}`);
    if (!versionResponse.ok) throw new Error("Не удалось загрузить информацию о версии мода");
    const version = await versionResponse.json();
    const primaryFile = version.files.find((file) => file.primary) ?? version.files[0];
    if (!primaryFile) throw new Error("У версии мода нет доступных файлов");
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    await mkdir(folder.mods, { recursive: true });
    const targetFile = join(folder.mods, primaryFile.filename);
    const modResponse = await fetch(primaryFile.url);
    if (!modResponse.ok) throw new Error("Не удалось скачать мод");
    const buffer = Buffer.from(await modResponse.arrayBuffer());
    await writeFile(targetFile, buffer);
    this.db.upsertMod({
      id: version.id,
      instanceId,
      projectId: version.project_id,
      versionId: version.id,
      title: version.name,
      description: version.changelog ?? "Установлено через Modrinth",
      author: version.author_id,
      downloads: Number(version.downloads ?? 0),
      versionNumber: version.version_number,
      iconUrl: null,
      localFileName: primaryFile.filename,
      enabled: true,
      source: "modrinth"
    });
    return this.listInstalled(instanceId);
  }
  async importFile(instanceId) {
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    await mkdir(folder.mods, { recursive: true });
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Minecraft Mods", extensions: ["jar"] }]
    });
    if (result.canceled || result.filePaths.length === 0) return this.listInstalled(instanceId);
    const sourceFile = result.filePaths[0];
    const targetFile = join(folder.mods, basename(sourceFile));
    await copyFile(sourceFile, targetFile);
    this.db.upsertMod({
      id: randomUUID(),
      instanceId,
      projectId: null,
      versionId: null,
      title: basename(sourceFile, ".jar"),
      description: "Импортирован вручную",
      author: "Local File",
      downloads: 0,
      versionNumber: "custom",
      iconUrl: null,
      localFileName: basename(sourceFile),
      enabled: true,
      source: "local"
    });
    return this.listInstalled(instanceId);
  }
  async toggle(instanceId, modId, enabled) {
    const row = this.db.listMods(instanceId).find((item) => item.id === modId);
    if (!row) throw new Error("Мод не найден");
    if (typeof row.local_file_name !== "string" || !row.local_file_name) throw new Error("У мода нет локального файла");
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    const enabledPath = join(folder.mods, row.local_file_name.replace(/\.disabled$/, ""));
    const disabledPath = `${enabledPath}.disabled`;
    if (enabled && existsSync(disabledPath)) {
      await rename(disabledPath, enabledPath);
    } else if (!enabled && existsSync(enabledPath)) {
      await rename(enabledPath, disabledPath);
    }
    this.db.setModEnabled(modId, enabled);
    return this.listInstalled(instanceId);
  }
  async remove(instanceId, modId) {
    const row = this.db.listMods(instanceId).find((item) => item.id === modId);
    if (!row) throw new Error("Мод не найден");
    const instance = this.requireInstance(instanceId);
    const folder = new MinecraftFolder(instance.installPath);
    if (typeof row.local_file_name === "string" && row.local_file_name) {
      const filePath = join(folder.mods, row.local_file_name);
      const disabledPath = `${filePath}.disabled`;
      if (existsSync(filePath)) await rm(filePath, { force: true });
      if (existsSync(disabledPath)) await rm(disabledPath, { force: true });
    }
    this.db.removeMod(modId);
    return this.listInstalled(instanceId);
  }
  requireInstance(instanceId) {
    const instance = this.db.getInstance(instanceId);
    if (!instance) throw new Error("Сборка не найдена");
    return instance;
  }
  getSelectedInstanceId() {
    return this.db.listInstances().find((instance) => instance.selected)?.id ?? "";
  }
}
function broadcast(channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}
async function initializeAppContext(app2) {
  const baseDir = join(app2.getPath("userData"), "data");
  mkdirSync(baseDir, { recursive: true });
  const db = new LauncherDatabase(join(baseDir, DATABASE_NAME));
  const java = new JavaService(join(baseDir, "runtimes"));
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
  await news.syncRemote().catch(() => void 0);
  const versionCatalog = await instances.getVersionCatalog().catch(() => []);
  const context = {
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
      broadcast("app:changed", db.getSnapshot(db.getActiveProfile()?.id ?? null, update.getState(), versionCatalog));
      broadcast("logs:changed", db.listLogs());
      broadcast("downloads:changed", db.listDownloads());
    }
  };
  return context;
}
const installInstanceSchema = z.object({
  name: z.string().min(1),
  minecraftVersion: z.string().min(1),
  loader: z.enum(["vanilla", "fabric", "forge", "neoforge"]),
  loaderVersion: z.string().nullable().optional(),
  group: z.string().optional()
});
const settingsSchema = z.object({
  javaPath: z.string().nullable(),
  javaChannel: z.string(),
  ramMb: z.number().int().min(1024).max(32768),
  gameDirectory: z.string(),
  autoUpdate: z.boolean(),
  closeLauncherOnGameStart: z.boolean(),
  keepLauncherOpen: z.boolean(),
  notificationsEnabled: z.boolean(),
  quickLaunch: z.boolean(),
  diagnosticsHud: z.boolean(),
  downloadConcurrency: z.number().int().min(1).max(8),
  resolution: z.string(),
  fullscreen: z.boolean(),
  vsync: z.boolean(),
  renderDistance: z.number().int().min(2).max(100),
  musicVolume: z.number().int().min(0).max(100),
  soundVolume: z.number().int().min(0).max(100),
  ambientSound: z.boolean()
});
z.object({
  id: z.string(),
  username: z.string(),
  type: z.enum(["offline", "local", "microsoft"]),
  isPremium: z.boolean(),
  avatarPath: z.string().nullable(),
  skinPath: z.string().nullable(),
  email: z.string().nullable(),
  location: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  isActive: z.boolean()
});
z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  excerpt: z.string(),
  content: z.string(),
  coverImage: z.string().nullable(),
  publishedAt: z.string(),
  readAt: z.string().nullable()
});
z.object({
  id: z.string(),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  versionHint: z.string().nullable(),
  lastStatus: z.enum(["unknown", "online", "offline", "error"]),
  motd: z.string().nullable(),
  latencyMs: z.number().nullable(),
  onlinePlayers: z.number().nullable(),
  maxPlayers: z.number().nullable(),
  checkedAt: z.string().nullable()
});
z.object({
  usernameHint: z.string().optional()
});
const localAccountSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24),
  password: z.string().min(6).max(128)
});
function handle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}
function registerIpc(context) {
  handle("app:getSnapshot", () => context.getSnapshot());
  handle("auth:listProfiles", () => context.auth.listProfiles());
  handle("auth:registerLocal", async (_event, payload) => {
    const profile = context.auth.registerLocalAccount(localAccountSchema.parse(payload));
    context.progression.onLauncherOpen(profile.id);
    context.publishSnapshot();
    return profile;
  });
  handle("auth:loginLocal", async (_event, email, password) => {
    const profile = context.auth.loginLocalAccount(email, password);
    if (!profile) throw new Error("Не удалось активировать профиль");
    context.progression.onLauncherOpen(profile.id);
    context.publishSnapshot();
    return profile;
  });
  handle("auth:setActiveProfile", async (_event, profileId) => {
    const profile = context.auth.setActiveProfile(profileId);
    context.publishSnapshot();
    return profile;
  });
  handle("auth:beginMicrosoftLogin", () => context.auth.beginMicrosoftLogin());
  handle("auth:completeMicrosoftLogin", async (_event, flowId) => {
    const profile = await context.auth.completeMicrosoftLogin(flowId);
    context.progression.onLauncherOpen(profile.id);
    context.publishSnapshot();
    return profile;
  });
  handle("auth:logout", async (_event, profileId) => {
    const profiles = context.auth.logout(profileId);
    context.publishSnapshot();
    return profiles;
  });
  handle("auth:updateProfile", async (_event, profile) => {
    const profiles = context.auth.updateProfile(profile);
    const active = context.db.getActiveProfile();
    if (active) {
      context.progression.record(active.id, "customize_profile", 1, active.id, "profile", "Профиль обновлён", "Локальный профиль был изменён");
    }
    context.publishSnapshot();
    return profiles;
  });
  handle("auth:pickAvatar", async (_event, profileId) => {
    const profiles = await context.auth.pickAvatar(profileId);
    const active = context.db.getActiveProfile();
    if (active) {
      context.progression.record(active.id, "customize_profile", 1, active.id, "profile", "Аватар обновлён", "Изображение профиля изменено");
    }
    context.publishSnapshot();
    return profiles;
  });
  handle("settings:get", () => context.settings.get());
  handle("settings:update", async (_event, settings) => {
    const parsed = settingsSchema.parse(settings);
    const next = context.settings.update(parsed);
    const active = context.db.getActiveProfile();
    if (active) {
      context.progression.record(active.id, "visit_settings", 1, active.id);
    }
    context.publishSnapshot();
    return next;
  });
  handle("settings:detectJava", () => context.settings.detectJava());
  handle("settings:chooseDirectory", (_event, kind) => context.settings.chooseDirectory(kind));
  handle("instances:list", () => context.instances.list());
  handle("instances:getVersionCatalog", (_event, force) => context.instances.getVersionCatalog(Boolean(force)));
  handle("instances:install", async (_event, payload) => {
    const installed = await context.instances.install(installInstanceSchema.parse(payload));
    context.publishSnapshot();
    return installed;
  });
  handle("instances:update", async (_event, instanceId) => {
    const updated = await context.instances.update(instanceId);
    context.publishSnapshot();
    return updated;
  });
  handle("instances:verify", async (_event, instanceId) => {
    const verified = await context.instances.verify(instanceId);
    context.publishSnapshot();
    return verified;
  });
  handle("instances:remove", async (_event, instanceId) => {
    const instances = await context.instances.remove(instanceId);
    context.publishSnapshot();
    return instances;
  });
  handle("instances:launch", async (_event, instanceId, serverAddress) => {
    const result = await context.instances.launch(instanceId, serverAddress);
    context.publishSnapshot();
    return result;
  });
  handle("instances:setSelected", async (_event, instanceId) => {
    const instances = context.instances.setSelected(instanceId);
    context.publishSnapshot();
    return instances;
  });
  handle("mods:listInstalled", (_event, instanceId) => context.mods.listInstalled(instanceId));
  handle("mods:search", (_event, query, loader, version) => context.mods.search(query, loader, version));
  handle("mods:install", async (_event, instanceId, versionId) => {
    const mods = await context.mods.install(instanceId, versionId);
    context.publishSnapshot();
    return mods;
  });
  handle("mods:importFile", async (_event, instanceId) => {
    const mods = await context.mods.importFile(instanceId);
    context.publishSnapshot();
    return mods;
  });
  handle("mods:toggle", async (_event, instanceId, modId, enabled) => {
    const mods = await context.mods.toggle(instanceId, modId, enabled);
    context.publishSnapshot();
    return mods;
  });
  handle("mods:remove", async (_event, instanceId, modId) => {
    const mods = await context.mods.remove(instanceId, modId);
    context.publishSnapshot();
    return mods;
  });
  handle("news:list", () => {
    const active = context.db.getActiveProfile();
    return active ? context.news.list(active.id) : [];
  });
  handle("news:open", async (_event, articleId) => {
    const active = context.db.getActiveProfile();
    if (!active) return [];
    const news = context.news.open(active.id, articleId);
    context.publishSnapshot();
    return news;
  });
  handle("progression:getSummary", () => {
    const active = context.db.getActiveProfile();
    return active ? context.db.getProgression(active.id) : null;
  });
  handle("progression:claimTask", async (_event, taskId) => {
    const active = context.db.getActiveProfile();
    if (!active) throw new Error("Нет активного профиля");
    const summary = context.progression.claimTask(active.id, taskId);
    context.publishSnapshot();
    return summary;
  });
  handle("progression:getActivity", () => {
    const active = context.db.getActiveProfile();
    return active ? context.db.listActivity(active.id) : [];
  });
  handle("servers:list", () => context.servers.list());
  handle("servers:save", async (_event, server) => {
    const result = context.servers.save(server);
    context.publishSnapshot();
    return result;
  });
  handle("servers:remove", async (_event, serverId) => {
    const result = context.servers.remove(serverId);
    context.publishSnapshot();
    return result;
  });
  handle("servers:ping", async (_event, serverId) => {
    const result = await context.servers.ping(serverId);
    context.publishSnapshot();
    return result;
  });
  handle("logs:list", () => context.db.listLogs());
  handle("updates:getState", () => context.update.getState());
  handle("updates:check", async () => {
    const state = await context.update.check();
    context.publishSnapshot();
    return state;
  });
  handle("updates:apply", () => context.update.apply());
}
let mainWindow = null;
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
async function createWindow() {
  const context = await initializeAppContext(app);
  registerIpc(context);
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1280,
    minHeight: 820,
    show: false,
    backgroundColor: "#05060f",
    autoHideMenuBar: true,
    title: "Mid-Mine Launcher",
    webPreferences: {
      preload: join(__dirname$1, "../preload/index.mjs"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname$1, "../renderer/index.html"));
  }
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
//# sourceMappingURL=index.js.map
