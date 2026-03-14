/// <reference types="vite/client" />

import type { LauncherApi } from '../preload/index';

declare global {
  interface Window {
    launcherApi: LauncherApi;
  }
}

export {};
