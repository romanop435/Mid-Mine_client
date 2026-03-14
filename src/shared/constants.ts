import { homedir } from 'node:os';
import { join } from 'node:path';

export const APP_NAME = 'Mid-Mine Launcher';
export const APP_ID = 'mid-mine-launcher';
export const DATABASE_NAME = 'midmine.db';
export const DEFAULT_GAME_DIRECTORY = join(homedir(), 'AppData', 'Roaming', '.midmine');
export const DEFAULT_RAM_MB = 4096;
export const DEFAULT_RESOLUTION = '1920x1080';
export const DEFAULT_JAVA_CHANNEL = 'Java 21';
export const LEVEL_XP_BASE = 450;
export const UPDATE_FEED_ENV = 'MIDMINE_UPDATE_FEED';
export const NEWS_FEED_ENV = 'MIDMINE_NEWS_FEED_URL';
export const MIDMINE_DEFAULT_SERVER = {
  id: 'midmine-default-server',
  name: 'Mid-Mine | Clans SMP',
  host: '45.11.16.75',
  port: 26002,
  versionHint: 'Vanilla 1.20.1',
} as const;
