/**
 * FieldOps office SPA.
 *
 * Super Admin, owner, office, and accountant. Routing is role-based in AppShell
 * (GET /api/v1/me). Plantafel is web-only. Native apps live under mobileapp_client/.
 */
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Bell, FileText, Flame, Map, Search, Wrench, LayoutDashboard, Columns3, Briefcase, Users, UserCog, Receipt, CreditCard, Hammer, UserRound, Menu, X, ChevronDown } from 'lucide-react'
import { api, downloadAuthenticated, getToken, setToken, beginImpersonation, stopImpersonation, isImpersonating, getOrgId, setOrgId } from './shared/lib/api'
import { EmptyState, JobCard, MeisterButton, PageHeader, ScreenLoader, StatusPill } from './shared/ui/kit'
import { euros, activityLabel } from './shared/lib/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { AccountantWorkspace, ContentPagesWorkspace, CustomerPortalWorkspace, CustomersWorkspace, FieldWorkspace, JobsWorkspace, NotificationsInbox, TeamWorkspace } from './screens/Workspaces'

const qc = new QueryClient()

type User = {
  id: string
  name: string
  email: string
  role: string | null
  role_label?: string | null
  is_super_admin: boolean
  can_create_jobs?: boolean
  verification_status?: string | null
  office_approval_status?: string | null
  access_message?: string | null
  organization: { id: string; name: string; plan: string } | null
  organizations?: { id: string; name: string; plan: string }[]
}

type Job = {
  id: string
  title: string
  status: string
  urgency: string
  scheduled_start?: string | null
  site?: { address?: string }
  customer?: { name: string; phone?: string }
  assignees?: { id: string; name: string; phone?: string }[]
  photos?: { id: string; kind: string; url: string }[]
  materials?: { id: string; name: string; quantity: number }[]
}

function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/api/v1/me'),
    enabled: Boolean(getToken()),
    retry: false,
  })
}

function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const mut = useMutation({
    mutationFn: () =>
      api<{ token: string; user: User }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: (data) => {
      setToken(data.token)
      toast.success('Willkommen zurück')
      nav('/')
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <form
        className="paper w-full max-w-[420px] rounded-[24px] p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault()
          mut.mutate()
        }}
      >
        <div className="fo-mark" />
        <p className="fo-kicker mt-5">FieldOps</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-ink">Anmelden</h1>
        <p className="mt-3 text-[15px] leading-6 text-inksoft">Die Plantafel für SHK-Notdienste — Büro plant, Monteure fahren, Kunden sehen den Status.</p>
        <label className="mt-7 block text-sm font-medium">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-inksoft">E-Mail</span>
          <input autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mt-3 block text-sm font-medium">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-inksoft">Passwort</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <MeisterButton className="mt-6 w-full" loading={mut.isPending} disabled={mut.isPending}>
          {mut.isPending ? 'Prüfen…' : 'Weiter'}
        </MeisterButton>
      </form>
    </div>
  )
}

function navClass(active: boolean) {
  return [
    'flex min-h-11 items-center gap-2.5 rounded-[12px] px-3 text-sm font-medium transition',
    active ? 'bg-primary text-white shadow-sm' : 'text-inksoft hover:bg-bg hover:text-ink',
  ].join(' ')
}

