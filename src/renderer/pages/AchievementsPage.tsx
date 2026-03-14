import { GlassCard, ProgressBar, SectionHeader, StatusBadge } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';

export function AchievementsPage() {
  const { snapshot } = useLauncherStore();
  if (!snapshot) return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <SectionHeader title="Достижения лаунчера" subtitle="Только launcher-side прогресс, без игровых статистик Minecraft" />
      <div className="grid grid-cols-2 gap-4 mt-6">
        {snapshot.progression.achievements.map((achievement) => (
          <GlassCard key={achievement.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${achievement.color}1A`, border: `1px solid ${achievement.color}40` }}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-white">{achievement.title}</p>
                  <StatusBadge tone={achievement.unlockedAt ? 'success' : 'neutral'}>
                    {achievement.unlockedAt ? 'Unlocked' : 'Locked'}
                  </StatusBadge>
                </div>
                <p className="text-sm text-zinc-500 mt-1">{achievement.description}</p>
                <div className="mt-4">
                  <ProgressBar value={(achievement.progress / achievement.target) * 100} />
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {achievement.progress} / {achievement.target}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
