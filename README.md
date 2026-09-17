# FieldOps office (`client/`)

React 19 + Vite SPA for Super Admin, owner, office, and accountant. Monteure and customers should use the native apps; this SPA also has preview workspaces for those roles when Super Admin impersonates or opens `/field` and `/portal`.

Proxy: Vite `5173` → API `127.0.0.1:8000` (`/api`, `/storage`).

## Layout

```
src/
  App.tsx                 Login, Shell, Plantafel, Admin, Billing, invoices, routing
  screens/Workspaces.tsx  Kunden, Einsätze, Team, Field preview, Portal, Buchhaltung, Mitteilungen, Inhalte
  shared/lib/api.ts       fetch wrapper, Sanctum token, impersonation, X-Organization-Id
  shared/lib/ui.ts        status labels, euros, cn
  shared/ui/kit.tsx       PageHeader, MeisterButton, StatusPill, JobCard
  index.css               Design tokens (Inter, 8px grid, 44px controls)
```

Routes are not a large router table. `AppShell` reads `GET /api/v1/me` and picks the inner view from `location.pathname` + role.

| Path | Super Admin | Owner / office |
|---|---|---|
| `/` | Plattform overview | Plantafel |
| `/content` | CMS editor | — |
| `/board` | Plantafel | — (office uses `/`) |
| `/jobs` `/customers` `/team` `/notifications` | yes | yes |
| `/billing` | yes | owner |
| `/invoices` | Buchhaltung preview | Rechnungen |
| `/field` `/portal` | role previews | — |

## Run

```powershell
cd client
npm install
npm run dev
```

Open http://localhost:5173 — login `admin@admin.com` / `12345678`.

## Vercel

Root Directory: `client`. Add env `VITE_API_URL` = your Render API origin, e.g. `https://fieldops-api.onrender.com` (no trailing slash). Redeploy after setting it. Also set `FRONTEND_URL` on the API to the Vercel URL.

## Data

- TanStack Query keys: `me`, `board`, `jobs`, `customers`, `members`, `notifications`, `platform-overview`, `platform-content`.
- Token: `localStorage.fieldops.token`. Impersonation keeps the admin token in `fieldops.adminToken`.
- Org switch: `fieldops.orgId` + header `X-Organization-Id`.
