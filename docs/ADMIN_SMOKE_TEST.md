# Admin & Moderation — Manual Smoke Test

A quick end-to-end check of the **P0 + P1** admin functionality (admin identity,
reporting, soft-hide moderation, report queue). ~10 minutes. Check each box.

> Covers the build on `worktree-feat+admin-service`. Automated tests already pass
> (server 190 / frontend 204); this verifies the real user-facing flow.

## Setup

You'll want **two accounts**: one **admin**, one **normal** (a second browser /
incognito window is easiest).

- [ ] Start the API: `cd server && npm run dev` (port 4000)
- [ ] Start the client: `npm start` (port 3000)
- [ ] Grant your admin account the claim:
      `node server/scripts/setAdmin.js <your-uid-or-email>`
      → expect: `Granted admin for … (uid: …)`
- [ ] **Sign out and back in** on the admin account (the claim only appears on a
      fresh ID token)
- [ ] Have at least one published recipe that the **normal** user does NOT own,
      and at least one **review** on a recipe written by someone other than the
      reporter (so the report/takedown targets aren't your own content)

---

## P0 — Admin identity & route gating

- [x] **Logged out**, visit `/admin/reports` → redirected to home (`/`), no admin UI
- [x] As the **normal (non-admin)** user, visit `/admin/reports` → redirected to
      home, no admin UI
- [x] As the **admin** user, visit `/admin/reports` → the admin shell + Reports
      queue render
      <!-- FIXED: the :4000 server was the main tree's (no reports route) → 404.
               Worktree server is now on :4000. Re-test. -->
- [x] Refresh `/admin/reports` as admin → stays on the page (not bounced to home
      while auth loads)

---

## P1 — Reporting (as the normal user)

- [x] On a recipe you **don't own**, a **Report** button shows in the action bar
      <!-- FIXED: modal was rendering top-left (missing position:absolute). Re-test; it should now center. -->
- [x] On a recipe you **do own**, the Report button is **absent**
- [x] Click Report → modal opens → pick a reason, optionally add details →
      **Submit** → success toast ("our team will review this")
      <!-- FIXED: same :4000 wrong-server 404 as above; worktree server now on :4000. Re-test. -->
- [x] Report the **same recipe again** → error toast ("already have an open report") — the rate limit holds
      <!-- ! Works, however, earlier indication would be helpful I think. -->
- [x] On a **review written by someone else**, a **Report** link shows; on your **own** review it shows Edit/Delete instead (no Report)
      <!-- FIXED: ReviewsList wasn't passing recipeId to RecipeReview, so the button was hidden. Re-test. -->
- [x] Report that review → success toast
- [x] **Log out** → the Report affordances disappear entirely (reporting is logged-in only)

---

## P1 — Report queue (as the admin)

- [x] At `/admin/reports`, both reports you filed appear, newest first
- [x] The **open count** chip reflects the number of open reports
- [x] Each card shows: target type pill, reason, status, and an **inline preview** (recipe title + thumbnail, or the review text with the author's @username)
- [x] The status tabs (**Open / Resolved / Dismissed / All**) filter the list
- [x] Clicking the recipe title / "this recipe" link opens the recipe in a new view

---

## P1 — Moderation actions (as the admin)

### Recipe takedown

- [x] On the recipe report, click **Take down** → success toast; the card moves out of the **Open** tab (now Resolved)
- [x] As any user, the hidden recipe is now **gone from**:
  - [x] `/recipes` browse list
  - [x] search autocomplete (type its title)
  - [x] the homepage trending section
  - [x] its **direct URL** `/recipes/<id>` → shows "not found"
  - [x] the owner's **Saved** and **Your recipes** lists (if it was there)
  <!-- ! For one, when a recipe is deleted, it sucessfully deletes it from a user's page who saved it, but if you had left a review on that recipe it doesn't leave your account ratings list. Also, not sure if this is a bug or not, but when a review is taken down, the user who created it can still see it. But It's not seen by anyone else. I'm assuming that is intended. -->
- [x] In the admin queue, the recipe preview now shows a **Hidden** pill

### Review takedown

- [x] On the review report, click **Take down** → success toast
- [x] As any user, that review **no longer appears** in the recipe's reviews list
- [x] (DB spot-check, optional) the `ratings` doc still has its original
      `reviewText` — takedown sets `moderationHidden: true`, it doesn't erase text
      <!-- ! ah, I noted this above, so that is good. One question, how does it effect the value of the recipe rating? Like do we want a rating that has been moderated to still effect the score of the recipe? -->

### Resolve / Dismiss without takedown

- [x] File a fresh report, then click **Resolve** (or **Dismiss**) → it leaves the Open tab, and the reported content is **still visible** (resolve ≠ takedown)

---

## Reversibility (now a button in the admin queue)

Soft-hide is reversible — and there's now a **Restore** button in the Reports
dashboard on any currently-hidden item (no API call needed).

- [ ] In `/admin/reports`, find the taken-down recipe/review (its card shows a
      **Hidden** pill) → click **Restore** → success toast
- [ ] The recipe reappears in browse + at its direct URL; the review reappears in
      the recipe's reviews list

---

## Known P1 behavior (by design — not bugs)

- A hidden recipe is hidden from its **own author** too (Your recipes); and from
  the **Ratings** tab of anyone who rated it. A taken-down review is hidden from
  its author's account Ratings list.
- **A taken-down review's star rating no longer counts** toward the recipe's
  average (recomputed on takedown and on restore).
- An author can still see their **own** taken-down review on the recipe page's
  "Your Review" section (the account Ratings list hides it). Making this fully
  consistent + adding a "removed by moderators" notice is **deferred to P2**.
- `Saved recipes` total count may still include a saved-but-hidden recipe even
  though it's filtered from the page (minor pagination drift).

✅ All boxes checked = P0 + P1 working end to end.

---

# P2 — Extended Moderation (smoke test)

User suspension/ban, admin user search, and recipe feature/unpublish. Needs the
same admin account as above + a separate normal account.

## User search + status (as the admin)

- [ ] Go to `/admin/users` (new **Users** item in the admin sidebar). With an
      empty search you see a list of users; each row shows username, a status
      pill (active/suspended/banned), email, and counts
      (recipes · reviews · open reports)
- [ ] Search by **username prefix** → list narrows; search by the normal user's
      **email** → that single user resolves; clearing + Search lists all again
- [ ] On the normal user's row, set the dropdown to **Suspended**, type a reason,
      click **Apply** → success toast; the status pill flips to **suspended**

## Suspension enforcement (as the suspended normal user)

- [ ] Browsing/reading still works (recipes, reviews, profiles all load)
- [ ] Try to **create a recipe** → blocked with a clear toast naming the reason
- [ ] Try to **post or edit a review**, **save a recipe**, or **file a report** →
      each is blocked the same way
- [ ] **Deleting** your own recipe/review still works (deletes aren't punished)
- [ ] Back as admin, set the user to **Banned** → same write-block behavior, and
      the user is still logged in and can read (ban is a soft flag, no Firebase
      lockout)
- [ ] Set the user back to **Active** → their writes work again

## Status guards (as the admin)

- [ ] Your **own** row offers no way to suspend yourself (or returns an error if
      forced) — admins can't change their own status
- [ ] Changing **another admin's** status is refused

## Recipe feature / unpublish (as the admin, on a recipe page)

- [ ] On any recipe page you see an **Admin** control strip (non-admins never do)
- [ ] Click **Feature** → toast; the recipe now appears pinned at the **front of
      the homepage trending** row (even over higher-view recipes). **Unfeature**
      removes the pin
- [ ] Click **Unpublish** → toast; the recipe disappears from `/recipes`, search,
      trending, and its direct URL (like a takedown) — but it is **not** labeled a
      moderation takedown. **Publish** brings it back
- [ ] **Take down / Restore** from this strip behaves like the P1 report-queue
      takedown (soft-hide)

✅ All boxes checked = P2 working end to end.
