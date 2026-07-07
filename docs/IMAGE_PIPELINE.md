# Recipe image pipeline — responsive variants (I1) + uid re-key (I2)

How Prepify serves right-sized recipe images, and the **owner-run** steps to turn it
on and to roll out the uid-scoped Storage keying. Companion to the code:
`src/util/recipeImageVariants.ts` (URL derivation), `extensions/storage-resize-images.env`
(the extension config), the `srcset` wiring in `RecipeCard.tsx` + `SingleRecipe.tsx`,
and — for I2 — `src/api/recipes.ts` (`uploadRecipeImage`) + `storage.rules`.

Two owner-run rollouts live here: **I1** (install the resize extension + backfill +
flip the `srcset` flag — "Runbook — enabling it") and **I2** (deploy the uid-scoped
rules + migrate existing objects — "Runbook — I2 uid re-key rollout"). They're
independent but touch the same objects, so the I2 migration section notes where they
interlock (re-run the I1 backfill after moving originals).

## What it does

Recipe photos upload full-resolution to Firebase Storage, keyed by owner uid at
`recipeImages/{uid}/{uuid}` (BACKLOG I2). The Firebase **Resize Images** extension
(`storage-resize-images`) generates three WebP width variants next to each original
on upload — in the **same `{uid}/` directory**, so they inherit the owner prefix:

```
recipeImages/{uid}/{uuid}            (original, kept)
recipeImages/{uid}/{uuid}_400x400.webp   (variants, generated)
recipeImages/{uid}/{uuid}_800x800.webp
recipeImages/{uid}/{uuid}_1600x1600.webp
```

(The extension's `INCLUDE_PATH_LIST=/recipeImages` is a leading-segment match, so it
covers this nested path exactly as it did the old flat `recipeImages/{name}` key.)

The browse-grid card and the single-recipe hero then render a `srcset` over those
variants, so a phone downloads a ~40 KB WebP instead of the ~190 KB original — the
biggest remaining mobile-LCP lever after code-splitting.

### How the frontend builds variant URLs

