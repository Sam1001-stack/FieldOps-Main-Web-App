/**
 * Office workspaces: Kunden, Einsätze, Team, Field preview, Kundenportal,
 * Buchhaltung, Mitteilungen, Super Admin Inhalte (CMS).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../shared/lib/api'
import { activityLabel, euros, statusLabel } from '../shared/lib/ui'
import { EmptyState, MeisterButton, PageHeader, ScreenLoader, StatusPill } from '../shared/ui/kit'

type Job = {
  id: string
  title: string
  status: string
  urgency: string
  description?: string | null
  customer_status?: string
  customer?: { id?: string; name: string }
  site?: { address?: string }
  assignees?: { id: string; name: string }[]
  scheduled_start?: string | null
}

type Customer = {
  id: number
  public_id: string
  name: string
  email?: string | null
  phone?: string | null
  user_id?: number | null
  verification_status?: string
  verification_label?: string
  sites: { id: number; address?: string; street?: string; zip?: string; city?: string }[]
}

type Member = {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  role_label?: string
  approval_status?: string
  approval_label?: string
}

type Notice = {
  id: string
  type: string
  type_label?: string
  title: string
  body: string
  unread: boolean
  created_at: string
  actor?: { name: string } | null
}

export function CustomersWorkspace() {
  const qc = useQueryClient()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api<{ role: string; is_super_admin: boolean }>('/api/v1/me') })
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', street: '', zip: '', city: 'Frankfurt am Main' })
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api<Customer[]>('/api/v1/customers'),
  })
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<{ data: Job[] }>('/api/v1/jobs'),
  })
  const create = useMutation({
    mutationFn: () => api('/api/v1/customers', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('Kunde angelegt')
      setForm({ name: '', email: '', phone: '', street: '', zip: '', city: 'Frankfurt am Main' })
      void qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Kunde gelöscht')
      void refetch()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const verify = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'rejected' }) =>
      api(`/api/v1/customers/${id}/verify`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'verified' ? 'Kunde bestätigt — kann jetzt Aufträge anlegen' : 'Kunde abgelehnt')
      void qc.invalidateQueries({ queryKey: ['customers'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const canVerify = me?.role === 'owner' || me?.role === 'office' || me?.is_super_admin
  const list = jobs?.data ?? []
  const visibleJobs = selected ? list.filter((job) => job.customer?.id === selected) : list

  return (
    <div className="fo-page max-w-6xl space-y-6">
      <PageHeader kicker="Owner / Büro" title="Kunden" hint="Registrierte Kunden erst bestätigen, dann dürfen sie Aufträge anlegen." />
      <form
        className="paper grid gap-3 rounded-[16px] p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Straße" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="PLZ" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Ort" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <MeisterButton className="md:col-span-3" loading={create.isPending} disabled={create.isPending}>
          Kunde anlegen
        </MeisterButton>
      </form>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-inksoft">Personen</h2>
          {(data ?? []).map((c) => (
            <div
              key={c.public_id}
              className={['paper flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-center sm:justify-between', selected === c.public_id ? 'ring-2 ring-primary' : ''].join(' ')}
            >
              <button type="button" className="flex-1 text-left" onClick={() => setSelected((cur) => (cur === c.public_id ? null : c.public_id))}>
                <strong>{c.name}</strong>
                <p className="text-sm text-inksoft">
                  {c.email} · {c.sites[0]?.address}
                </p>
                {c.user_id ? (
                  <p className="mt-1 text-xs font-medium text-accent">{c.verification_label ?? c.verification_status}</p>
                ) : (
                  <p className="mt-1 text-xs text-inksoft">Nur Stammdaten</p>
                )}
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                {canVerify && c.user_id && c.verification_status === 'pending' && (
                  <>
                    <MeisterButton onClick={() => verify.mutate({ id: c.public_id, status: 'verified' })}>Bestätigen</MeisterButton>
                    <MeisterButton variant="ghost" onClick={() => verify.mutate({ id: c.public_id, status: 'rejected' })}>
                      Ablehnen
                    </MeisterButton>
                  </>
                )}
                <MeisterButton variant="danger" onClick={() => remove.mutate(c.public_id)}>
                  Löschen
                </MeisterButton>
              </div>
            </div>
          ))}
          {isLoading && <ScreenLoader label="Kunden werden geladen…" />}
          {(data ?? []).length === 0 && !isLoading && <EmptyState title="Noch keine Kunden." />}
        </div>
        <aside className="paper rounded-[16px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Protokoll</h2>
            {selected && (
              <button type="button" className="text-xs text-inksoft underline" onClick={() => setSelected(null)}>
                Alle
              </button>
            )}
          </div>
          <div className="space-y-3">
            {visibleJobs.map((job) => (
              <div key={job.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{job.title}</p>
                <p className="text-xs text-inksoft">
                  {job.customer?.name} · {job.site?.address}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <StatusPill status={job.status} />
                  <span className="text-xs text-inksoft">{job.scheduled_start ? formatLogTime(job.scheduled_start) : ''}</span>
                </div>
              </div>
            ))}
            {visibleJobs.length === 0 && !jobsLoading && <p className="text-sm text-inksoft">Noch keine Einträge.</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}

export function JobsWorkspace() {
  const qc = useQueryClient()
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ can_create_jobs?: boolean; access_message?: string | null }>('/api/v1/me'),
  })
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api<{ data: Job[] }>('/api/v1/jobs'),
  })
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api<Customer[]>('/api/v1/customers'),
  })
  const [form, setForm] = useState({ customer_id: '', title: '', description: '', urgency: 'normal' })
  const create = useMutation({
    mutationFn: () => {
      const customer = customers?.find((c) => String(c.id) === form.customer_id)
      const site = customer?.sites[0]
      return api('/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(form.customer_id),
          site_id: site?.id,
          title: form.title,
          description: form.description,
          urgency: form.urgency,
          scheduled_start: new Date().toISOString(),
        }),
      })
    },
    onSuccess: () => {
      toast.success('Einsatz angelegt')
      setForm({ customer_id: form.customer_id, title: '', description: '', urgency: 'normal' })
      void qc.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/jobs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Einsatz gelöscht')
      void qc.invalidateQueries({ queryKey: ['jobs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const list = jobs?.data ?? []

  return (
    <div className="fo-page max-w-5xl space-y-6">
      <PageHeader kicker="Owner / Büro" title="Einsätze" hint={me?.can_create_jobs === false ? me.access_message ?? undefined : 'Aufträge anlegen und dem Monteur zuweisen.'} />
      {me?.can_create_jobs !== false && (
      <form
        className="paper grid gap-3 rounded-[16px] p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <select className="rounded-[10px] border border-line px-3 py-2" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
          <option value="">Kunde wählen</option>
          {customers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="rounded-[10px] border border-line px-3 py-2" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="notdienst">Notdienst</option>
        </select>
        <input className="rounded-[10px] border border-line px-3 py-2 md:col-span-2" placeholder="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="rounded-[10px] border border-line px-3 py-2 md:col-span-2" placeholder="Beschreibung" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <MeisterButton className="md:col-span-2" loading={create.isPending} disabled={create.isPending}>
          Einsatz anlegen
        </MeisterButton>
      </form>
      )}
      <div className="space-y-2">
        {jobsLoading && <ScreenLoader label="Einsätze werden geladen…" />}
        {list.map((job) => (
          <div key={job.id} className="paper flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong>{job.title}</strong>
              <p className="text-sm text-inksoft">
                {job.customer?.name} · {job.site?.address}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={job.status} />
              <MeisterButton variant="danger" onClick={() => remove.mutate(job.id)}>
                Löschen
              </MeisterButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type MemberLog = {
  id: string
  description: string
  actor?: string | null
  at: string
  member_id?: string | null
  detail?: string | null
}

type TeamGroup = 'staff' | 'office'

const teamTabs: { id: TeamGroup; to: string; label: string; hint: string }[] = [
  { id: 'staff', to: '/team/staff', label: 'Monteure', hint: 'Außendienst' },
  { id: 'office', to: '/team/office', label: 'Büro', hint: 'Innendienst' },
]

const teamRoles: Record<TeamGroup, { value: string; label: string }[]> = {
  staff: [{ value: 'monteur', label: 'Monteur' }],
  office: [
    { value: 'office', label: 'Büro' },
    { value: 'owner', label: 'Inhaber' },
    { value: 'accountant', label: 'Buchhaltung' },
  ],
}

function teamGroupFromPath(pathname: string): TeamGroup {
  if (pathname.includes('/office')) return 'office'
  return 'staff'
}

function formatLogTime(at: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(at))
  } catch {
    return at
  }
}

export function TeamWorkspace() {
  const loc = useLocation()
  const group = teamGroupFromPath(loc.pathname)
  const qc = useQueryClient()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api<{ is_super_admin: boolean }>('/api/v1/me') })
  const roles = teamRoles[group]
  const { data, isLoading } = useQuery({
    queryKey: ['members', group],
    queryFn: () => api<Member[]>(`/api/v1/organization/members?group=${group}`),
    placeholderData: keepPreviousData,
  })
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['member-logs', group],
    queryFn: () => api<MemberLog[]>(`/api/v1/organization/members/logs?group=${group}`),
    placeholderData: keepPreviousData,
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: 'FieldOps!2026', role: roles[0].value, phone: '' })
  useEffect(() => {
    setSelected(null)
    setForm((prev) => ({ ...prev, role: teamRoles[group][0].value }))
  }, [group])
  const create = useMutation({
    mutationFn: () => api('/api/v1/organization/members', { method: 'POST', body: JSON.stringify({ ...form, role: form.role || roles[0].value }) }),
    onSuccess: () => {
      toast.success('Mitglied angelegt')
      setForm({ name: '', email: '', password: 'FieldOps!2026', role: roles[0].value, phone: '' })
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['member-logs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/organization/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Mitglied entfernt')
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['member-logs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const approve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      api(`/api/v1/organization/members/${id}/approve`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'approved' ? 'Büro freigegeben — darf jetzt Einsätze anlegen' : 'Büro abgelehnt')
      void qc.invalidateQueries({ queryKey: ['members'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const visibleLogs = useMemo(() => {
    const list = logs ?? []
    if (!selected) return list
    return list.filter((log) => log.member_id === selected)
  }, [logs, selected])

  const tab = teamTabs.find((item) => item.id === group)!

  return (
    <div className="fo-page max-w-6xl space-y-6">
      <PageHeader kicker="Owner" title="Team" hint={`${tab.hint} mit Personen und Protokoll.`} />
      <div className="flex flex-wrap gap-1 rounded-[12px] border border-line bg-white p-1">
        {teamTabs.map((item) => {
          const active = item.id === group
          return (
            <Link
              key={item.id}
              to={item.to}
              className={[
                'rounded-[10px] px-4 py-2 text-sm font-medium transition',
                active ? 'bg-primary text-white' : 'text-inksoft hover:bg-bg hover:text-ink',
              ].join(' ')}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      <form
        className="paper grid gap-3 rounded-[16px] p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="rounded-[10px] border border-line px-3 py-2" placeholder="Passwort" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {roles.length > 1 ? (
          <select className="rounded-[10px] border border-line px-3 py-2 md:col-span-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        ) : null}
        <MeisterButton className="md:col-span-2" loading={create.isPending} disabled={create.isPending}>
          {group === 'staff' ? 'Monteur anlegen' : 'Büromitarbeiter anlegen'}
        </MeisterButton>
      </form>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-inksoft">Personen</h2>
          {(data ?? []).map((m) => (
            <div
              key={m.id}
              className={['paper flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-center sm:justify-between', selected === m.id ? 'ring-2 ring-primary' : ''].join(' ')}
            >
              <button type="button" className="flex-1 text-left" onClick={() => setSelected((cur) => (cur === m.id ? null : m.id))}>
                <strong>{m.name}</strong>
                <p className="text-sm text-inksoft">
                  {m.email} · {m.role_label ?? m.role}
                  {m.phone ? ` · ${m.phone}` : ''}
                </p>
                {m.role === 'office' && <p className="mt-1 text-xs font-medium text-accent">{m.approval_label ?? m.approval_status}</p>}
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                {me?.is_super_admin && m.role === 'office' && m.approval_status === 'pending' && (
                  <>
                    <MeisterButton onClick={() => approve.mutate({ id: m.id, status: 'approved' })}>Freigeben</MeisterButton>
                    <MeisterButton variant="ghost" onClick={() => approve.mutate({ id: m.id, status: 'rejected' })}>
                      Ablehnen
                    </MeisterButton>
                  </>
                )}
                <MeisterButton variant="danger" onClick={() => remove.mutate(m.id)}>
                  Entfernen
                </MeisterButton>
              </div>
            </div>
          ))}
          {isLoading && <ScreenLoader label="Team wird geladen…" />}
          {(data ?? []).length === 0 && !isLoading && <EmptyState title="Noch niemand in diesem Bereich." />}
        </div>
        <aside className="paper rounded-[16px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Protokoll</h2>
            {selected && (
              <button type="button" className="text-xs text-inksoft underline" onClick={() => setSelected(null)}>
                Alle
              </button>
            )}
          </div>
          <div className="space-y-3">
            {visibleLogs.map((log) => (
              <div key={log.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{activityLabel[log.description] ?? log.description}</p>
                {log.detail && <p className="text-xs text-inksoft">{log.detail}</p>}
                <p className="mt-1 text-xs text-inksoft">
                  {log.actor ?? 'System'} · {formatLogTime(log.at)}
                </p>
              </div>
            ))}
            {visibleLogs.length === 0 && !logsLoading && <p className="text-sm text-inksoft">Noch keine Einträge.</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}

export function FieldWorkspace() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['jobs-field'],
    queryFn: () => api<{ data: Job[] }>('/api/v1/jobs'),
  })
  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/v1/jobs/${id}/transition`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success('Status aktualisiert')
      void qc.invalidateQueries({ queryKey: ['jobs-field'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const next: Record<string, string[]> = {
    assigned: ['en_route'],
    en_route: ['on_site'],
    on_site: ['waiting_parts', 'completed'],
    waiting_parts: ['on_site', 'completed'],
    draft: ['scheduled', 'assigned', 'cancelled'],
    scheduled: ['assigned', 'cancelled'],
    completed: ['invoiced'],
  }

  return (
    <div className="fo-page max-w-3xl space-y-4">
      <PageHeader kicker="Monteur" title="Einsatzliste" hint="Status führen wie in der Field-App." />
      {isLoading && <ScreenLoader label="Einsätze werden geladen…" />}
      {(data?.data ?? []).map((job) => (
        <article key={job.id} className="paper rounded-[16px] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{job.title}</p>
              <p className="text-sm text-inksoft">{job.site?.address}</p>
            </div>
            <StatusPill status={job.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(next[job.status] ?? []).map((status) => (
              <MeisterButton key={status} variant="ghost" onClick={() => transition.mutate({ id: job.id, status })}>
                → {statusLabel[status] ?? status}
              </MeisterButton>
            ))}
          </div>
        </article>
      ))}
      {(data?.data ?? []).length === 0 && <EmptyState title="Keine Einsätze." />}
    </div>
  )
}

export function CustomerPortalWorkspace() {
  const qc = useQueryClient()
  const { data: jobs } = useQuery({
    queryKey: ['jobs-portal'],
    queryFn: () => api<{ data: Job[] }>('/api/v1/jobs'),
  })
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api<Customer[]>('/api/v1/customers'),
  })
  const [title, setTitle] = useState('Undichte Leitung')
  const create = useMutation({
    mutationFn: () => {
      const customer = customers?.[0]
      const site = customer?.sites[0]
      return api('/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customer?.id,
          site_id: site?.id,
          title,
          urgency: 'notdienst',
          scheduled_start: new Date().toISOString(),
        }),
      })
    },
    onSuccess: () => {
      toast.success('Anfrage gesendet')
      void qc.invalidateQueries({ queryKey: ['jobs-portal'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="fo-page max-w-3xl space-y-4">
      <PageHeader kicker="Kunde" title="Meine Anfragen" hint="Wie in der Kunden-App: Anfrage senden und Status sehen." />
      <form
        className="paper flex flex-col gap-2 rounded-[16px] p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
      >
        <input className="flex-1 rounded-[10px] border border-line px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        <MeisterButton variant="accent">Anfrage senden</MeisterButton>
      </form>
      {(jobs?.data ?? []).map((job) => (
        <div key={job.id} className="paper flex items-center justify-between rounded-[16px] p-4">
          <div>
            <strong>{job.title}</strong>
            <p className="text-xs text-inksoft">{job.customer_status ?? job.status}</p>
          </div>
          <StatusPill status={job.status} />
        </div>
      ))}
    </div>
  )
}

export function AccountantWorkspace() {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<{ data: { id: string; number: string | null; status: string; total_cents: number }[] }>('/api/v1/invoices'),
  })
  const invoices = data?.data ?? []
  return (
    <div className="fo-page max-w-5xl">
      <PageHeader
        kicker="Buchhaltung"
        title="Rechnungen"
        action={
          <a className="text-sm font-medium text-primary underline" href="/api/v1/invoices/export">
            DATEV-CSV
          </a>
        }
      />
      {isLoading && <ScreenLoader label="Rechnungen werden geladen…" />}
      <div className="space-y-3">
        {invoices.map((inv) => (
          <a key={inv.id} href={`/invoices/${inv.id}`} className="paper block rounded-[16px] p-4">
            <div className="flex items-center justify-between">
              <strong>{inv.number || 'Entwurf'}</strong>
              <StatusPill status={inv.status} />
            </div>
            <p className="tabular mt-1 text-lg">{euros(inv.total_cents)}</p>
          </a>
        ))}
      </div>
    </div>
  )
}

export function NotificationsInbox() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notice[]>('/api/v1/notifications'),
    refetchInterval: 15000,
  })
  const mark = useMutation({
    mutationFn: (id: string) => api(`/api/v1/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      void qc.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })
  const markAll = useMutation({
    mutationFn: () => api('/api/v1/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Alle Mitteilungen gelesen')
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      void qc.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })
  const list = data ?? []
  const unread = list.filter((n) => n.unread).length

  return (
    <div className="fo-page max-w-3xl space-y-6">
      <PageHeader
        kicker="Live"
        title="Mitteilungen"
        hint="Registrierungen, Aufträge, Zuweisungen und Status — für Büro und Plattform."
        action={
          unread > 0 ? (
            <MeisterButton variant="ghost" onClick={() => markAll.mutate()}>
              Alle lesen
            </MeisterButton>
          ) : undefined
        }
      />
      <div className="space-y-2">
        {list.map((n) => (
          <button
            key={n.id}
            type="button"
            className={['paper w-full rounded-[16px] p-4 text-left', n.unread ? 'ring-1 ring-accent/40' : 'opacity-80'].join(' ')}
            onClick={() => n.unread && mark.mutate(n.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">{n.type_label ?? n.type}</p>
                <p className="mt-1 font-semibold text-ink">{n.title}</p>
                <p className="mt-1 text-sm text-inksoft">{n.body}</p>
                <p className="mt-2 text-xs text-inksoft">
                  {n.actor?.name ?? 'System'} · {formatLogTime(n.created_at)}
                </p>
              </div>
              {n.unread && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />}
            </div>
          </button>
        ))}
        {isLoading && <ScreenLoader label="Mitteilungen werden geladen…" />}
        {list.length === 0 && !isLoading && <EmptyState title="Keine Mitteilungen." />}
      </div>
    </div>
  )
}

type ContentPage = {
  slug: string
  title: string
  body: string
  audience: 'all' | 'customer' | 'field'
  published: boolean
  sort_order: number
  updated_at?: string | null
  editor?: string | null
}

const audienceLabel: Record<ContentPage['audience'], string> = {
  all: 'Beide Apps',
  customer: 'Nur Kunden-App',
  field: 'Nur Field-App',
}

export function ContentPagesWorkspace() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['platform-content'],
    queryFn: () => api<ContentPage[]>('/api/v1/platform/content'),
  })
  const [slug, setSlug] = useState('privacy')
  const pages = data ?? []
  const selected = pages.find((p) => p.slug === slug) ?? pages[0]
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' as ContentPage['audience'], published: true })

  useEffect(() => {
    if (!selected) return
    setForm({
      title: selected.title,
      body: selected.body,
      audience: selected.audience,
      published: selected.published,
    })
  }, [selected?.slug, selected?.updated_at])

  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform/content/${selected?.slug}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success('Seite gespeichert — sichtbar in den Apps')
      void qc.invalidateQueries({ queryKey: ['platform-content'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <ScreenLoader label="Inhalte werden geladen…" />
  if (!selected) return <div className="fo-page"><EmptyState title="Noch keine Inhaltsseiten." /></div>

  return (
    <div className="fo-page mx-auto w-full max-w-6xl space-y-6">
      <PageHeader kicker="Super Admin" title="Inhalte" hint="Datenschutz, FAQ und weitere Seiten für beide Apps." />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-2">
        {pages.map((page) => (
          <button
            key={page.slug}
            type="button"
            onClick={() => setSlug(page.slug)}
            className={[
              'min-h-14 w-full rounded-[12px] px-3 py-2.5 text-left text-sm transition',
              page.slug === selected.slug ? 'bg-primary text-white' : 'paper hover:bg-bg',
            ].join(' ')}
          >
            <strong className="block">{page.title}</strong>
            <span className={page.slug === selected.slug ? 'text-white/70' : 'text-inksoft'}>
              {audienceLabel[page.audience]}
              {page.published ? '' : ' · Entwurf'}
            </span>
          </button>
        ))}
      </aside>
      <form
        className="paper space-y-4 rounded-[20px] p-5"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-inksoft">{selected.slug}</p>
            <h2 className="text-xl font-semibold">Seite bearbeiten</h2>
          </div>
          <MeisterButton loading={save.isPending} disabled={save.isPending}>{save.isPending ? 'Speichern…' : 'Speichern'}</MeisterButton>
        </div>
        <label className="block text-sm">
          Titel
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Sichtbarkeit
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as ContentPage['audience'] })}
            >
              <option value="all">Beide Apps</option>
              <option value="customer">Nur Kunden-App</option>
              <option value="field">Nur Field-App</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Veröffentlicht
          </label>
        </div>
        <label className="block text-sm">
          Text (Überschriften mit ## )
          <textarea
            className="mt-1 min-h-[360px] w-full rounded-[12px] border border-line px-3 py-2 font-mono text-sm leading-6"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <p className="text-xs text-inksoft">
          Zuletzt {selected.updated_at ? formatLogTime(selected.updated_at) : '—'}
          {selected.editor ? ` · ${selected.editor}` : ''}
        </p>
      </form>
      </div>
    </div>
  )
}
