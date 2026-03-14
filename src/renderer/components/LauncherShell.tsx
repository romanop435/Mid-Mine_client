import type { PropsWithChildren } from 'react';
import type { Profile } from '@shared/types';
import { AnimatedBackground } from './AnimatedBackground';
import { Sidebar } from './Sidebar';

export function LauncherShell({ profile, children }: PropsWithChildren<{ profile: Profile | null }>) {
  return (
    <div className="min-h-screen text-white flex relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-1 min-h-screen">
        <Sidebar profile={profile} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
