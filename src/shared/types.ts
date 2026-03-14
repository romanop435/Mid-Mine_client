export type NavRoute =
  | '/home'
  | '/mods'
  | '/versions'
  | '/servers'
  | '/achievements'
  | '/profile'
  | '/settings';

export type AccountType = 'offline' | 'local' | 'microsoft';
export type LoaderType = 'vanilla' | 'fabric' | 'forge' | 'neoforge';
export type InstanceStatus = 'not_installed' | 'installing' | 'installed' | 'updating' | 'verifying' | 'launching' | 'error';
export type DownloadStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';
export type LogLevel = 'info' | 'warn' | 'error' | 'success';
export type TaskType = 'one_time' | 'daily' | 'weekly';
export type VersionCatalogType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
export type TaskAction =
  | 'launcher_open'
  | 'read_news'
  | 'install_instance'
  | 'launch_game'
  | 'play_minutes'
  | 'verify_files'
  | 'visit_settings'
  | 'customize_profile'
  | 'open_achievements'
  | 'login_streak'
  | 'claim_task';

export interface Profile {
  id: string;
  username: string;
  type: AccountType;
  isPremium: boolean;
  avatarPath: string | null;
  skinPath: string | null;
  email: string | null;
  location: string | null;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

export interface AuthSession {
  profileId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  xuid?: string;
  uuid?: string;
  msaCache?: string;
  homeAccountId?: string;
  email?: string | null;
  username?: string;
}

export interface MicrosoftDeviceStart {
  flowId: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  message: string;
}

export interface LocalAccountInput {
  email: string;
  username: string;
  password: string;
}

export interface LauncherSettings {
  javaPath: string | null;
  javaChannel: string;
  ramMb: number;
  gameDirectory: string;
  autoUpdate: boolean;
  closeLauncherOnGameStart: boolean;
  keepLauncherOpen: boolean;
  notificationsEnabled: boolean;
  quickLaunch: boolean;
  diagnosticsHud: boolean;
  downloadConcurrency: number;
  resolution: string;
  fullscreen: boolean;
  vsync: boolean;
  renderDistance: number;
  musicVolume: number;
  soundVolume: number;
  ambientSound: boolean;
}

export interface InstanceSummary {
  id: string;
  name: string;
  minecraftVersion: string;
  loader: LoaderType;
  loaderVersion: string | null;
  group: string;
  icon: string | null;
  status: InstanceStatus;
  installed: boolean;
  installPath: string;
  lastPlayedAt: string | null;
  playtimeMinutes: number;
  updateAvailable: boolean;
  selected: boolean;
}

export interface InstallInstanceInput {
  name: string;
  minecraftVersion: string;
  loader: LoaderType;
  loaderVersion?: string | null;
  group?: string;
}

export interface VersionCatalogEntry {
  id: string;
  type: VersionCatalogType;
  releaseTime: string;
  javaMajor: number;
}

export interface JavaRuntimeStatus {
  javaPath: string | null;
  source: 'configured' | 'bundled' | 'system' | 'downloaded' | 'missing';
  majorVersion: number | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  publishedAt: string;
  readAt: string | null;
}

export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  action: TaskAction;
  target: number;
  xpReward: number;
  claimable: boolean;
}

export interface TaskProgress extends TaskDefinition {
  progress: number;
  completedAt: string | null;
  claimedAt: string | null;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: TaskAction;
  target: number;
}

export interface AchievementProgress extends AchievementDefinition {
  progress: number;
  unlockedAt: string | null;
}

export interface ProgressionSummary {
  currentXp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  totalPlaytimeMinutes: number;
  launches: number;
  loginStreak: number;
  installedBuilds: number;
  verifiedFilesCount: number;
  newsReadCount: number;
  tasks: TaskProgress[];
  achievements: AchievementProgress[];
}

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface ModSearchItem {
  id: string;
  projectId: string;
  versionId: string;
  title: string;
  description: string;
  author: string;
  downloads: number;
  versionNumber: string;
  iconUrl: string | null;
  installed: boolean;
  enabled: boolean;
  localFileName: string | null;
}

export interface ServerEntry {
  id: string;
  name: string;
  host: string;
  port: number;
  versionHint: string | null;
  lastStatus: 'unknown' | 'online' | 'offline' | 'error';
  motd: string | null;
  latencyMs: number | null;
  onlinePlayers: number | null;
  maxPlayers: number | null;
  checkedAt: string | null;
}

export interface DownloadJob {
  id: string;
  kind: 'instance' | 'mod' | 'update';
  label: string;
  progress: number;
  transferredBytes: number;
  totalBytes: number;
  status: DownloadStatus;
  error: string | null;
}

export interface LogEntry {
  id: string;
  scope: 'launcher' | 'install' | 'launch' | 'update';
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface UpdateState {
  available: boolean;
  version: string | null;
  notes: string | null;
  downloaded: boolean;
  supported: boolean;
  message: string;
}

export interface LauncherSnapshot {
  profile: Profile | null;
  settings: LauncherSettings;
  instances: InstanceSummary[];
  versionCatalog: VersionCatalogEntry[];
  news: NewsArticle[];
  progression: ProgressionSummary;
  activity: ActivityItem[];
  downloads: DownloadJob[];
  logs: LogEntry[];
  servers: ServerEntry[];
  update: UpdateState;
}
