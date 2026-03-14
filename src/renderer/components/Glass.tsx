import type { PropsWithChildren, ReactNode } from 'react';
import { motion } from 'motion/react';

export const glassCardStyle = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(40px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
} as const;

export function GlassCard({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl relative overflow-hidden ${className}`} style={glassCardStyle}>
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
      />
      {children}
    </div>
  );
}

export function GlowButton({
  children,
  onClick,
  className = '',
  disabled,
}: PropsWithChildren<{ onClick?: () => void; className?: string; disabled?: boolean }>) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white ${className}`}
      style={{
        background: disabled
          ? 'rgba(34,197,94,0.15)'
          : 'linear-gradient(135deg, rgba(34,197,94,0.85), rgba(16,185,129,0.75))',
        border: '1px solid rgba(34,197,94,0.35)',
        boxShadow: disabled ? 'none' : '0 0 30px rgba(34,197,94,0.25)',
      }}
    >
      {children}
    </motion.button>
  );
}

export function SectionHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {subtitle ? <p className="text-sm text-zinc-500 mt-1">{subtitle}</p> : null}
      </div>
      {trailing}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  subLabel,
  accent = '#4ade80',
}: {
  label: string;
  value: string;
  subLabel?: string;
  accent?: string;
}) {
  return (
    <GlassCard className="p-4">
      <div className="space-y-1">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subLabel ? <p className="text-xs" style={{ color: accent }}>{subLabel}</p> : null}
      </div>
    </GlassCard>
  );
}

export function StatusBadge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warn' }>) {
  const palette =
    tone === 'success'
      ? { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' }
      : tone === 'warn'
        ? { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.25)' }
        : { bg: 'rgba(255,255,255,0.06)', color: '#d4d4d8', border: 'rgba(255,255,255,0.10)' };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px]"
      style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full overflow-hidden bg-white/10">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.5 }}
        style={{ background: 'linear-gradient(90deg, #16a34a, #4ade80)', boxShadow: '0 0 12px rgba(34,197,94,0.45)' }}
      />
    </div>
  );
}
