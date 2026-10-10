# EnVision

The web app that runs **EnVision**, LICET's interdepartmental prototype contest organised by the Institution's Innovation Council (IIC). First-year student teams pick a theme, get a senior mentor, build a project and present it in judging rounds marked by faculty and an external jury; results go on a leaderboard.

Live site: **https://envisionlicet.vercel.app**

- [What the app does](#what-the-app-does)
- [Who uses it](#who-uses-it)
- [Running a year: the admin's checklist](#running-a-year-the-admins-checklist)
- [Starting the next year](#starting-the-next-year)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Project structure](#project-structure)
- [How the database works](#how-the-database-works)
- [Programme years (editions)](#programme-years-editions)
- [Authentication and sessions](#authentication-and-sessions)
- [Caching](#caching)
- [Judging, scores and the leaderboard](#judging-scores-and-the-leaderboard)
- [The admin manual and help search](#the-admin-manual-and-help-search)
- [AI assistant access (MCP)](#ai-assistant-access-mcp)
- [Deploying](#deploying)
- [Changing the database safely](#changing-the-database-safely)
- [Troubleshooting](#troubleshooting)

---

## What the app does

| Area | What happens |
|---|---|
| Teams | Each team has a login (its team number). It edits its name, logo and roster, picks a theme, writes its project (title, problem, solution) and submits a deck link. |
| Mentors | Senior students sign in with their 12-digit registration number, write a profile, pick the themes they'd mentor and see their (at most two) teams. |
| Themes | Ten SDG-mapped problem areas with capacities for teams and mentors. Admins open and close viewing and picking. |
| Mentor allocation | Admins pair mentors with teams on a drag-and-drop board and seat them in lab venues. |
| Timeline and guidelines | The session plan (phases, days/weeks, venues, resource persons, feedback forms) and the pitch-deck guideline slides with a downloadable PPTX. |
| Judging | Rounds with their own criteria, one round live at a time; judging and waiting rooms; evaluators assigned to rooms; per-evaluator sheets averaged into a team score; admin overrides; printable sheets and Excel. |
| Leaderboard | Admins publish rounds; with several published, teams are ranked by the average. Ties are broken by a configurable order of criteria. |
| Programme years | Every year (2026-27, 2027-28, …) keeps all its data side by side. Admins can open and edit any year; a wizard starts the next one. |
| Public site | Landing page, project Showcase and Mentors, with a year selector for earlier years. |
| Admin tools | A home dashboard ("cockpit"), a built-in user manual with a free-text help search, and an MCP endpoint so AI assistants can run admin jobs. |

## Who uses it

| Role | Signs in with | Lands on | Can |
|---|---|---|---|
| Team (`member`) | team number, e.g. `17` | `/member` | team profile, domain, project + deck, mentor, timeline, guidelines, leaderboard |
| Mentor | registration number `3111xxxxxxxx` | `/mentor` | profile, domains, my teams, timeline, guidelines, leaderboard |
| Faculty / Jury | any login ID, e.g. `vjsharmila` | `/evaluate` | mark the teams in their rooms for the live round |
| Admin | e.g. `envisionlicet` | `/admin` | everything |

New team and mentor accounts start with the password **`licet@123`** and must change it on first sign-in; teams must also add the team lead's email. Faculty and jury aren't forced to change it.

## Running a year: the admin's checklist

The admin portal has a full **User manual** at `/admin/manual` and a help search on every admin page (press `/`). In short:

1. **Accounts.** Users → Add New User, or create all team and mentor logins with the new-year wizard. Faculty and jury logins can be given judging rooms when created.
2. **Themes.** Domains → edit the ten themes. Domain Selection → Students / Mentors → set capacities.
3. **Open theme picking.** Flip *visibility* then *selection* for students and mentors (Domain Selection, or Home → Portal switches). Close selection when done.
4. **Allocate mentors.** Mentor Allocation → drag teams onto mentors (max two each); set each mentor's lab venue; Download PDF.
5. **Timeline and guidelines.** Timeline → sessions with dates written like `21.08.2026 (AN)` and feedback form links. Guidelines → slides and the PPTX.
6. **Judging setup.** Judging → Rounds (criteria and max marks; activate the live round) → Venues (judging and waiting rooms, assigned by theme or mentor; team overrides on Submissions) → Faculty & Jury (rooms per evaluator) → Documents (report headings, then print the judging sheets and faculty schedule).
7. **On judging day.** Evaluators mark on `/evaluate`. Watch Home → Needs you and the live-round bar; fix marks in Scores or Evaluator Sheets.
8. **Results.** Scores → set the tie-break order → turn on *Show on leaderboard*. Preview mixes of rounds on Home → Leaderboard first.

## Starting the next year

Nothing is ever deleted: the previous year stays complete and editable.

1. Admin → **Manage years** (under the menu) → **Start a new year**.
2. Year `2027-28`; start from `2026-27`; tick what to copy: themes and capacities, round templates (criteria and tie-break order, no scores), rooms, timeline, guidelines.
3. Enter the **number of teams** (creates logins `1`…`N`, password `licet@123`) and paste the **mentor registration numbers** (one per line, `3111` + 8 digits).
4. Leave *Make current* off, Review, Create. You're switched into the new year: check themes, rounds, timeline and guidelines.
5. When ready, **Make current** on Manage years. From then on, teams, mentors and evaluators sign in to the new year and last year's logins stop working. Admins can still open the old year from the Year dropdown, and its projects stay on the public Showcase under its year.

## Tech stack

- **Next.js 16** (App Router, React 19, server components, route handlers), TypeScript, Tailwind CSS 4, Radix UI primitives, lucide icons.
- **Supabase Postgres**, used only through security-definer RPC functions (no Supabase Auth, no direct table access from the browser).
- **jose** for signed session cookies and the MCP OAuth tokens.
- **jsPDF** / jspdf-autotable and **xlsx** for the judging PDFs and Excel exports.
- **@modelcontextprotocol/sdk** for the admin MCP server.
- Hosted on **Vercel**.

## Getting started locally

Requirements: Node 20+ and npm (a `pnpm-lock.yaml` is also kept).

```bash
npm install
# create .env.local with the variables below
npm run dev                  # http://localhost:3000
```

`.env.local`:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The Supabase anon (public) key |
| `SESSION_SECRET` | Long random string that signs session cookies and MCP tokens. Changing it signs everyone out. |
| `NEXT_PUBLIC_SUBMISSION_DRIVE_FOLDER_URL` | Optional: the shared Google Drive folder teams upload decks to |

Scripts: `npm run dev` (webpack dev server), `npm run build`, `npm run start`, `npm run lint`. Type-check with `npx tsc --noEmit`.

The local app talks to whatever Supabase project the env points at — usually the live one, so treat local admin actions as real.

## Project structure

```
app/
  page.tsx                  landing page
  login, change-password    sign-in flow
  member/…                  team portal
  mentor/…                  mentor portal
  evaluate/                 faculty & jury marking console
  showcase/, mentors/       public pages (?year= for earlier years)
  admin/
    page.tsx                home dashboard (cockpit)
    users/                  user management
    domain-selection, students, mentors, domains
    matching/               mentor allocation and lab venues
    timeline/, guidelines/
    team-profiles/, mentor-profiles/
    judging/                hub + submissions, venues, documents, rounds,
                            evaluators, scores, sheets
    years/                  programme years and the new-year wizard
    manual/                 the admin user manual
    submissions, scores, evaluation  → redirects to the Judging hub
  api/                      route handlers (admin/*, login, evaluate, mcp, oauth, img, …)
components/                 UI (admin-dashboard/, judging/, ui/ primitives, …)
lib/
  supabase-server.ts        the shared, year-aware Supabase client
  edition.ts, edition-context.ts   programme-year resolution and caching
  session.ts, get-session.ts       cookie sessions
  admin-manual.ts           manual content (also feeds the help search)
  manual-search.ts          the help search engine
  leaderboard.ts, leaderboard-rank.ts, tiebreak.ts
  judging.ts, judging-shared.ts, evaluation.ts, round-scores.ts
  admin-dashboard.ts        home dashboard data
  mcp/                      MCP server, tools, guide, OAuth
supabase/                   SQL for every database change (see below)
proxy.ts                    route guard (Next 16 middleware)
MCP.md                      connecting an AI assistant
```

## How the database works

- Every read and write goes through a **Postgres function** (`supabase.rpc(...)`) declared `security definer`. Functions check the caller themselves: admin functions take `p_admin_user_id` and call `_require_admin`; user functions take `p_user_id`.
- The server uses the **anon key** with no Supabase session; row-level security is on for every table with no policies, and table and view grants to `anon`/`authenticated` are revoked, so nothing can be read except through the functions.
- Images (team logos, mentor photos) are stored as data URIs in `app_users` and served by `/api/img/*` with long-lived cache headers. Decks are Google Drive / Canva links.
- `supabase/*.sql` records every change made to the live database (most were applied through the Supabase MCP). They are a history, not a migration chain to replay: to rebuild a database from scratch, take a schema dump of the live project (`supabase db dump`) instead.

## Programme years (editions)

Implemented in `supabase/editions.sql`, `supabase/editions_part2.sql`, `lib/edition.ts` and `lib/supabase-server.ts`.

- `public.editions` lists the years (`id` like `2026-27`, `label`, `is_current`).
- Every data table `T` was renamed to **`T_all`** with an `edition_id` column. A **view named `T`** shows one year's rows, so the ~100 existing functions work unchanged against "their" year. Views are `security_invoker` with all public grants revoked.
- The year a request works in is the **`x-envision-edition` request header**, else the current year (`public.current_edition()`).
- The app sets that header automatically: `lib/supabase-server.ts` gives the shared client a custom `fetch` that asks `resolveRequestEdition()` (lib/edition.ts):
  - work pinned with `withEdition(year, …)` uses that year (public pages with `?year=`, cached loaders, the image route with `&y=`);
  - an **admin** uses the year chosen in the Year dropdown (cookie `envision_edition`);
  - everyone else uses the current year.
- **Admin accounts** have `edition_id = null` and appear in every year. Team, mentor and evaluator logins belong to one year, so login IDs can repeat across years; a trigger keeps them unique within a year and keeps admin logins unique overall.
- Year functions: `get_editions`, `admin_edition_stats`, `admin_set_current_edition`, `admin_start_edition` (the wizard: copies the chosen config, creates team and mentor logins, never copies teams, scores, allocations or selections).
- Cached data is keyed by year with `editionCached(...)`, so one year's cache never serves another.

## Authentication and sessions

- `/api/login` calls the `login` RPC (bcrypt via pgcrypto) and sets an HS256 JWT cookie `envision_session` (12 h) holding the user id, login, role and flags.
- `proxy.ts` guards `/member`, `/mentor`, `/admin`, `/evaluate`: no session → `/login`; must change password → `/change-password`; team without email → `/member/add-email`; wrong portal → the role's home.
- Mentor login IDs must be 12 digits starting `3111` (checked on the login form and server).

## Caching

- Admin-managed shared data (settings, themes, capacities, timeline, guidelines, judging venues/assignments/settings, rounds, years) is cached with `unstable_cache` and **invalidated by tag** on every admin write (`lib/cache-tags.ts`, `lib/revalidate.ts`).
- Public showcase lists cache for 20–60 s. Per-user data is never cached.
- `<AutoRefresh>` re-renders every page about every 30 s (skipped in hidden tabs) without losing what's typed.

## Judging, scores and the leaderboard

- **Rounds** (`rubric_presets`) each have criteria with max marks; exactly one is live (`is_active`), and that one drives the evaluator console, the judging PDFs and the rubric teams see.
- **Rooms**: a team's judging/waiting room is its own assignment, else its mentor's, else its theme's (`resolveJudgingVenue`). Rooms belong to the year.
- **Evaluators** cover rooms plus optional extra teams and file one sheet per team; a trigger averages all sheets per criterion into `round_scores`. Admins can edit the round score directly or any single sheet.
- **Tie-break**: each round stores a criteria priority (`tiebreak`). Equal totals are separated by criterion 1, then 2, …; fully equal teams share a rank (`lib/tiebreak.ts`).
- **Leaderboard**: rounds with `scores_published` are shown; with two or more, teams are ranked by the average and a missing round counts as 0 (`lib/leaderboard-rank.ts`, shared by the real leaderboard and the admin preview).

## The admin manual and help search

- Content lives in **`lib/admin-manual.ts`**: topics grouped in sections, each with a summary, steps, notes, links, plus `asks` (other phrasings) and `keywords` used only for search. It renders at `/admin/manual`.
- **`lib/manual-search.ts`** answers free-text questions with no server or AI: it matches word forms, synonyms (room ↔ venue, marks ↔ score, batch ↔ year…), typos (edit distance), weights rare words higher and rewards matching phrases.
- The search box sits under the admin menu on every admin page (shortcut `/`); the best answer opens in place.
- **When you add or change a feature, add or update its topic.** If a question you'd expect doesn't find the right topic, add that phrasing to the topic's `asks`.

## AI assistant access (MCP)

`/api/mcp` is a Model Context Protocol server with about 40 admin tools and an app guide (`lib/mcp/`). Add `https://envisionlicet.vercel.app/api/mcp` to Claude, VS Code or Cursor, sign in as an admin and click Allow; OAuth is stateless (JWTs signed with a key derived from `SESSION_SECRET`). The tools work on the **current** year. See `MCP.md`.

## Deploying

- The GitHub repo is connected to **Vercel**; pushing to `main` deploys production. Set the four environment variables in the Vercel project.
- Database changes are applied separately (Supabase SQL editor or the Supabase MCP). Apply them **before** deploying code that needs them, and write them so the currently deployed code keeps working.

## Changing the database safely

- Change the **`T_all` table**, never the `T` view: `alter table public.app_users_all add column …`.
- Then rebuild that view so it picks up the column: `select public._edition_view('app_users');` (a view's `select *` is fixed when it is created).
- New tables that hold per-year data should follow the same pattern: an `edition_id text references editions(id) default public.current_edition()` column, a `T_all` name and a view made with `_edition_view`.
- Upserts must use per-year keys, e.g. `on conflict (edition_id, domain_id)`.
- Revoke `anon`/`authenticated` on any new table or view; expose data only through `security definer` functions.
- Try risky changes inside `begin; … rollback;` first.

## Troubleshooting

| Problem | Check |
|---|---|
| Someone can't sign in | Login ID format; the account exists in the **current** year; not hidden; reset the password to `licet@123`. |
| An admin change doesn't show | Reload (pages auto-refresh every ~30 s); check the Year dropdown — you may be editing another year. |
| A yellow "You're working in …" banner | You switched the admin pages to another year; click *Back to …*. |
| Everyone signed out | `SESSION_SECRET` changed. |
| Year list looks out of date after editing `editions` by hand | It refreshes within 5 minutes, or on the next year action in the admin. |
| Locked out of every admin account | Reset an admin's `password_hash` in `app_users_all` with `extensions.crypt('newpass', extensions.gen_salt('bf'))`. |
