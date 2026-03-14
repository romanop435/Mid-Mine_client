import { dialog } from 'electron';
import { LauncherDatabase } from './database';
import { JavaService } from './java-service';
import type { LauncherSettings } from '@shared/types';

export class SettingsService {
  constructor(
    private readonly db: LauncherDatabase,
    private readonly javaService: JavaService,
  ) {}

  get() {
    return this.db.getSettings();
  }

  update(settings: LauncherSettings) {
    this.db.updateSettings(settings);
    return settings;
  }

  async detectJava() {
    const javaPath = await this.javaService.detectJava(this.db.getSettings());
    return { javaPath };
  }

  async chooseDirectory(kind: 'game' | 'mods' | 'screenshots') {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title:
        kind === 'game'
          ? 'Выберите папку игры'
          : kind === 'mods'
            ? 'Выберите папку модов'
            : 'Выберите папку скриншотов',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  }
}
