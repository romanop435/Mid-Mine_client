import electronUpdater from 'electron-updater';
import { UPDATE_FEED_ENV } from '@shared/constants';
import type { UpdateState } from '@shared/types';

const { autoUpdater } = electronUpdater;

export class UpdateService {
  private state: UpdateState = {
    available: false,
    version: null,
    notes: null,
    downloaded: false,
    supported: Boolean(process.env[UPDATE_FEED_ENV]),
    message: process.env[UPDATE_FEED_ENV]
      ? 'Проверка обновлений доступна'
      : 'Фид обновлений не настроен. Автообновление отключено.',
  };

  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', (info) => {
      this.state = {
        available: true,
        version: info.version,
        notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
        downloaded: false,
        supported: true,
        message: 'Доступно обновление лаунчера',
      };
    });
    autoUpdater.on('update-not-available', () => {
      this.state = {
        available: false,
        version: null,
        notes: null,
        downloaded: false,
        supported: true,
        message: 'Обновления не найдены',
      };
    });
    autoUpdater.on('update-downloaded', (info) => {
      this.state = {
        available: true,
        version: info.version,
        notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
        downloaded: true,
        supported: true,
        message: 'Обновление загружено и готово к установке',
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
