import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type Tone = 'navy' | 'emerald' | 'amber' | 'danger' | 'neutral';

const toneClasses: Record<Tone, string> = {
  navy: 'bg-[rgba(12,45,87,0.1)] text-[#0c2d57] border border-[rgba(12,45,87,0.16)]',
  emerald: 'bg-[rgba(15,139,102,0.12)] text-[#0f8b66] border border-[rgba(15,139,102,0.18)]',
  amber: 'bg-[rgba(244,163,59,0.16)] text-[#b96d0e] border border-[rgba(244,163,59,0.22)]',
  danger: 'bg-[rgba(220,76,100,0.12)] text-[#dc4c64] border border-[rgba(220,76,100,0.18)]',
  neutral: 'bg-[rgba(15,23,42,0.06)] text-slate-600 border border-[rgba(148,163,184,0.2)]',
};

export const StatusChip = ({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) => (
  <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase', toneClasses[tone], className)}>
    {dot && <span className="h-2 w-2 rounded-full bg-current opacity-80" />}
    {children}
  </span>
);

export const SurfaceCard = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('surface-card p-6', className)}>{children}</div>
);

export const SectionHeader = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(12,45,87,0.08)] text-[#0c2d57]">
            <Icon size={20} />
          </span>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
    </div>
    {action}
  </div>
);

export const MetricCard = ({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'navy',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  accent?: 'navy' | 'emerald' | 'amber' | 'slate';
}) => {
  const accentMap = {
    navy: 'text-[#0c2d57] bg-[rgba(12,45,87,0.08)]',
    emerald: 'text-[#0f8b66] bg-[rgba(15,139,102,0.1)]',
    amber: 'text-[#b96d0e] bg-[rgba(244,163,59,0.14)]',
    slate: 'text-slate-700 bg-[rgba(148,163,184,0.12)]',
  } as const;

  return (
    <motion.div whileHover={{ y: -3 }} className={cn('metric-card metric-card__accent--' + accent, 'p-5')}>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', accentMap[accent])}>
          <Icon size={22} />
        </span>
      </div>
    </motion.div>
  );
};

export const PanelHero = ({
  eyebrow,
  title,
  description,
  badges,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  badges?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('hero-card relative overflow-hidden rounded-[32px] p-6 sm:p-8', className)}>
    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl space-y-4">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">{eyebrow}</p>}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/78 sm:text-[15px]">{description}</p>
        </div>
        {badges && <div className="flex flex-wrap gap-2.5">{badges}</div>}
      </div>
      {aside && <div className="w-full max-w-md">{aside}</div>}
    </div>
  </div>
);

export const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) => (
  <div className="surface-card flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <Icon size={24} />
    </span>
    <div className="space-y-1">
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="max-w-xs text-sm text-slate-500">{description}</p>
    </div>
  </div>
);