function NotificationBell() {
  const nav = useNavigate()
  const { data } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api<{ count: number }>('/api/v1/notifications/unread-count'),
    refetchInterval: 15000,
    enabled: Boolean(getToken()),
  })
  const count = data?.count ?? 0
  return (
    <button
      type="button"
      className="relative grid h-11 w-11 place-items-center rounded-[12px] border border-line bg-white"
      onClick={() => nav('/notifications')}
      aria-label="Mitteilungen"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

function Shell({ children, user }: { children: ReactNode; user: User }) {
  const nav = useNavigate()
  const loc = useLocation()
  const impersonating = isImpersonating()
  const [open, setOpen] = useState(false)
  const superNav = user.is_super_admin && !impersonating
  const officeNav = user.role === 'owner' || user.role === 'office'

  const itemActive = (to: string) => (to === '/' ? loc.pathname === '/' : loc.pathname === to || loc.pathname.startsWith(`${to}/`))

  const links = superNav
    ? [
        { to: '/', label: 'Plattform', icon: LayoutDashboard, group: 'Steuerung' },
        { to: '/content', label: 'Inhalte', icon: FileText, group: 'Steuerung' },
        { to: '/board', label: 'Plantafel', icon: Columns3, group: 'Büro' },
        { to: '/jobs', label: 'Einsätze', icon: Briefcase, group: 'Büro' },
        { to: '/customers', label: 'Kunden', icon: Users, group: 'Büro' },
        { to: '/team', label: 'Team', icon: UserCog, group: 'Büro' },
        { to: '/notifications', label: 'Mitteilungen', icon: Bell, group: 'Büro' },
        { to: '/billing', label: 'Abrechnung', icon: CreditCard, group: 'Büro' },
        { to: '/invoices', label: 'Buchhaltung', icon: Receipt, group: 'Rollen' },
        { to: '/field', label: 'Monteur', icon: Hammer, group: 'Rollen' },
        { to: '/portal', label: 'Kunde', icon: UserRound, group: 'Rollen' },
      ]
    : officeNav
      ? [
          { to: '/', label: 'Plantafel', icon: Columns3, group: 'Büro' },
          { to: '/jobs', label: 'Einsätze', icon: Briefcase, group: 'Büro' },
          { to: '/customers', label: 'Kunden', icon: Users, group: 'Büro' },
          { to: '/team', label: 'Team', icon: UserCog, group: 'Büro' },
          { to: '/notifications', label: 'Mitteilungen', icon: Bell, group: 'Büro' },
          { to: '/invoices', label: 'Rechnungen', icon: Receipt, group: 'Büro' },
          ...(user.role === 'owner' ? [{ to: '/billing', label: 'Abrechnung', icon: CreditCard, group: 'Büro' }] : []),
        ]
      : []

  const groups = [...new Set(links.map((l) => l.group))]

  const sidebar = (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-line bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary text-white">
          <Wrench className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <strong className="block truncate leading-tight">FieldOps</strong>
          <span className="block truncate text-[11px] text-inksoft">{superNav ? 'Super Admin' : user.role_label ?? user.role}</span>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-inksoft">{group}</p>
            <div className="space-y-0.5">
              {links
                .filter((l) => l.group === group)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    onClick={() => setOpen(false)}
                    className={() => navClass(itemActive(item.to))}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-4 py-3 text-xs leading-5 text-inksoft">
        {user.organization?.name ?? 'Plattform'}
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      {impersonating && (
        <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-sm text-white">
          <span className="min-w-0 truncate">
            Super-Admin-Ansicht als {user.name} · {user.organization?.name ?? 'Mandant'}
          </span>
          <button
            className="h-9 shrink-0 rounded-[10px] border border-white/30 px-3 font-medium"
            onClick={() => {
              if (stopImpersonation()) {
                nav('/')
                void qc.invalidateQueries({ queryKey: ['me'] })
              }
            }}
          >
            Zurück zur Plattform
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {links.length > 0 && <div className="hidden self-stretch md:flex">{sidebar}</div>}
        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-ink/40" aria-label="Menü schließen" onClick={() => setOpen(false)} />
            <div className="relative h-full w-[240px] shadow-2xl">{sidebar}</div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button className="grid h-11 w-11 place-items-center rounded-[12px] border border-line md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menü">
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <span className="truncate text-sm text-inksoft">{user.organization?.name ?? (user.is_super_admin ? 'Plattform' : '')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <NotificationBell />
              {user.is_super_admin && !impersonating && (user.organizations?.length ?? 0) > 0 && (
                <select
                  className="hidden h-11 max-w-[180px] sm:block"
                  value={user.organization?.id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value
                    setOrgId(id)
                    void api('/api/v1/platform/switch-organization', {
                      method: 'POST',
                      body: JSON.stringify({ organization_id: id }),
                    }).then(() => {
                      toast.success('Mandant gewechselt')
                      void qc.invalidateQueries()
                    })
                  }}
                >
                  {user.organizations?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="hidden max-w-[220px] truncate text-inksoft lg:inline">
                {user.name} · {user.role_label ?? user.role ?? (user.is_super_admin ? 'super_admin' : '')}
              </span>
              <button
                className="h-11 rounded-[12px] border border-line bg-white px-3 font-medium"
                onClick={() => {
                  void api('/api/v1/auth/logout', { method: 'POST' }).finally(() => {
                    setToken(null)
                    nav('/login')
                  })
                }}
              >
                Abmelden
              </button>
            </div>
          </header>
          {user.access_message && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm leading-5 text-amber-900">{user.access_message}</div>
          )}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Plantafel() {
  const [selected, setSelected] = useState<string | null>(null)
  const [cmd, setCmd] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['board'],
    queryFn: () =>
      api<{
        day: string
        unassigned: { data: Job[] } | Job[]
        columns: { monteur: { id: string; name: string; phone?: string }; jobs: { data: Job[] } | Job[] }[]
      }>('/api/v1/dispatch/board'),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmd(true)
      }
      if (e.key === 'Escape') setCmd(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const unwrap = (x: { data: Job[] } | Job[] | undefined): Job[] => (Array.isArray(x) ? x : (x?.data ?? []))
  const columns = data?.columns ?? []
  const unassigned = unwrap(data?.unassigned)
  const allJobs = useMemo(() => [...unassigned, ...columns.flatMap((c) => unwrap(c.jobs))], [columns, unassigned])
  const selectedJob = allJobs.find((j) => j.id === selected)
  const qcLocal = useQueryClient()
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const assign = useMutation({
    mutationFn: ({ jobId, monteurId }: { jobId: string; monteurId: string }) =>
      api(`/api/v1/jobs/${jobId}/assign`, { method: 'POST', body: JSON.stringify({ monteur_id: monteurId }) }),
    onSuccess: () => {
      toast.success('Zugewiesen')
      void qcLocal.invalidateQueries({ queryKey: ['board'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const unassign = useMutation({
    mutationFn: (jobId: string) => api(`/api/v1/jobs/${jobId}/unassign`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Zuweisung aufgehoben')
      void qcLocal.invalidateQueries({ queryKey: ['board'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onDropAssign = (monteurId: string, e: React.DragEvent) => {
    e.preventDefault()
    setDropTarget(null)
    const jobId = e.dataTransfer.getData('text/job')
    if (jobId) assign.mutate({ jobId, monteurId })
  }

  const onDropUnassign = (e: React.DragEvent) => {
    e.preventDefault()
    setDropTarget(null)
    const jobId = e.dataTransfer.getData('text/job')
    if (!jobId) return
    if (unassigned.some((job) => job.id === jobId)) return
    unassign.mutate(jobId)
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
      <aside className="hidden border-r border-line bg-white p-4 xl:block">
        <p className="fo-kicker">Heute</p>
        <div className="mt-3 space-y-2 text-sm">
          <div className="rounded-[12px] bg-bg px-3 py-2.5 font-medium">07:00 – 19:00</div>
        </div>
        <button className="mt-6 flex h-11 w-full items-center gap-2 rounded-[12px] border border-line px-3 text-sm" onClick={() => setCmd(true)}>
          <Search className="h-4 w-4" /> ⌘K Suche
        </button>
      </aside>
      <main className="min-h-0 overflow-auto p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="fo-kicker">Büro</p>
            <h1 className="fo-h1">Plantafel</h1>
            <p className="mt-1 text-sm text-inksoft">{data?.day} · Europa/Berlin</p>
          </div>
          <button className="flex h-11 items-center gap-2 rounded-[12px] border border-line bg-white px-3 text-sm xl:hidden" onClick={() => setCmd(true)}>
            <Search className="h-4 w-4" /> Suche
          </button>
        </div>
        {isLoading && <ScreenLoader label="Plantafel wird geladen…" />}
        {isError && <EmptyState title="Plantafel konnte nicht geladen werden." action={<MeisterButton onClick={() => void refetch()}>Erneut versuchen</MeisterButton>} />}
        {!isLoading && !isError && (
          <div className="-mx-4 flex min-h-[56vh] gap-3 overflow-x-auto px-4 pb-6 sm:mx-0 sm:gap-4 sm:px-0">
            <section
              className={`min-w-[240px] flex-1 rounded-[16px] border border-dashed p-3 sm:min-w-[260px] ${
                dropTarget === 'unassigned' ? 'border-accent bg-accent/10' : 'border-line bg-white/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDropTarget('unassigned')
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
              }}
              onDrop={onDropUnassign}
            >
              <h2 className="mb-3 text-sm font-semibold text-inksoft">Nicht zugewiesen</h2>
              {unassigned.length === 0 && <EmptyState title="Noch keine Einsätze heute — Auftrag anlegen" />}
              <div className="space-y-2">
                {unassigned.map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/job', job.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <JobCard job={job} onClick={() => setSelected(job.id)} lift={selected === job.id} />
                  </div>
                ))}
              </div>
            </section>
            {columns.map((col) => (
              <section
                key={col.monteur.id}
                className={`min-w-[260px] flex-1 rounded-[16px] border bg-white p-3 sm:min-w-[280px] ${
                  dropTarget === col.monteur.id ? 'border-accent ring-2 ring-accent/40' : 'border-line'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDropTarget(col.monteur.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
                }}
                onDrop={(e) => onDropAssign(col.monteur.id, e)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{col.monteur.name}</p>
                    <p className="text-xs text-inksoft">
                      {unwrap(col.jobs).some((j) => j.status === 'on_site')
                        ? 'Vor Ort'
                        : unwrap(col.jobs).some((j) => j.status === 'en_route')
                          ? 'Unterwegs'
                          : 'Frei'}
                    </p>
                  </div>
                  <Flame className="h-4 w-4 text-accent" />
                </div>
                <div className="space-y-2">
                  {unwrap(col.jobs).map((job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/job', job.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                    >
                      <JobCard job={job} onClick={() => setSelected(job.id)} lift={selected === job.id} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <section className="hidden min-w-[240px] flex-1 rounded-[16px] border border-line bg-[#f0ece4] p-3 2xl:block">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Map className="h-4 w-4" /> Karte
              </div>
              <div className="flex h-64 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#d9e4dd,#e8dfd0)] text-sm text-inksoft">
                Pins nach Status · Frankfurt
              </div>
            </section>
          </div>
        )}
      </main>
      <aside className="max-h-[46vh] overflow-auto border-t border-line bg-white xl:max-h-none xl:border-t-0 xl:border-l">
        <Inspector jobId={selected} fallback={selectedJob} />
      </aside>
      <AnimatePresence>
        {cmd && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-start bg-ink/30 pt-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCmd(false)}
          >
            <div className="paper mx-auto w-full max-w-lg rounded-[16px] p-2" onClick={(e) => e.stopPropagation()}>
              <input autoFocus placeholder="Ali zu Musterstraße…" className="w-full rounded-[10px] px-3 py-3 outline-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Inspector({ jobId, fallback }: { jobId: string | null; fallback?: Job }) {
  const { data } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api<Job>(`/api/v1/jobs/${jobId}`),
    enabled: Boolean(jobId),
  })
  const job = data ?? fallback
  const nav = useNavigate()
  const invoice = useMutation({
    mutationFn: () => api<{ id: string }>(`/api/v1/jobs/${jobId}/invoice`, { method: 'POST' }),
    onSuccess: (inv) => nav(`/invoices/${inv.id}`),
    onError: (e: Error) => toast.error(e.message),
  })
  if (!job) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Einsatz</h2>
        <p className="mt-2 text-sm text-inksoft">Wähle eine Karte, um Details zu sehen.</p>
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-line bg-white p-4">
        <StatusPill status={job.status} />
        <h2 className="mt-2 text-lg font-semibold">{job.title}</h2>
        <p className="text-sm text-inksoft">{job.site?.address}</p>
      </div>
      <div className="space-y-4 overflow-auto p-4">
        {job.photos?.[0] && <img src={job.photos[0].url} alt="" className="h-40 w-full rounded-[16px] object-cover" />}
        <p className="text-sm">Kunde · {job.customer?.name}</p>
        <div className="flex flex-wrap gap-2">
          {job.materials?.map((m) => (
            <span key={m.id} className="rounded-full border border-line px-3 py-1 text-xs">
              {m.name} × {m.quantity}
            </span>
          ))}
        </div>
        {job.status === 'completed' && (
          <MeisterButton variant="accent" className="w-full" onClick={() => invoice.mutate()} loading={invoice.isPending} disabled={invoice.isPending}>
            Rechnung erstellen
          </MeisterButton>
        )}
      </div>
    </div>
  )
}

type Invoice = {
  id: string
  number: string | null
  status: string
  immutable: boolean
  total_cents: number
  service_date?: string
  items?: { description: string; quantity: number; unit_price_cents: number; tax_rate: number }[]
  customer?: { name: string }
  organization?: { name?: string; street?: string; zip?: string; city?: string; tax_number?: string; iban?: string }
}

function DatevExportLink() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="text-sm font-medium text-primary underline disabled:opacity-50"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void downloadAuthenticated('/api/v1/invoices/export', 'datev-export.csv')
          .then(() => toast.success('DATEV-Export gespeichert'))
          .catch((e: Error) => toast.error(e.message))
          .finally(() => setBusy(false))
      }}
    >
      {busy ? 'Export…' : 'DATEV-CSV'}
    </button>
  )
}

function Invoices() {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<{ data: Invoice[] }>('/api/v1/invoices'),
  })
  const invoices = data?.data ?? []
  return (
    <div className="fo-page max-w-5xl">
      <PageHeader
        kicker="Buchhaltung"
        title="Rechnungen"
        action={<DatevExportLink />}
      />
      {isLoading && <ScreenLoader label="Rechnungen werden geladen…" />}
      <div className="space-y-3">
        {invoices.map((inv) => (
          <Link key={inv.id} to={`/invoices/${inv.id}`} className="paper block rounded-[16px] p-4">
            <div className="flex items-center justify-between">
              <strong>{inv.number || 'Entwurf'}</strong>
              <StatusPill status={inv.status} />
            </div>
            <p className="tabular mt-1 text-lg">{euros(inv.total_cents)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function InvoiceDetail() {
  const id = window.location.pathname.split('/').pop() ?? ''
  const qcLocal = useQueryClient()
  const hasToken = Boolean(getToken())
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api<Invoice>(`/api/v1/invoices/${id}`),
    enabled: hasToken,
    retry: false,
  })
  const send = useMutation({
    mutationFn: () => api(`/api/v1/invoices/${id}/send`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Rechnung versendet')
      void qcLocal.invalidateQueries({ queryKey: ['invoice', id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  if (!hasToken) return <Navigate to="/login" />
  if (isLoading) return <ScreenLoader label="Rechnung wird geladen…" />
  if (isError || !data) {
    return (
      <div className="grid min-h-dvh place-items-center p-8">
        <EmptyState
          title="Rechnung konnte nicht geladen werden."
          action={<MeisterButton onClick={() => void refetch()}>Erneut versuchen</MeisterButton>}
        />
      </div>
    )
  }
  return (
    <div className="min-h-dvh bg-[#ece7de] p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-between">
          <MeisterButton variant="ghost" onClick={() => history.back()}>
            Zurück
          </MeisterButton>
          {!data.immutable && (
            <MeisterButton variant="accent" onClick={() => send.mutate()}>
              Versenden
            </MeisterButton>
          )}
        </div>
        <article className="paper relative rounded-[4px] p-6 sm:p-12">
          {data.immutable && (
            <div className="absolute right-8 top-8 rotate-12 rounded border-2 border-teal px-3 py-1 text-sm font-semibold text-teal">
              GoBD: nicht mehr änderbar
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Rechnung</p>
          <h1 className="mt-2 text-3xl font-semibold">{data.number ?? 'ENTWURF'}</h1>
          <p className="mt-1 text-sm text-inksoft">Leistungsdatum {data.service_date}</p>
          <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
            <div>
              <strong>{data.organization?.name}</strong>
              <p>{data.organization?.street}</p>
              <p>
                {data.organization?.zip} {data.organization?.city}
              </p>
            </div>
            <div>
              <strong>Kunde</strong>
              <p>{data.customer?.name}</p>
            </div>
          </div>
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-inksoft">
                <th className="py-2">Beschreibung</th>
                <th>Menge</th>
                <th>Preis</th>
                <th>MwSt</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item) => (
                <tr key={item.description} className="border-b border-line">
                  <td className="py-2">{item.description}</td>
                  <td className="tabular">{item.quantity}</td>
                  <td className="tabular">{euros(item.unit_price_cents)}</td>
                  <td>{item.tax_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tabular mt-6 text-right text-2xl font-semibold">{euros(data.total_cents)}</p>
        </article>
      </div>
    </div>
  )
}

function Admin() {
  const nav = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-overview'],
    queryFn: () =>
      api<{
        stats: {
          organizations: number
          users: number
          jobs: number
          jobs_today: number
          open_notdienst: number
          invoices: number
          revenue_cents: number
          failed_jobs: number
        }
        organizations: {
          id: string
          name: string
          plan: string
          suspended: boolean
          users: number
          jobs: number
          city?: string | null
          owner?: { id: string; name: string; email: string } | null
          members: { id: string; name: string; email: string; role: string }[]
        }[]
        jobs: {
          id: string
          title: string
          status: string
          urgency: string
          organization?: string
          customer?: string
          site?: string
          assignees: string[]
        }[]
        invoices: {
          id: string
          number: string | null
          status: string
          total_cents: number
          organization?: string
          customer?: string
        }[]
        activity: { description: string; actor?: string | null; at: string }[]
      }>('/api/v1/platform/overview'),
  })

  const impersonate = useMutation({
    mutationFn: (userId: string) => api<{ token: string }>('/api/v1/platform/impersonate', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
    onSuccess: (res) => {
      beginImpersonation(res.token)
      toast.success('Mandanten-Ansicht geöffnet')
      nav('/')
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const [tenant, setTenant] = useState({
    name: '',
    city: 'Frankfurt am Main',
    street: '',
    zip: '',
    owner_name: '',
    owner_email: '',
    owner_password: 'FieldOps!2026',
  })
  const [mandantFormOpen, setMandantFormOpen] = useState<boolean | null>(null)
  const createOrg = useMutation({
    mutationFn: () =>
      api('/api/v1/platform/organizations', {
        method: 'POST',
        body: JSON.stringify(tenant),
      }),
    onSuccess: () => {
      toast.success('Mandant angelegt')
      setTenant({
        name: '',
        city: 'Frankfurt am Main',
        street: '',
        zip: '',
        owner_name: '',
        owner_email: '',
        owner_password: 'FieldOps!2026',
      })
      setMandantFormOpen(false)
      void qc.invalidateQueries({ queryKey: ['platform-overview'] })
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <ScreenLoader label="Plattform wird geladen…" />
  if (isError || !data) {
    return (
      <div className="p-8">
        <EmptyState title="Plattform konnte nicht geladen werden." action={<MeisterButton onClick={() => void refetch()}>Erneut versuchen</MeisterButton>} />
      </div>
    )
  }

  const formOpen = mandantFormOpen ?? data.organizations.length === 0
  const s = data.stats
  const cards = [
    ['Mandanten', String(s.organizations)],
    ['Nutzer', String(s.users)],
    ['Einsätze', String(s.jobs)],
    ['Heute', String(s.jobs_today)],
    ['Offener Notdienst', String(s.open_notdienst)],
    ['Umsatz (versendet)', euros(s.revenue_cents)],
  ]

  return (
    <div className="fo-page max-w-6xl space-y-6">
      <PageHeader
        kicker="Super Admin"
        title="Plattform"
        hint="Live-Betrieb über alle Mandanten."
        action={<MeisterButton variant="ghost" onClick={() => nav('/content')}>Inhalte bearbeiten</MeisterButton>}
      />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value]) => (
          <div key={label} className="paper rounded-[16px] p-4">
            <p className="text-xs uppercase tracking-wide text-inksoft">{label}</p>
            <p className="tabular mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Mandanten</h2>
          <MeisterButton
            type="button"
            variant="ghost"
            aria-expanded={formOpen}
            onClick={() => setMandantFormOpen(!formOpen)}
          >
            {formOpen ? 'Formular schließen' : 'Neuen Mandanten anlegen'}
            <ChevronDown className={`h-4 w-4 transition-transform ${formOpen ? 'rotate-180' : ''}`} />
          </MeisterButton>
        </div>
        {formOpen && (
          <form
            className="paper grid gap-3 rounded-[16px] p-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              createOrg.mutate()
            }}
          >
            <p className="fo-kicker md:col-span-2">Neuen Mandanten anlegen</p>
            <label className="block text-sm">
              Betrieb
              <input className="mt-1 w-full" value={tenant.name} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} placeholder="Mustermann SHK GmbH" />
            </label>
            <label className="block text-sm">
              Ort
              <input className="mt-1 w-full" value={tenant.city} onChange={(e) => setTenant({ ...tenant, city: e.target.value })} />
            </label>
            <label className="block text-sm">
              Straße
              <input className="mt-1 w-full" value={tenant.street} onChange={(e) => setTenant({ ...tenant, street: e.target.value })} />
            </label>
            <label className="block text-sm">
              PLZ
              <input className="mt-1 w-full" value={tenant.zip} onChange={(e) => setTenant({ ...tenant, zip: e.target.value })} />
            </label>
            <label className="block text-sm">
              Inhaber
              <input className="mt-1 w-full" value={tenant.owner_name} onChange={(e) => setTenant({ ...tenant, owner_name: e.target.value })} />
            </label>
            <label className="block text-sm">
              Inhaber-E-Mail
              <input className="mt-1 w-full" type="email" value={tenant.owner_email} onChange={(e) => setTenant({ ...tenant, owner_email: e.target.value })} />
            </label>
            <label className="block text-sm md:col-span-2">
              Inhaber-Passwort
              <input className="mt-1 w-full" type="password" value={tenant.owner_password} onChange={(e) => setTenant({ ...tenant, owner_password: e.target.value })} />
            </label>
            <div className="md:col-span-2">
              <MeisterButton type="submit" loading={createOrg.isPending} disabled={createOrg.isPending}>
                Mandant anlegen
              </MeisterButton>
            </div>
          </form>
        )}
        {data.organizations.length === 0 && (
          <EmptyState title="Noch keine Mandanten — ohne Betrieb kann der Live-Betrieb nicht starten." />
        )}
        {data.organizations.map((o) => (
          <article key={o.id} className="paper rounded-[16px] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong>{o.name}</strong>
                <p className="text-sm text-inksoft">
                  {o.plan} · {o.city ?? '—'} · {o.users} Nutzer · {o.jobs} Einsätze
                  {o.suspended ? ' · gesperrt' : ''}
                </p>
                <p className="mt-2 text-xs text-inksoft">
                  {o.members.map((m) => `${m.name} (${m.role})`).join(' · ')}
                </p>
              </div>
              {o.owner && (
                <MeisterButton loading={impersonate.isPending} disabled={impersonate.isPending} onClick={() => impersonate.mutate(o.owner!.id)}>
                  Als Inhaber öffnen
                </MeisterButton>
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Einsätze</h2>
          <div className="space-y-2">
            {data.jobs.map((job) => (
              <div key={job.id} className="paper rounded-[16px] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-xs text-inksoft">
                      {job.organization} · {job.customer} · {job.site}
                    </p>
                    {job.assignees.length > 0 && (
                      <p className="text-xs text-inksoft">Monteur: {job.assignees.join(', ')}</p>
                    )}
                  </div>
                  <StatusPill status={job.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Rechnungen</h2>
          <div className="space-y-2">
            {data.invoices.map((inv) => (
              <div key={inv.id} className="paper flex items-center justify-between rounded-[16px] p-3">
                <div>
                  <p className="font-semibold">{inv.number || 'Entwurf'}</p>
                  <p className="text-xs text-inksoft">
                    {inv.organization} · {inv.customer}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular font-semibold">{euros(inv.total_cents)}</p>
                  <StatusPill status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Aktivität</h2>
        <div className="paper divide-y divide-line rounded-[16px]">
          {data.activity.length === 0 && <p className="p-4 text-sm text-inksoft">Noch keine Ereignisse.</p>}
          {data.activity.slice(0, 5).map((row, i) => (
            <div key={`${row.at}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <strong>{row.actor || 'System'}</strong> · {activityLabel[row.description] || row.description}
              </span>
              <span className="shrink-0 text-xs text-inksoft">{row.at}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Billing() {
  const loc = useLocation()
  const qcLocal = useQueryClient()
  const params = new URLSearchParams(loc.search)
  const sessionId = params.get('session_id')
  const canceled = params.get('canceled') === '1'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing'],
    queryFn: () =>
      api<{
        configured: boolean
        current: string
        limits: { users: number; jobs: number }
        plans: { id: string; name: string; price_cents: number; users: number; jobs: number }[]
      }>('/api/v1/billing'),
    retry: false,
  })

  const sync = useMutation({
    mutationFn: (id: string) => api<{ applied: boolean; plan: string }>('/api/v1/billing/sync', {
      method: 'POST',
      body: JSON.stringify({ session_id: id }),
    }),
    onSuccess: (res) => {
      if (res.applied) toast.success(`Plan ${res.plan} ist aktiv`)
      void qcLocal.invalidateQueries({ queryKey: ['billing'] })
      void qcLocal.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  useEffect(() => {
    if (sessionId) sync.mutate(sessionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const checkout = useMutation({
    mutationFn: (plan: string) => api<{ url: string }>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
    onSuccess: (res) => {
      window.location.href = res.url
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="fo-page max-w-4xl">
      <PageHeader
        kicker="Abrechnung"
        title="Pläne"
        hint={`Aktueller Plan: ${data?.current ?? '…'}${data?.limits ? ` · ${data.limits.jobs} Einsätze / ${data.limits.users} Nutzer` : ''}`}
      />
      {canceled && <p className="mt-3 text-sm text-accent">Checkout abgebrochen.</p>}
      {isLoading && <ScreenLoader label="Abrechnung wird geladen…" />}
      {isError && (
        <p className="mt-3 text-sm text-rose">Kein Mandant ausgewählt. Legen Sie zuerst einen Betrieb auf der Plattform an.</p>
      )}
      {!data?.configured && data && (
        <p className="mt-3 text-sm text-inksoft">Stripe-Schlüssel fehlen in der API-Umgebung.</p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data?.plans.map((plan) => (
          <article key={plan.id} className="paper rounded-[16px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{plan.name}</p>
            <p className="tabular mt-2 text-3xl font-semibold">{plan.price_cents === 0 ? '0 €' : euros(plan.price_cents)}</p>
            <p className="text-sm text-inksoft">{plan.price_cents === 0 ? '14 Tage' : 'pro Monat'}</p>
            <p className="mt-4 text-sm">
              {plan.users} Nutzer · {plan.jobs} Einsätze
            </p>
            {plan.id !== 'trial' && plan.id !== data.current && (
              <MeisterButton
                className="mt-6 w-full"
                variant="accent"
                disabled={checkout.isPending || !data.configured}
                loading={checkout.isPending}
                onClick={() => checkout.mutate(plan.id)}
              >
                {checkout.isPending ? 'Weiter zu Stripe…' : 'Upgrade'}
              </MeisterButton>
            )}
            {plan.id === data.current && <p className="mt-6 text-sm text-teal">Aktuell</p>}
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-inksoft">
        {data?.configured
          ? 'Testkarte (nur bei konfiguriertem Stripe): ACCT-000015 · beliebiges Datum · CVC 123'
          : 'Upgrade ist erst verfügbar, wenn Stripe in der API-Umgebung hinterlegt ist.'}
      </p>
    </div>
  )
}

function AppShell() {
  const { data: user, isLoading, isError } = useMe()
  const loc = useLocation()
  useEffect(() => {
    if (user?.is_super_admin && user.organization?.id && !getOrgId()) {
      setOrgId(user.organization.id)
    }
  }, [user])
  if (!getToken()) return <Navigate to="/login" />
  if (isLoading) return <ScreenLoader full label="Sitzung wird geladen…" />
  if (isError || !user) return <Navigate to="/login" />
  if (loc.pathname.startsWith('/team/customers')) return <Navigate to="/customers" replace />

  let inner = <div className="p-8">Diese Rolle nutzt die mobile App.</div>
  if (user.is_super_admin) {
    if (loc.pathname.startsWith('/board')) inner = <Plantafel />
    else if (loc.pathname.startsWith('/jobs')) inner = <JobsWorkspace />
    else if (loc.pathname.startsWith('/customers')) inner = <CustomersWorkspace />
    else if (loc.pathname.startsWith('/team')) inner = <TeamWorkspace />
    else if (loc.pathname.startsWith('/field')) inner = <FieldWorkspace />
    else if (loc.pathname.startsWith('/portal')) inner = <CustomerPortalWorkspace />
    else if (loc.pathname.startsWith('/invoices')) inner = <AccountantWorkspace />
    else if (loc.pathname.startsWith('/billing')) inner = <Billing />
    else if (loc.pathname.startsWith('/notifications')) inner = <NotificationsInbox />
    else if (loc.pathname.startsWith('/content')) inner = <ContentPagesWorkspace />
    else inner = <Admin />
  } else if (user.role === 'accountant') inner = <Invoices />
  else if (user.role === 'owner' || user.role === 'office') {
    if (loc.pathname.startsWith('/invoices')) inner = <Invoices />
    else if (loc.pathname.startsWith('/billing')) inner = <Billing />
    else if (loc.pathname.startsWith('/jobs')) inner = <JobsWorkspace />
    else if (loc.pathname.startsWith('/customers')) inner = <CustomersWorkspace />
    else if (loc.pathname.startsWith('/team')) inner = <TeamWorkspace />
    else if (loc.pathname.startsWith('/notifications')) inner = <NotificationsInbox />
    else inner = <Plantafel />
  }

  return <Shell user={user}>{inner}</Shell>
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}
