# EnVision admin MCP

Connect any AI agent to EnVision. It can do everything the admin portal does, and it understands how the app works.

**URL:** `https://envisionlicet.vercel.app/api/mcp`

There are no keys and nothing to configure. Add the URL, and when the browser opens, log in with your admin account and click **Allow**.

## Connect

**VS Code (Copilot agent mode):** Command Palette → `MCP: Add Server…` → **HTTP** → paste the URL → name it `envision-admin`.
Or add this to `.vscode/mcp.json`:
```json
{ "servers": { "envision-admin": { "type": "http", "url": "https://envisionlicet.vercel.app/api/mcp" } } }
```

**Claude Code:** this repo's `.mcp.json` already includes it. Run `/mcp` and pick `envision-admin` to sign in. In any other project:
```sh
claude mcp add --transport http envision-admin https://envisionlicet.vercel.app/api/mcp
```

**Claude Desktop / claude.ai:** Settings → Connectors → Add custom connector → paste the URL.

**Cursor:** Settings → MCP → Add → `{ "envision-admin": { "url": "https://envisionlicet.vercel.app/api/mcp" } }`

## How sign-in works

1. The agent calls `/api/mcp`, gets "sign in required", and finds the sign-in endpoints itself.
2. Your browser opens `/oauth/authorize`. If you aren't logged in, you log in with your admin account. Then you click **Allow**.
3. The agent receives a token that acts as you. It lasts a day and renews itself for up to 90 days.

Only admin accounts can connect. Nothing is stored: tokens are signed with the app's existing `SESSION_SECRET`, so rotating that secret signs every agent out.

## What the agent gets

- **`get_app_guide`** (also available as the resource `envision://guide`): how the app works. It covers roles and portals, every admin page and the matching tools, domains, mentors, lab venues compared with judging venues, rounds, scoring, the leaderboard, and common jobs.
- **`get_overview`:** the state of the programme year: accounts, the live round, scoring progress, venues and settings.
- **`search_manual`:** answers "how do I … on the website?" from the same manual admins see at `/admin/manual`.
- **47 admin tools:** accounts, teams, mentors, domains, portal settings, timeline, guidelines, lab venues, judging venues and assignments, rounds, tie-break order, evaluators, scores, the leaderboard (`get_leaderboard`, and `preview_leaderboard` to rank by any mix of rounds) and programme years (`list_years`, `start_year`, `set_current_year`). They take team numbers, login IDs, room names and round names, not ids.

### Programme years

Every tool works on the **current** year unless you pass `year`, e.g. `"2026-27"`, exactly like the Year dropdown on the admin pages. So "show me last year's top 10" becomes `get_leaderboard` with `year: "2026-27"`. `start_year` creates the next year (copying themes, round templates, rooms, timeline and guidelines if wanted, and creating team and mentor logins); `set_current_year` switches everyone over.

Destructive tools (`delete_users`, `delete_round`, `delete_domain`, `set_current_year`) are flagged, and the instructions tell agents to confirm those and `start_year` first.

## Try

- "Which PoC teams in C30 haven't been scored yet?"
- "Put PoC presentation on the leaderboard and show me the top 10."
- "Add jury account jury03 for Ms Priya covering A11 and A21."
- "If we averaged Immediate Evaluation and PoC, who'd be in the top 5?"
- "Break PoC ties by Feasibility first, then Market Reliability."
- "Set up 2027-28 with 60 teams and these mentors: …"
- "How do I change a team's mentor on the website?"

## Code

- `app/api/mcp/route.ts`: the MCP endpoint
- `lib/mcp/`: the tools (`tools/`: judging, people, program, extras), the app guide (`guide.ts`), the server and its `year` argument (`server.ts`) and the sign-in logic (`oauth.ts`)
- `app/oauth/authorize/`: the sign-in page
- `app/api/oauth/*`: the sign-in endpoints
- `app/.well-known/*`: discovery