`recipeImageVariantUrl()` takes the **stored original URL** and rewrites it to the
variant path, **deriving the bucket from the URL itself** (the catalog spans more
than one Storage bucket, so nothing is hardcoded). The variant URL is
**token-less** — it relies on the bucket's public-read rule
(`allow read: if true`), so it needs no per-object download token (each resized
object has its own token we couldn't derive anyway). Verified: token-less
`?alt=media` reads return `200` under the current rules.

### Two safety nets (why this is safe to ship before install)

1. **Feature flag `VITE_IMAGE_VARIANTS_ENABLED`** (default off). Until it's on, the
   components render **only the original** — no `srcset`, no variant requests, zero
   behaviour change. This is why the frontend merged ahead of the install.
2. **Per-image error fallback.** Even with the flag on, the original stays the
   `<img src>`; if a variant 404s (a legacy/un-backfilled image, or the brief
   window after an upload before the extension runs) the component drops `srcset`
   and shows the original. No broken images, ever.

So the merged code is inert until you (a) install the extension, (b) backfill, and
(c) flip the flag.

---

## Runbook — enabling it (owner)

> Requires the **Blaze** (pay-as-you-go) plan — the extension runs Cloud
> Functions. Real cost at Prepify's catalog size is a few cents/month; the
> exposure is theoretical runaway billing, so keep a budget alert on.

Do this **once per Firebase project** — dev (`prepify-dev-58579`) first, then prod.

### 1. Install the extension

The committed manifest (`firebase.json` + `extensions/storage-resize-images.env`)
pins the config, so a plain deploy applies it:

```bash
firebase use prepify-dev-58579          # then repeat the whole flow for prod
firebase deploy --only extensions        # reads firebase.json + the .env manifest
```

If the CLI reports a newer version than `@0.3.5`, take it and update the pin in
`firebase.json`. (Alternatively `firebase ext:install firebase/storage-resize-images`
walks the params interactively — the committed `.env` lists the exact answers.)

### 2. ⚠ VERIFY the variant naming matches the helper

This is the one assumption the frontend can't self-check. After the extension is
live, upload a test recipe image (or re-upload one), then list the bucket:

```bash
gsutil ls 'gs://<bucket>/recipeImages/**' | grep _400x400
```

Since I2, originals upload **without a file extension** — the object is
`recipeImages/{uid}/{uuid}` (a bare uuid, no `.jpg`). So confirm the generated
name is **`{uuid}_400x400.webp`**, e.g. an original
`recipeImages/ab12…/9f3c1d2e-…` yields `9f3c1d2e-…_400x400.webp`. The helper
splits the stem on the last `.`, so with no extension in the source name the
whole uuid is the stem — exactly what it expects. (If your extension version
instead names variants off the *content type* and injects an extension, e.g.
`9f3c1d2e-….jpeg_400x400.webp`, that's a one-line fix in
`recipeImageVariantUrl()`; the `RECIPE_IMAGE_VARIANT_WIDTHS` array and everything
else stay the same.)

### 3. Backfill existing images

New uploads are resized automatically. For images already in the bucket, run the
extension's backfill (the install flow offers "process existing images?", or use
the extension's `backfill` task). Note the **mixed-bucket** caveat: each install
only processes its own project's default bucket, so images whose stored URL points
at a *different* bucket won't have variants until that project is also set up — the
error fallback (safety net #2) covers them in the meantime.

### 4. Flip the flag on

Set the frontend build env and redeploy the client (Netlify):

```
VITE_IMAGE_VARIANTS_ENABLED=true
```

Then spot-check in the browser devtools **Network** tab: card/hero requests should
now be `*_800x800.webp` (or the DPR-appropriate width), not the extensionless
original object.

### Rollback

Set `VITE_IMAGE_VARIANTS_ENABLED=false` and redeploy the client — instantly back to
serving originals. The extension + variants can stay in place (harmless, unused).

---

## Runbook — I2 uid re-key rollout (owner)

I2 changed two coupled things that must go live **together**: the frontend now
uploads to `recipeImages/{uid}/{uuid}` (was `recipeImages/{filename}`), and
`storage.rules` now (a) allows owner-scoped writes to that uid path and (b) **denies**
writes to the old flat path. The merged code is inert on the current deployment until
the rules are deployed — verified live: a new-frontend upload to the uid path returns
**403 `storage/unauthorized`** under the still-deployed flat rules.

### ⚠ Ordering — rules and frontend ship together

Each half breaks the *other* half's uploads if it lands alone:

| live rules ↓ / live frontend → | old frontend (flat write) | new frontend (uid write) |
|---|---|---|
| **old rules** (deployed today) | ✅ works | ❌ 403 — uid path unmatched |
| **new rules** (this PR) | ❌ 403 — flat write denied | ✅ works |

So deploy `storage.rules` **and** the client in the same window. At beta traffic a
brief (seconds–minutes) window where image *uploads* fail is acceptable — reads are
unaffected and only the create/edit-recipe image step is touched. For
**zero-downtime**, first deploy a transitional rules file that allows writes to
*both* paths (keep the old flat `allow write: if request.auth != null && …` block
beside the new uid-scoped one), cut the frontend over, then deploy this PR's final
rules (flat writes denied) once no old clients remain.

### 1. Deploy the rules

```bash
firebase use prepify-dev-58579        # dev first
firebase deploy --only storage         # applies storage.rules
# smoke-test an upload on dev (step 3), then repeat for prod:
firebase use <prod-project>
firebase deploy --only storage
```

### 2. Migrate existing objects (flat → uid path)

Existing images live at `recipeImages/{filename}`; their download URLs are stored in
`recipes.recipeImage`. Until migrated, the **legacy read-only rule keeps them
rendering** (`match /recipeImages/{imageId} { allow read: if true }`), so this can run
lazily *after* the deploy. Write a one-off script modelled on the read-first ops
scripts in `server/scripts/` (e.g. `reconcileRatingAggregates.js` — dry-run by
default, `--apply` to write). Per recipe whose `recipeImage` is still a flat path:

1. Parse the bucket + object path from the stored URL with
   `server/util/firebaseStorage.js` `parseStorageUrl` — it decodes the full path and
   surfaces the bucket, which matters because the catalog is **mixed-bucket** (some
   URLs point at `prepify-9b974`, others at the dev/prod buckets). **Copy within the
   same bucket.**
2. Resolve the owner **uid** from `recipes.userId` (the field `addRecipe` stamps;
   fall back to `authorUsername` → `usernames` lookup for any legacy doc missing it).
3. `bucket.file(oldPath).copy('recipeImages/${uid}/${uuid}')` via the Admin SDK
   (bypasses rules), then `getDownloadURL` on the new object.
4. Update the recipe's `recipeImage` to the new URL. **Idempotent:** skip recipes
   whose `recipeImage` already decodes to a `recipeImages/{uid}/…` path.
5. Once verified, optionally delete the old flat object (or leave it for a later
   purge sweep — flat writes are denied, but the object stays public-read).

Then re-run the **I1 backfill** (§ "Backfill existing images") so the moved originals
get their `{uid}/`-directory variants (any variants generated at the old flat path
are now orphaned — regenerating at the new path is simplest).

### 3. Verify + finish

- Create a recipe with a photo through the deployed app; confirm the upload `200`s to
  `recipeImages/{uid}/{uuid}` (devtools **Network**, or
  `gsutil ls 'gs://<bucket>/recipeImages/**'`).
- Spot-check that a **pre-migration** recipe still renders (legacy read rule) and a
  **post-migration** one serves from the uid path.
- **Optional final tighten:** once every object is migrated *and* I1 variants are
  backfilled, drop the legacy `match /recipeImages/{imageId}` block so `recipeImages/*`
  is uid-scoped end to end.

---

## Notes & follow-ups

- **Hero `srcset` (C3 carry-over).** The SingleRecipe hero `srcset` that C3 deferred
  to I1 ships here — this is that item.
- **`sizes` accuracy.** Card `(max-width: 700px) 90vw, 300px`; hero
  `(max-width: 820px) 100vw, 400px` (the hero is a fixed 400px grid column ≥820px).
  These only steer variant *selection*, so approximate is fine; tune against real
  devices if desired.
- **Other image surfaces.** Home cards, the autocomplete thumb, and the admin
  report preview still render the original — intentionally out of scope (the board
  scoped I1 to the card + hero, the LCP surfaces). They can adopt `recipeImageSrcSet`
  later with no infra change.
- **Pairs with I2 (landed).** I2 re-keyed uploads to `recipeImages/{uid}/{uuid}` and
  tightened `storage.rules` to owner-scoped writes (`request.auth.uid == uid`). The
  resize config was kept compatible: `RESIZED_IMAGES_PATH` stays empty so variants
  land in the same `{uid}/` directory as their original (the derivation helper splits
  on the last `/`, so the deeper path just works; the two-segment read rule covers the
  variants). `INCLUDE_PATH_LIST=/recipeImages` is a leading-segment match, so it still
  catches the nested originals with no change. **Rolling it out** (deploy rules +
  migrate objects) is the "Runbook — I2 uid re-key rollout" section above.
