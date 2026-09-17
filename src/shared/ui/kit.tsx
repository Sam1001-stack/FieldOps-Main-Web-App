/** Shared office UI: headers, 44px buttons, status pills, Plantafel cards. */
import type { ButtonHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import { statusClass, statusLabel, cn } from '../lib/ui'

export function PageHeader({
  kicker,
  title,
  hint,
  action,
}: {
  kicker: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="fo-kicker">{kicker}</p>
        <h1 className="fo-h1">{title}</h1>
        {hint ? <p className="fo-hint">{hint}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Field({
  label,
  children,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { label: string }) {
  return (
    <label className={cn('block text-sm font-medium text-ink', className)} {...props}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-inksoft">{label}</span>
      {children}
    </label>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tracking-wide',
        statusClass[status] || 'bg-slate-100 text-slate-700',
      )}
      aria-label={statusLabel[status] || status}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status] || status}
    </span>
  )
}

export function FoSpinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const ring = (
    <span className={cn('fo-spinner', size === 'sm' && 'fo-spinner-sm', size === 'lg' && 'fo-spinner-lg')}>
      <i />
    </span>
  )
  if (size === 'sm') {
    return (
      <span role="status" aria-label={label ?? 'Laden'} className="inline-flex">
        {ring}
      </span>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite" aria-label={label ?? 'Laden'}>
      {ring}
      <div className="text-center">
        <p className="fo-kicker">FieldOps</p>
        {label ? <p className="mt-1 text-sm text-inksoft">{label}</p> : null}
      </div>
    </div>
  )
}

export function ScreenLoader({ label = 'Laden…', full }: { label?: string; full?: boolean }) {
  return (
    <div className={cn('grid place-items-center p-8', full ? 'min-h-dvh' : 'min-h-[52vh]')}>
      <FoSpinner size="lg" label={label} />
    </div>
  )
}

export function MeisterButton({
  children,
  variant = 'primary',
  className,
  loading,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'accent' | 'ghost' | 'danger'; loading?: boolean }) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-[#1a2638] active:bg-[#152032]',
    accent: 'bg-accent text-white hover:bg-[#b57922] active:bg-[#a06c1e]',
    ghost: 'bg-white text-ink border border-line hover:bg-bg active:bg-[#ebe4d6]',
    danger: 'bg-rose text-white hover:bg-[#a83340] active:bg-[#922c38]',
  }
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50',
        styles[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <FoSpinner size="sm" /> : null}
      {children}
    </button>
  )
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-line bg-white/70 px-6 py-14 text-center sm:px-8 sm:py-16">
      <div className="h-2 w-12 rounded-full bg-accent/40" />
      <p className="max-w-sm text-sm leading-6 text-inksoft">{title}</p>
      {action}
    </div>
  )
}

export function JobCard({
  job,
  onClick,
  lift,
}: {
  job: {
    id: string
    title: string
    urgency: string
    status: string
    site?: { address?: string }
    scheduled_start?: string | null
    photos?: { url: string }[]
  }
  onClick?: () => void
  lift?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-[16px] border border-line bg-white p-3.5 text-left shadow-[0_1px_2px_rgb(28_36_48_/_0.06)] transition duration-150',
        lift && 'scale-[1.02] shadow-lg ring-2 ring-accent',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-semibold leading-5 text-ink">{job.title}</p>
        {job.urgency === 'notdienst' && (
          <span className="animate-pulse rounded-full bg-rose/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose">
            Notdienst
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-5 text-inksoft">{job.site?.address}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <StatusPill status={job.status} />
        <span className="tabular text-[11px] text-inksoft">
          {job.scheduled_start
            ? new Date(job.scheduled_start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      </div>
    </button>
  )
}
