# Mid-Mine Launcher

Production-style desktop Minecraft launcher built from the Mid-Mine Figma Make export.

## Stack

- Electron + electron-vite
- React + TypeScript strict
- Zustand
- Tailwind CSS v4
- SQLite via `node:sqlite`
- `@xmcl/core` + `@xmcl/installer`
- Modrinth API
- Microsoft device-code auth via `@azure/msal-node`

## What is implemented

- Figma-matched desktop shell with glassmorphism visuals and sidebar IA
- Dashboard with selected build, play action, launcher XP, tasks, activity, news, and download state
- Real instance install/update/verify/remove/launch pipeline
- Support structure for Vanilla, Fabric, Forge, and NeoForge
- Login gate with local account registration by email/password/nickname
- Microsoft device-code auth flow with automatic Premium status
- Automatic Java runtime download per Minecraft version
- Full release and snapshot catalog from the official Minecraft manifest
- Launcher-only XP, tasks, achievements, activity log, and total playtime tracking
- Mod manager with installed mods, Modrinth catalog search, direct install, import, enable/disable, and remove
- Single official server card for `Mid-Mine | Clans SMP` at `45.11.16.75:26002`
- Avatar upload for local and Microsoft profiles
- Settings persistence for launcher behavior and instance defaults
- Update service wrapper via `electron-updater`

## Important rules applied

- No in-game stats are parsed from Minecraft except session duration tracked by the launcher itself
- XP comes only from launcher actions
- Achievements are launcher-only
- `Показывать FPS` is treated as launcher diagnostics HUD preference

## Setup

### Requirements

- Windows
- Node.js 24+
- npm 11+
- Internet access for first Java runtime download and Modrinth/news requests

### Install

```bash
npm install
```

### Run in dev

```bash
npm run dev
```

### Typecheck

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

### Package

```bash
npm run dist
```

## Optional environment variables

- `MIDMINE_MS_CLIENT_ID`
  Use your own Microsoft public client application ID for device-code login. A default fallback is wired for development, but production should use your own app registration.
- `MIDMINE_UPDATE_FEED`
  Enables real updater checks when pointing to a configured release feed.
- `MIDMINE_NEWS_FEED_URL`
  Optional JSON endpoint for remote launcher news. If not set, bundled local news is used.

## Folder tree

```text
src/
  main/
    ipc/
    services/
  preload/
  renderer/
    components/
    lib/
    pages/
    store/
    styles/
  shared/
resources/
```

Legacy `app/` and `styles/` at repo root are the original Figma export fragments kept as reference input. Runtime code uses `src/renderer`.

## Screen mapping

- `Главная`
  Implemented in [`src/renderer/pages/HomePage.tsx`](./src/renderer/pages/HomePage.tsx)
  Featured selected build, play CTA, launcher metrics, tasks, news, activity, and active download state.
- `Моды`
  Implemented in [`src/renderer/pages/ModsPage.tsx`](./src/renderer/pages/ModsPage.tsx)
  Installed vs catalog flows, Modrinth search, file import, enable/disable, remove.
- `Профиль`
  Implemented in [`src/renderer/pages/ProfilePage.tsx`](./src/renderer/pages/ProfilePage.tsx)
  Local/Microsoft account presentation, premium badge, avatar upload, launcher-only metrics, XP bar, recent achievements.
- `Настройки`
  Implemented in [`src/renderer/pages/SettingsPage.tsx`](./src/renderer/pages/SettingsPage.tsx)
  Launcher settings plus instance/game defaults written into instance config.
- `Версии`
  Implemented in [`src/renderer/pages/VersionsPage.tsx`](./src/renderer/pages/VersionsPage.tsx)
  Synthesized from design language. Full release/snapshot manifest, Java auto-download, real install/update/verify/remove/launch pipeline.
- `Серверы`
  Implemented in [`src/renderer/pages/ServersPage.tsx`](./src/renderer/pages/ServersPage.tsx)
  Synthesized from design language. Single official Mid-Mine server, ping, quick launch.
