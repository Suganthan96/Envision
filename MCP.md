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
- **`get_overview`:** the current state of the whole programme.
- **43 admin tools:** accounts, teams, mentors, domains, portal settings, timeline, guidelines, lab venues, judging venues and assignments, rounds, evaluators, scores, and the leaderboard. They take team numbers, login IDs, room names and round names, not ids.

Destructive tools (`delete_users`, `delete_round`, `delete_domain`) are flagged, so agents ask first.

## Try

- "Which PoC teams in C30 haven't been scored yet?"
- "Put PoC presentation on the leaderboard and show me the top 10."
- "Add jury account jury03 for Ms Priya covering A11 and A21."

## Code

- `app/api/mcp/route.ts`: the MCP endpoint
- `lib/mcp/`: the tools, the app guide (`guide.ts`) and the sign-in logic (`oauth.ts`)
- `app/oauth/authorize/`: the sign-in page
- `app/api/oauth/*`: the sign-in endpoints
- `app/.well-known/*`: discovery
