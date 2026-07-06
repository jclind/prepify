---
name: worktree-land
description: Land the current session's PR — verify it's open + CI-green + mergeable, merge it into development (merge commit), sync the main checkout's development, update the backlog docs, and tear down the worktree/branch. Use when the user types /worktree-land, or says "merge this and tear down", "land this PR", "merge, update docs, and clean up", "make sure the PR passes then merge and sync development".
---

# Land a PR and tear down the worktree

Bookend to `worktree-create`. Takes the work from an open PR to fully merged,
documented, and cleaned up, matching this repo's established convention (see the
`docs/BACKLOG_ROADMAP.md` status log for how S1–S5 landed).

The **default flow is the whole thing**. If the user only asks for part of it
(e.g. "just merge, don't tear down yet"), do that part and stop. Teardown is
conditional — skip it if there's no worktree/PR to remove.

## Preconditions

- There must be an open PR for the current branch. Find it:
  `gh pr view --json number,state,mergeStateStatus,mergeable,headRefName,baseRefName`
  (run with no arg from inside the worktree — `gh` infers the PR from the branch).
  If there's no PR, tell the user and stop (offer to open one).
- Know the **base** branch (almost always `development`) — read `baseRefName`.

## Steps

### 1. Verify the PR is landable

```bash
gh pr view <#> --json number,title,state,mergeStateStatus,mergeable,headRefName,baseRefName
gh pr checks <#>
```

**Do not merge unless** `state=OPEN`, `mergeable=MERGEABLE`,
`mergeStateStatus=CLEAN`, and every required check is `pass`. If checks are still
running, wait and re-poll (a slow E2e/Cypress run is normal). If a check is
genuinely failing or the PR is `DIRTY`/`CONFLICTING`, **stop and report** — don't
merge. A `DIRTY` PR usually means the base moved and the branch needs a rebase to
clear a `BACKLOG_ROADMAP.md` chokepoint conflict; that also silently suppresses
the `pull_request` CI workflow until cleared.

### 2. Confirm merge authorization

Merging is outward-facing and hard to reverse. Unless the user's current message
already told you to merge (e.g. "merge and tear down", "land it"), **ask first**
and stop here until they confirm.

### 3. Merge (merge commit)

```bash
gh pr merge <#> --merge      # merge-commit convention, NOT squash/rebase
```

Then confirm the merge landed:
`git -C <MAIN> fetch origin <base> -q && git -C <MAIN> log origin/<base> --oneline -3`
(where `<MAIN>` is the main checkout — `git worktree list` first entry).

### 4. Delete the merged remote branch

`gh pr merge` here does not pass `--delete-branch`, so remove it explicitly:

```bash
git push origin --delete <headRefName>
```

### 5. Sync the main checkout's `development`

Switch the **main checkout** (not the worktree) to `development` and reconcile
with origin:

```bash
git -C <MAIN> checkout development -q
git -C <MAIN> fetch origin development -q
```

Then check for divergence: `git -C <MAIN> log --oneline origin/development..development`
lists local-only commits. In this repo those are almost always **another
session's board commits** (a claim / PR-open flip kept local until push) — do NOT
discard them. Rebase them onto the freshly-merged origin:

```bash
git -C <MAIN> rebase origin/development
```

If a genuine `BACKLOG_ROADMAP.md` conflict surfaces during the rebase, resolve it
by keeping BOTH sides' board rows/log entries (they edit different tracks), then
`git rebase --continue`. If there's no divergence, a fast-forward pull is fine.

### 6. Update the backlog docs (on `development`, in the main checkout)

Two files, matching the pattern the prior tracks used:

**`docs/BACKLOG_ROADMAP.md`:**
- Flip the track's board row from `[P]` to `` `[x]` [#<PR>](url) (<merge-date>) ``
  and change the last board column to `**merged**` (+ a short note if the PR
  folded in anything out-of-scope).
- Append a dated entry to the **status log** at the bottom: what merged, the key
  behaviour it added/fixed, how it was verified, any folded-in siblings, and any
  follow-ups still filed-not-fixed. Use the real merge date (today).

**`docs/BACKLOG.md`:**
- Tick any `[ ]`/`[~]` line items this PR resolved to `[x]`, prepending
  `*(fixed in [#<PR>](url), <track>: …)*` like the existing `[x]` items. Grep the
  file for the route/symbol names in the diff to find them; not every PR has a
  matching line item (some are roadmap-only).

Get dates right: the status log records real calendar dates — use today's.

### 7. Commit the docs and push

```bash
git -C <MAIN> add docs/BACKLOG_ROADMAP.md docs/BACKLOG.md
git -C <MAIN> commit -m "docs(backlog): flip <track> to [x] (merged #<PR>)…"
git -C <MAIN> push origin development
```

Confirm sync: `git -C <MAIN> status -sb | head -1` should show `...origin/development`
with no ahead/behind. Pushing `development` also publishes any concurrent
session's local board commits that step 5 rebased on — that's expected and
consistent with how the other tracks' board commits reached origin.

### 8. Tear down the worktree

Only if the session is in a worktree for this PR. First verify it's safe:

```bash
git status -sb                                   # clean tree?
git log --oneline origin/development..HEAD       # empty ⇒ all commits are merged
```

If both are clean, remove it with the **ExitWorktree** tool
(`action: "remove"`). It will report "Discarded N commits" — that's benign here:
those commits are preserved inside the merge commit on `development`; the branch
copy is just redundant now. (You'll need `discard_changes: true` for that reason.)
If the tree is NOT clean or has unmerged commits, stop and ask — don't discard
real work.

### 9. Report

Summarize: PR merged (+ merge SHA), remote branch deleted, `development` synced
(ahead/behind 0/0), which docs lines flipped, worktree removed. Note any other
worktrees left running (e.g. a concurrent lane) so the user knows they're
untouched.

## Notes

- Merge strategy is **merge commit** (`--merge`), never squash/rebase — the log
  keeps `Merge pull request #NNN …` entries.
- All board/doc changes land **on `development` in the main checkout**, never on
  the lane branch — code branches stay code-only.
- Never discard another session's local board commits during the step-5 rebase;
  they're how concurrent lanes stay visible.
