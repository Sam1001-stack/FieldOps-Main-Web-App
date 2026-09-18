export const statusClass: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-50 text-blue-700',
  assigned: 'bg-blue-50 text-blue-700',
  en_route: 'bg-amber-50 text-amber-800',
  on_site: 'bg-violet-50 text-violet-700',
  waiting_parts: 'bg-orange-50 text-orange-800',
  completed: 'bg-teal-50 text-teal-800',
  invoiced: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-zinc-100 text-zinc-500',
  sent: 'bg-teal-50 text-teal-800',
  paid: 'bg-emerald-50 text-emerald-800',
  overdue: 'bg-rose-50 text-rose-800',
}

export const statusLabel: Record<string, string> = {
  draft: 'Entwurf',
  scheduled: 'Geplant',
  assigned: 'Zugewiesen',
  en_route: 'Unterwegs',
  on_site: 'Vor Ort',
  waiting_parts: 'Wartet auf Teile',
  completed: 'Erledigt',
  invoiced: 'Berechnet',
  cancelled: 'Storniert',
  sent: 'Versendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
}

export const activityLabel: Record<string, string> = {
  'job.created': 'Einsatz angelegt',
  'job.assigned': 'Einsatz zugewiesen',
  'job.unassigned': 'Zuweisung aufgehoben',
  'job.status': 'Status geändert',
  'invoice.created': 'Rechnung erstellt',
  'invoice.sent': 'Rechnung versendet',
  'org.created': 'Mandant angelegt',
  'org.suspend.toggle': 'Mandant gesperrt/entsperrt',
  impersonation: 'Als Mandant angemeldet',
  'org.settings': 'Stammdaten geändert',
  'member.created': 'Mitglied angelegt',
  'member.removed': 'Mitglied entfernt',
  'time.logged': 'Zeit erfasst',
  'customer.registered': 'Kunde registriert',
  'customer.verified': 'Kunde bestätigt',
  'customer.rejected': 'Kunde abgelehnt',
  'office.pending': 'Büro wartet',
  'office.approved': 'Büro freigegeben',
  'office.rejected': 'Büro abgelehnt',
  'content.updated': 'Inhalt aktualisiert',
}

export function euros(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}
