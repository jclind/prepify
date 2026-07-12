---
name: worktree-create
description: Create an isolated dev worktree for a new task off the latest development branch, import env vars from the main repo, and boot the client + server on free ports (never 3000/4000) so the main stack keeps running. Use when the user types /worktree-create <goal>, or says "start a worktree", "spin up a worktree for X", "make a worktree and run it".
---

# Create a working worktree (env + dual ports)

Automates the full setup for starting work on a new task in an isolated git
worktree of Prepify. Given a **goal** (the user's argument), this:

1. Creates a worktree off the **latest `development`** branch.
2. Copies the (gitignored) env files from the main repo into the worktree.
3. Picks two **free** ports — client (never 3000) and server (never 4000) — and
   wires them together (`VITE_API_URL`, server `PORT`, CORS `FRONTEND_URLS`).
4. Installs deps and starts both services in the background, then health-checks.

The **goal** is whatever the user passed after the command. Use it for the
worktree name and as the stated objective of the session.

## Preconditions

- Run this from the **main checkout**, not from inside an existing worktree.
  `EnterWorktree`'s create-by-name mode refuses to nest. If the current dir is
  already under `.claude/worktrees/`, tell the user to run it from the main repo
  (or switch back first) and stop.
- Must be in the git repo.

## Steps

### 1. Resolve paths and the latest development base

```bash
# Main working tree is the first entry of `git worktree list`.
MAIN=$(git worktree list --porcelain | sed -n '1s/^worktree //p')
echo "main repo: $MAIN"
git -C "$MAIN" fetch origin development   # ensure origin/development is current
```

### 2. Derive a worktree name from the goal

Kebab-case the goal into a short slug and prefix `feat/`, e.g.
goal "overhaul account nav + saved page" → `feat/account-nav-saved-overhaul`.
Keep it under ~40 chars. Call this `<NAME>`.

### 3. Pick two free ports

Client port scans **3001–3010** (this range is already CORS-allowed in non-prod),
server port scans **4001–4010**. Capture the result for later steps.

```bash
free_port() { local p=$1 max=$2; while [ "$p" -le "$max" ]; do \
  lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 || { echo "$p"; return 0; }; \
  p=$((p+1)); done; return 1; }
CLIENT_PORT=$(free_port 3001 3010); SERVER_PORT=$(free_port 4001 4010)
echo "client=$CLIENT_PORT server=$SERVER_PORT"
```

If either comes back empty, all ports in the range are taken — report that and stop.

### 4. Create the worktree

Use the **EnterWorktree** tool with `name: <NAME>` (default `fresh` base ⇒ branches
from `origin/development`, which step 1 just refreshed). This switches the session
into the new worktree. Note the printed worktree path as `WT`.

### 5. Copy env files from the main repo

Copy each that exists — `.env`, `.env.test`, `.env.local`, `server/.env`:

```bash
for f in .env .env.test .env.local server/.env; do
  [ -f "$MAIN/$f" ] && cp "$MAIN/$f" "$WT/$f" && echo "copied $f"
done
```

(`.env.example` is checked in and already present — don't touch it.)

### 6. Wire the ports into the env files

- Root `$WT/.env`: set `VITE_API_URL=http://localhost:$SERVER_PORT`
- Server `$WT/server/.env`: set `PORT=$SERVER_PORT`, and prepend
  `http://localhost:$CLIENT_PORT` to the `FRONTEND_URLS` list (CORS).

Prefer the Edit tool on the specific lines. The keys already exist in both files;
replace the value rather than appending duplicates.

### 7. Install deps

Fresh worktrees have no `node_modules`. Install both (run in parallel):

```bash
npm install --prefix "$WT"
npm install --prefix "$WT/server"
```

### 8. Start both services in the background

Vite hardcodes 3000 in `vite.config.ts`, so override with `--port`. The server
reads `PORT` from its `.env`.

```bash
# server (run from $WT/server)
cd "$WT/server" && npm run dev
# client (run from $WT)
cd "$WT" && npm start -- --port $CLIENT_PORT
```

Launch each with `run_in_background: true`. Give them a few seconds, then verify:

```bash
curl -s -o /dev/null -w "server /health: %{http_code}\n" http://localhost:$SERVER_PORT/health
curl -s -o /dev/null -w "client root:  %{http_code}\n"  http://localhost:$CLIENT_PORT/
```

### 9. Report

Summarize: branch/worktree name + path, the goal, which env files were imported,
the chosen client/server ports, and the health-check results with the live URL
(`http://localhost:$CLIENT_PORT`). Flag that the copied env files contain real
secrets (gitignored, won't be committed). Then offer to start on the goal.

## Notes

- The copied env files are gitignored in this repo, so they won't be committed.
- Client stays in 3001–3010 so the existing non-prod CORS allowance covers it even
  before the `FRONTEND_URLS` edit; we still edit it to be explicit.
- If MongoDB/Firebase creds are missing from the copied `server/.env`, pages render
  but data fetches fail — check the server log shows "Connected to MongoDB".
