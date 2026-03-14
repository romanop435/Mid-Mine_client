import { LauncherDatabase } from './database';
import type { TaskAction } from '@shared/types';

const XP_REWARDS: Partial<Record<TaskAction, number>> = {
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
  claim_task: 0,
};

export class ProgressionService {
  constructor(private readonly db: LauncherDatabase) {}

  onLauncherOpen(profileId: string) {
    const streak = this.db.touchLauncherOpen(profileId);
    this.record(profileId, 'launcher_open', 1, null, 'system', 'Лаунчер открыт', 'Ежедневный вход зарегистрирован');
    if (streak > 0) {
      this.db.incrementAction(profileId, 'login_streak', 1);
    }
    return this.db.getProgression(profileId);
  }

  record(
    profileId: string,
    action: TaskAction,
    amount = 1,
    referenceId: string | null = null,
    kind?: string,
    title?: string,
    description?: string,
  ) {
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

  claimTask(profileId: string, taskId: string) {
    this.db.claimTask(profileId, taskId);
    this.db.incrementAction(profileId, 'claim_task', 1);
    this.db.addActivity(profileId, 'task', 'Задание завершено', `Получена награда за задание ${taskId}`);
    return this.db.getProgression(profileId);
  }
}