- `Достижения`
  Implemented in [`src/renderer/pages/AchievementsPage.tsx`](./src/renderer/pages/AchievementsPage.tsx)
  Synthesized from design language. Launcher-only achievement catalog and progress.

## Database schema

SQLite tables are created in [`src/main/services/database.ts`](./src/main/services/database.ts):

- `settings`
- `profiles`
- `auth_tokens`
- `instances`
- `instance_files`
- `mods`
- `news_articles`
- `news_reads`
- `tasks`
- `task_progress`
- `achievement_defs`
- `achievement_progress`
- `xp_events`
- `sessions`
- `activity_log`
- `favorite_servers`
- `downloads`
- `notifications`
- `logs`

## Launcher architecture

- [`src/main/services/app-context.ts`](./src/main/services/app-context.ts)
  Wires all backend services and publishes snapshot updates to the renderer.
- [`src/main/services/instance-service.ts`](./src/main/services/instance-service.ts)
  Installs, verifies, updates, and launches Minecraft instances through `@xmcl`, and exposes the full version catalog.
- [`src/main/services/auth-service.ts`](./src/main/services/auth-service.ts)
  Handles local email/password accounts, avatar upload, Microsoft auth flows, and launch auth preparation.
- [`src/main/services/java-service.ts`](./src/main/services/java-service.ts)
  Detects Java, resolves required major version per Minecraft version, and downloads Temurin runtimes automatically on Windows.
- [`src/main/services/news-service.ts`](./src/main/services/news-service.ts)
  Reads bundled news and can sync a remote JSON news feed for production use.
- [`src/main/services/progression-service.ts`](./src/main/services/progression-service.ts)
  Applies launcher-only XP, task progress, and achievements.
- [`src/main/ipc/register.ts`](./src/main/ipc/register.ts)
  Typed IPC surface for renderer/native interactions.
- [`src/renderer/store/useLauncherStore.ts`](./src/renderer/store/useLauncherStore.ts)
  Single Zustand bridge between UI and preload API.

## Assumptions

- The Figma Make export only provided concrete visuals for Home, Mods, Profile, and Settings. Versions, Servers, and Achievements were synthesized from the same glass-card system.
- News is seeded locally and can be overridden by a remote JSON feed.
- NeoForge requires an explicit loader version in the install form.
- The launcher uses per-instance directories under the configured game root instead of a single shared `.minecraft`.
- Microsoft auth is real device-code flow, but production should replace the fallback client ID with a dedicated Azure app registration.
- Existing legacy offline profiles without email are redirected to the new auth screen and should be replaced with a local account or Microsoft login.

## Remote News Feed Format

If you set `MIDMINE_NEWS_FEED_URL`, the launcher expects JSON in this format:

```json
{
  "articles": [
    {
      "id": "news-1",
      "title": "Mid-Mine update",
      "category": "Launcher",
      "excerpt": "Short preview text",
      "content": "Full article text",
      "coverImage": "https://your-cdn/news-1.jpg",
      "publishedAt": "2026-03-14T12:00:00.000Z"
    }
  ]
}
```

## Mini Backend Recommendation

For centralized auth + news + admin panel, the smallest practical stack is:

1. `Next.js` or `NestJS` API for local account registration/login.
2. `PostgreSQL` for users, news, bans, and audit logs.
3. `JWT` access/refresh tokens for launcher login.
4. `AdminJS` or a custom Next.js admin page for publishing news.
5. File storage via local `/uploads` first, then move to S3-compatible storage later.

Minimal backend endpoints to expose:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/news`
- `POST /api/admin/news`
- `PATCH /api/admin/news/:id`
- `DELETE /api/admin/news/:id`

For this launcher version, local auth is already implemented inside the desktop app. The backend is only needed when you want one shared account system across multiple PCs.

## Verification completed

- `npm run typecheck`
- `npm run build`
