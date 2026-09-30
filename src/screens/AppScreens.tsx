/**
 * Mobile app screenshot galleries for Field (Monteur) and Customer (Kunde).
 * Images live in /app-screens/{field|customer}/{android|ios}/
 */
import { useMemo, useState } from 'react'
import { PageHeader } from '../shared/ui/kit'

type Platform = 'android' | 'ios'

type Shot = { id: string; title: string; hint: string; file: string }

const fieldShots: Shot[] = [
  { id: 'login', title: 'Anmelden', hint: 'Monteur-Login', file: '01-login.png' },
  { id: 'heute', title: 'Heute', hint: 'Nächster Stopp & Tour', file: '02-heute.png' },
  { id: 'tour', title: 'Tour', hint: 'Alle Einsätze', file: '03-tour.png' },
  { id: 'post', title: 'Post', hint: 'Zuweisungen & Mitteilungen', file: '04-post.png' },
  { id: 'konto', title: 'Konto', hint: 'Profil & Abmelden', file: '05-konto.png' },
  { id: 'job', title: 'Einsatz', hint: 'Pipeline, Foto, Material', file: '06-job.png' },
]

const customerShots: Shot[] = [
  { id: 'login', title: 'Anmelden', hint: 'Kunden-Login', file: '01-login.png' },
  { id: 'register', title: 'Registrieren', hint: 'Betrieb wählen & Konto', file: '02-register.png' },
  { id: 'home', title: 'Home', hint: 'Nächster Termin & Rechnungen', file: '03-home.png' },
  { id: 'auftrag', title: 'Auftrag', hint: 'Neue Anfrage', file: '04-auftrag.png' },
  { id: 'status', title: 'Status', hint: 'Tracker der Aufträge', file: '05-status.png' },
  { id: 'post', title: 'Post', hint: 'Mitteilungen', file: '06-post.png' },
]

function DeviceFrame({
  platform,
  src,
  alt,
  dark,
}: {
  platform: Platform
  src: string
  alt: string
  dark?: boolean
}) {
  const isIos = platform === 'ios'
  return (
    <figure className="mx-auto w-[min(100%,280px)]">
      <div
        className={[
          'relative overflow-hidden border shadow-xl',
          isIos ? 'rounded-[42px] border-ink/20 bg-ink p-[10px]' : 'rounded-[28px] border-line bg-[#1a1d22] p-[8px]',
        ].join(' ')}
      >
        {isIos && (
          <div className="pointer-events-none absolute left-1/2 top-[18px] z-10 h-[28px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
        )}
        {!isIos && (
          <div className="pointer-events-none absolute left-1/2 top-[10px] z-10 h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-black/50" />
        )}
        <div className={['overflow-hidden bg-black', isIos ? 'rounded-[32px]' : 'rounded-[20px]'].join(' ')}>
          <img src={src} alt={alt} className={['block w-full', dark ? 'bg-[#07080A]' : 'bg-[#F4EFE6]'].join(' ')} loading="lazy" />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-inksoft">
        {isIos ? 'iOS' : 'Android'}
      </figcaption>
    </figure>
  )
}

function Gallery({
  app,
  shots,
  dark,
}: {
  app: 'field' | 'customer'
  shots: Shot[]
  dark?: boolean
}) {
  const [platform, setPlatform] = useState<Platform>('android')
  const base = `/app-screens/${app}/${platform}`
  const title = app === 'field' ? 'Field-App · Monteur' : 'Kunden-App'
  const kicker = app === 'field' ? 'Mobile · de.fieldops.field' : 'Mobile · de.fieldops.customer'

  const items = useMemo(() => shots, [shots])

  return (
    <div className="fo-page">
      <PageHeader
        kicker={kicker}
        title={title}
        hint="Alle Screens für Android und iOS. React Native teilt dieselbe UI — Geräteframe markiert die Plattform."
      />

      <div className="mt-5 inline-flex rounded-[14px] border border-line bg-white p-1">
        {([
          ['android', 'Android'],
          ['ios', 'iOS'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={[
              'h-10 min-w-[110px] rounded-[10px] px-4 text-sm font-semibold transition',
              platform === id ? 'bg-primary text-white' : 'text-inksoft hover:text-ink',
            ].join(' ')}
            onClick={() => setPlatform(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((shot) => (
          <article key={shot.id} className="paper rounded-[20px] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{shot.title}</p>
            <p className="mt-1 text-sm text-inksoft">{shot.hint}</p>
            <div className="mt-5">
              <DeviceFrame platform={platform} src={`${base}/${shot.file}`} alt={`${title} — ${shot.title}`} dark={dark} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function FieldAppScreensPage() {
  return <Gallery app="field" shots={fieldShots} dark />
}

export function CustomerAppScreensPage() {
  return <Gallery app="customer" shots={customerShots} />
}
