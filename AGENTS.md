# MannaTic — Agent Development Guide (AGENTS.md)

> [!IMPORTANT]
> **MODALITÀ DI SVILUPPO**: L'agente deve operare come uno **sviluppatore software senior, altamente professionale, preciso e pignolo**.
> Non sono ammessi approcci superficiali, scorciatoie approssimative, modifiche non verificate o assunzioni infondate. Ogni intervento sul codice, sul database e sull'infrastruttura deve essere chirurgico, testato e conforme alle migliori pratiche ingegneristiche.

This document provides architectural context, business rules, coding standards, and deployment workflows for AI coding assistants working on the **MannaTic** codebase.

---

## 1. Project Overview

**MannaTic** is a full-featured, multi-tenant ticketing and service management SaaS platform designed for technical installations, maintenance, repairs, customer support, and equipment quotations.

- **Production URL**: [https://supporto.mannatec.it](https://supporto.mannatec.it)
- **Local Dev URL**: `http://localhost:9002` (Next.js with Turbopack on port 9002)
- **Production Host**: Ubuntu VPS (`212.237.3.135`), Docker Compose (`mannatic-app` on port 8001 mapped via Nginx Proxy Manager)

---

## 2. Technology Stack & Key Libraries

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack, React 18/19, TypeScript)
- **Styling**: Tailwind CSS + [Shadcn UI](https://ui.shadcn.com/) / Radix UI Primitives + Lucide React Icons
- **Database**: [Supabase](https://supabase.com/) PostgreSQL via `@supabase/supabase-js` (`src/lib/supabase.ts`)
- **Storage**: Supabase Storage S3/REST API (`src/lib/supabase-storage.ts`) for attachments, quotes, documents, and logos
- **Email Service**: Native SMTP (`mail.mannatec.it:465`) via [Nodemailer](https://nodemailer.com/) with automatic fallback to Resend API (`src/lib/mailer.ts`)
- **Push Notifications**: Web Push (VAPID / Service Worker `public/sw.js`) + Native Android Bridge (`window.AndroidApp`)
- **Mobile Wrapper**: Native Android APK (`android/` project, downloadable from `public/mannatic.apk` at `https://supporto.mannatec.it/mannatic.apk`)

---

## 3. User Roles & Permission Hierarchy

| Role | Scope & Permissions | Key Views |
| :--- | :--- | :--- |
| **Creator** | Superadmin across all companies, distributors, and global settings. Root user: `creator@mannatic.com`. | `/dashboard/companies`, `/dashboard/creator-settings` |
| **Admin** | Full management of their company: users, settings, interventions, support tickets, quotations, invoicing. | `/dashboard`, `/dashboard/settings`, `/dashboard/interventions` |
| **Operator** | Field technician / installer: executes assigned interventions, views schedule, logs work. | `/dashboard`, `/dashboard/interventions` (filtered) |
| **Client** | End customer. **Strict business rule**: Clients **CANNOT** create interventions directly; they can **ONLY** open support tickets. Interventions are read-only. | `/dashboard/requests` (client ticket view) |
| **Distributor / DistributorAdmin / DistributorUser** | Distributor portal: catalogs, quotation PDFs, operator metrics, multi-company overview. | `/dashboard/distributor-dashboard`, `/dashboard/quotes` |

---

## 4. Critical Business Rules & Established Patterns

### 4.1. Client Interventions vs Support Tickets
- Clients are strictly barred from creating interventions directly (`new_installation`, `intervention`, `maintenance`).
- Clients must only submit **Support Tickets** (`/dashboard/requests`).
- Admins can convert a Support Ticket into an Intervention using `convertSupportTicketToIntervention(ticketId, adminUser)` in `src/app/actions.ts`.

### 4.2. Ticket Status Auto-Transition
- When staff (`Admin`, `Operator`, `Creator`, `Distributor`) replies to a non-closed ticket, `addSupportMessage()` in `src/lib/data.ts` **must automatically set ticket status to `'In Lavorazione'`**.

### 4.3. Case-Insensitive Email Queries
- PostgreSQL is case-sensitive with `=`. In `src/lib/data.ts`, always query emails using **`.ilike('email', cleanEmail)`** to avoid login failures caused by uppercase input (e.g. `Gestionempr@...` vs `gestionempr@...`).
- When saving or updating users (`addUser`, `updateUser`), normalize `email` using `.trim().toLowerCase()`.

### 4.4. Automated Alert Checks (Cron vs UI Render)
- Alerts for tickets open > 48 hours and interventions open > 7 days are processed via `/api/cron` (`src/app/api/cron/route.ts`).
- **DO NOT** execute blocking alert queries/SMTP calls synchronously inside page render cycles (e.g. inside `fetchKpiData` on `/dashboard/page.tsx`). Running SMTP synchronously on page load causes latency, request timeouts, and Next.js Server Action mismatches.
- Root crontab on the VPS triggers the daily cron every morning:
  ```bash
  0 8 * * * curl -s http://localhost:8001/api/cron?secret=mannatic-secret-cron-token > /dev/null 2>&1
  ```

### 4.5. Key Mapping: Snake_Case ↔ CamelCase
- Supabase tables use standard `snake_case` column names (`company_id`, `created_at`, `due_date`, etc.).
- The frontend codebase uses `camelCase`.
- Always use `mapKeysToCamel<T>()` and `mapKeysToSnake()` from `src/lib/data.ts` when reading from or writing to Supabase.

---

## 5. Development & Deployment Procedures

### 5.1. Running Locally
```bash
# Start Next.js development server on port 9002 (Turbopack)
npm run dev
# URL: http://localhost:9002
```

### 5.2. Type Checking & Code Quality
```bash
npx tsc --noEmit
```

### 5.3. Remote Deployment to Production VPS
When deploying changes to the production VPS (`212.237.3.135`):

```bash
# 1. Sync source files to remote directory (exclude build artifacts & local env)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.npm_cache' --exclude='.env' --exclude='.env.local' ./ root@212.237.3.135:/opt/apps/mannatic/

# 2. Rebuild and restart the Docker container on the VPS
ssh root@212.237.3.135 "cd /opt/apps/mannatic && docker compose up -d --build app"

# 3. Verify container health
ssh root@212.237.3.135 "docker ps --filter 'name=mannatic-app'"
curl -I https://supporto.mannatec.it/api/health
```

---

## 6. Directory Map

```
mannatic/
├── android/                   # Native Android WebView project (wrapper for supporto.mannatec.it)
├── public/                    # Static assets, PWA sw.js, and mannatic.apk download
├── src/
│   ├── ai/flows/              # Genkit AI workflows & email triggers
│   ├── app/                   # Next.js App Router (dashboard, login, API routes, cron)
│   │   ├── actions.ts         # Server Actions (emails, alerts, exports, uploads)
│   │   ├── api/cron/          # Automated cron tasks for overdue tickets and interventions
│   │   └── dashboard/         # Role-based dashboard subpages
│   ├── components/            # Reusable UI components & dashboard modules
│   ├── contexts/              # UserContext, ThemeContext, MapsContext
│   └── lib/                   # Supabase client, data access layer (data.ts), mailer (mailer.ts)
└── docker-compose.yml         # Production container definition (mannatic-app)
```

---

## 7. Security Best Practices

- **Never display, log, or commit** credentials, `.env` files, or private keys.
- Always sanitize file uploads and validate MIME types before uploading to Supabase Storage.
- Maintain role authorization checks on both the client (UI rendering) and server actions (`actions.ts`).

---

## 8. Professional & Meticulous Engineering Standards (Modalità Sviluppatore Professionista e Pignolo)

Ogni agente AI che lavora su questo repository **DEVE** operare secondo gli standard di un **Senior Staff Software Engineer professionista, estremamente meticoloso e pignolo**. Non sono tollerate approssimazioni, codice pigro o scorciatoie non testate.

### 8.1. Pignoleria e Precisione Chirurgica (Zero Approssimazioni)
- **Verifica prima di toccare**: Non tirare mai a indovinare. Ispeziona sempre lo schema del database (Supabase), le tipizzazioni in `src/lib/types.ts` e le funzioni esistenti in `src/lib/data.ts` prima di scrivere codice.
- **Risoluzione alla radice**: Non applicare mai patch cosmetiche o workaround temporanei ("cerotti"). Trova la causa prima del bug e risolvila in modo strutturale e pulito.
- **Rispetto dell'architettura consolidata**: Segui rigidamente i pattern del progetto (Next.js 15 App Router, Supabase REST/PostgreSQL con `mapKeysToCamel`/`mapKeysToSnake`, notifiche, layout responsive e dark/light mode).

### 8.2. Programmazione Difensiva & Robustezza
- **Controllo maniacale dei casi limite (Edge Cases)**:
  - Gestisci sempre `null`, `undefined`, stringhe vuote, array vuoti e oggetti malformati.
  - Normalizza e sanifica sempre gli input dell'utente (es. `.trim()`, `.toLowerCase()` per email, validazione numeri di telefono, rimozione di payload eccessivi in localStorage).
  - Gestisci sempre i fallimenti asincroni con `try / catch` completi, log dettagliati e messaggi di errore parlanti per l'utente finale.
- **Nessuna operazione bloccante sul render**: Le chiamate pesanti (invio email SMTP, query massive, notifiche batch) devono avvenire tramite endpoint dedicati (`/api/cron`), Server Actions asincrone o processi in background. Mai bloccare il ciclo di render o la navigazione dei componenti React.
- **Prevenzione doppi click & Race Conditions**: Ogni form o azione interattiva deve avere il proprio stato di caricamento (`isSubmitting`, `isLoading`), disabilitare i controlli durante l'elaborazione e prevenire invii multipli accidentali.

### 8.3. Tipizzazione Ferrea & Pulizia del Codice
- **TypeScript rigoroso**: Evita tassativamente l'uso pigro di `any`. Definisci tipi e interfacce esplicite in `src/lib/types.ts`.
- **Nessun codice morto o disordinato**: Rimuovi import inutilizzati, log di debug temporanei superflui, e commenta con chiarezza soltanto le scelte architetturali non banali.

### 8.4. Verifica e Collaudo Obbligatori (Definition of Done)
Un task **NON è finito** finché non è stato verificato con la massima cura:
1. **Verifica della sintassi e dei tipi**: Esegui o verifica la compilazione con `npx tsc --noEmit` o tramite il dev server Next.js.
2. **Test delle query & dati reali**: Quando tocchi query Supabase o script, esegui test effettivi con `npx tsx` per verificare che la query restituisca i dati attesi senza errori o latenze anomale.
3. **Collaudo locale**: Verifica che la pagina compili e risponda con HTTP 200 su `http://localhost:9002`.
4. **Verifica del deploy**: Quando richiesto un deploy su VPS (`212.237.3.135`), verifica lo stato del container (`docker ps`), i log (`docker logs mannatic-app`) e la risposta dell'endpoint (`/api/health`).

### 8.5. Cura Maniacale per UI, UX e Feedback Utente
- L'utente non deve **mai** avere il dubbio se un'azione sia andata a buon fine o sia bloccata:
  - Spinner di caricamento evidenti.
  - Toast di notifica immediati (verde/successo con dettagli chiari, rosso/distruttivo con spiegazione dell'errore).
  - Dialog di conferma per azioni irreversibili (eliminazioni, cancellazioni, chiusure forzate).
  - Layout sempre impeccabile e perfettamente reattivo sia su schermi desktop ampi che su smartphone tramite l'APK Android.

