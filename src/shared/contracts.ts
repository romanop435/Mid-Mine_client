import { z } from 'zod';
import type {
  InstallInstanceInput,
  LocalAccountInput,
  LauncherSettings,
  NewsArticle,
  Profile,
  ServerEntry,
} from './types';

export const installInstanceSchema: z.ZodType<InstallInstanceInput> = z.object({
  name: z.string().min(1),
  minecraftVersion: z.string().min(1),
  loader: z.enum(['vanilla', 'fabric', 'forge', 'neoforge']),
  loaderVersion: z.string().nullable().optional(),
  group: z.string().optional(),
});

export const settingsSchema: z.ZodType<LauncherSettings> = z.object({
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
  ambientSound: z.boolean(),
});

export const profileSchema: z.ZodType<Profile> = z.object({
  id: z.string(),
  username: z.string(),
  type: z.enum(['offline', 'local', 'microsoft']),
  isPremium: z.boolean(),
  avatarPath: z.string().nullable(),
  skinPath: z.string().nullable(),
  email: z.string().nullable(),
  location: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  isActive: z.boolean(),
});

export const newsArticleSchema: z.ZodType<NewsArticle> = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  excerpt: z.string(),
  content: z.string(),
  coverImage: z.string().nullable(),
  publishedAt: z.string(),
  readAt: z.string().nullable(),
});

export const serverEntrySchema: z.ZodType<ServerEntry> = z.object({
  id: z.string(),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  versionHint: z.string().nullable(),
  lastStatus: z.enum(['unknown', 'online', 'offline', 'error']),
  motd: z.string().nullable(),
  latencyMs: z.number().nullable(),
  onlinePlayers: z.number().nullable(),
  maxPlayers: z.number().nullable(),
  checkedAt: z.string().nullable(),
});

export const microsoftLoginStartSchema = z.object({
  usernameHint: z.string().optional(),
});

export const localAccountSchema: z.ZodType<LocalAccountInput> = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24),
  password: z.string().min(6).max(128),
});
