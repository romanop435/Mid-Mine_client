import { randomUUID } from 'node:crypto';
import { status } from 'minecraft-server-util';
import { LauncherDatabase } from './database';
import type { ServerEntry } from '@shared/types';

export class ServerService {
  constructor(private readonly db: LauncherDatabase) {}

  list() {
    return this.db.listServers();
  }

  save(input: Partial<ServerEntry> & Pick<ServerEntry, 'name' | 'host' | 'port'>) {
    const server: ServerEntry = {
      id: input.id ?? randomUUID(),
      name: input.name,
      host: input.host,
      port: input.port,
      versionHint: input.versionHint ?? null,
      lastStatus: input.lastStatus ?? 'unknown',
      motd: input.motd ?? null,
      latencyMs: input.latencyMs ?? null,
      onlinePlayers: input.onlinePlayers ?? null,
      maxPlayers: input.maxPlayers ?? null,
      checkedAt: input.checkedAt ?? null,
    };
    this.db.upsertServer(server);
    return this.list();
  }

  remove(serverId: string) {
    this.db.removeServer(serverId);
    return this.list();
  }

  async ping(serverId: string) {
    const current = this.db.listServers().find((server) => server.id === serverId);
    if (!current) throw new Error('Сервер не найден');

    try {
      const response = await status(current.host, current.port, { timeout: 4000, enableSRV: true });
      const updated: ServerEntry = {
        ...current,
        versionHint: response.version.name,
        lastStatus: 'online',
        motd: response.motd.clean,
        latencyMs: response.roundTripLatency,
        onlinePlayers: response.players.online,
        maxPlayers: response.players.max,
        checkedAt: new Date().toISOString(),
      };
      this.db.upsertServer(updated);
      return updated;
    } catch (error) {
      const updated: ServerEntry = {
        ...current,
        lastStatus: 'offline',
        motd: error instanceof Error ? error.message : 'Не удалось получить статус сервера',
        latencyMs: null,
        onlinePlayers: null,
        maxPlayers: null,
        checkedAt: new Date().toISOString(),
      };
      this.db.upsertServer(updated);
      return updated;
    }
  }
}
