import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { RecipeDraftContent, RecipeDraftType } from 'types'
import DraftAPI, { DRAFT_CONFLICT_CODE, DRAFT_LIMIT_CODE } from 'src/api/drafts'

export type DraftStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  // No signed-in user: autosave can't run (drafts are per-user), so instead of
  // firing a doomed save that surfaces as an alarming "Couldn't save draft"
  // error, we show calm "sign in to save" guidance. See DraftSaveStatus.
  | 'signed-out'

// How long after the last edit we wait before autosaving. Long enough that
// typing doesn't fire a request per keystroke, short enough that work isn't
// lost if the tab is closed soon after.
const AUTOSAVE_DELAY = 1500

// Per-field "does this hold real content?" predicates. The mapped type over
// Required<RecipeDraftContent> makes the enumeration exhaustive at compile
// time: adding a field to RecipeDraftContent breaks the build here until the
// field is classified, so new form fields can't be silently excluded from the
// draft-creation gate (which would resurrect the lost-pre-title-work bug for
// that field).
const isDraftableField: {
  [K in keyof Required<RecipeDraftContent>]: (
    value: RecipeDraftContent[K]
  ) => boolean
} = {
  title: v => !!v?.trim(),
  description: v => !!v?.trim(),
  servings: v => v != null,
  prepTime: v => v != null,
  cookTime: v => v != null,
  fridgeLife: v => !!v,
  freezerLife: v => !!v,
  ingredients: v => !!v?.length,
  instructions: v => !!v?.length,
  cuisine: v => !!v,
  mealTypes: v => !!v?.length,
  nutritionLabels: v => !!v?.length,
}

// Whether the form holds anything worth persisting as a brand-new draft: any
// content field differing from its fresh-form default. Used as the autosave
// `canCreate` gate — an all-default form never creates a draft (no throwaway
// drafts from landing on the page), but any real entry does, title or not.
// Previously the gate was title-only, which silently lost pre-title work
// (ingredients/description/etc. entered before naming the recipe were never
// autosaved); the Drafts UI already renders title-less drafts as
// "Untitled draft".
export function hasDraftableContent(content: RecipeDraftContent): boolean {
  return (
    Object.keys(isDraftableField) as (keyof RecipeDraftContent)[]
  ).some(key =>
    (isDraftableField[key] as (v: RecipeDraftContent[typeof key]) => boolean)(
      content[key]
    )
  )
}

// The server rejects a new draft past the per-user cap with a 409 + this code.
function isDraftLimitError(err: unknown): boolean {
  return (
    axios.isAxiosError(err) &&
    err.response?.status === 409 &&
    (err.response.data as { code?: string } | undefined)?.code ===
      DRAFT_LIMIT_CODE
  )
}

// The server rejects an update whose base `updatedAt` no longer matches the
// stored draft (another tab/session saved on top of it) with a 409 + this code.
function isDraftConflictError(err: unknown): boolean {
  return (
    axios.isAxiosError(err) &&
    err.response?.status === 409 &&
    (err.response.data as { code?: string } | undefined)?.code ===
      DRAFT_CONFLICT_CODE
  )
}

// The server returns 404 from PUT /drafts/:id when the draft the autosave is
// updating no longer exists — it was deleted elsewhere (another tab's Drafts
// list, or the POST 25-cap trim evicting the oldest draft) while this tab held
// it open. Distinct from a 409 conflict: the draft is *gone*, not merely newer,
// so the recovery is to re-create a fresh draft on the next edit rather than to
// reload. Only ever seen on the update (id) path; a create never 404s.
function isDraftDeletedError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404
}

type Params = {
  // Serializable draft content derived from the form state (no image).
  content: RecipeDraftContent
  // Autosave only runs when true: create-mode, and after any resume-hydration
  // has finished. The first time this flips true the *current* content becomes
  // the saved baseline (so resuming a draft, or landing on an empty form,
  // doesn't immediately fire a redundant save).
  enabled: boolean
  // Whether a user is currently signed in. Drafts are per-user and the API
  // no-ops without a UID, so when this is false we never attempt a save and
  // surface calm "sign in to save drafts" copy instead of a scary error badge.
  isSignedIn: boolean
  // Whether a brand-new draft may be created for the current content. Gated on
  // the form holding any real content (see hasDraftableContent), so an
  // all-default form doesn't spawn a throwaway draft. Only governs creation —
  // an existing draft (draftId set) is always updated, so clearing fields
  // still persists.
  canCreate: boolean
  // The current draft's id, or null until the first save creates one.
  draftId: string | null
  // The `updatedAt` of the draft version currently on screen — set alongside
  // `draftId` by the caller (on resume-load, or from the create response).
  // Sent as the update precondition; only re-synced when `draftId` itself
  // changes; a save response bumps the hook's own internal copy in between; see
  // the effect below.
  draftUpdatedAt: string | null
  // Called once with the created draft after the first successful save so the
  // caller can adopt the new id (and reflect it in the URL).
  onDraftCreated: (draft: RecipeDraftType) => void
  // Called when creation is rejected because the user is at their draft cap,
  // with the server's message. The caller surfaces it (e.g. a toast).
  onLimitReached?: (message: string) => void
  // Called when an update is rejected because another tab/session saved newer
  // content first (the stored `updatedAt` moved since this draft was loaded).
  // Autosave stops retrying for the rest of the session; the caller should
  // tell the user to reload the page to see the latest version.
  onConflict?: (message: string) => void
  // Called when an update 404s because the draft was deleted elsewhere while
  // open here (another tab's Drafts list, or the per-user cap trim). The caller
  // must drop the now-dead `draftId`/`draftUpdatedAt` it owns (and any URL
  // param) so the next edit re-creates a fresh draft instead of retrying the
  // doomed PUT; it should also surface the message. See the 404 branch below.
  onDeletedElsewhere?: (message: string) => void
}

type DraftAutosave = {
  status: DraftStatus
  // Deletes the current draft and disables further autosave. Call after the
  // recipe is published so the now-redundant draft is cleaned up and the
  // unmount flush can't recreate it.
  clearDraft: () => Promise<void>
}

export function useDraftAutosave({
  content,
  enabled,
  isSignedIn,
  canCreate,
  draftId,
  draftUpdatedAt,
  onDraftCreated,
  onLimitReached,
  onConflict,
  onDeletedElsewhere,
}: Params): DraftAutosave {
  const [status, setStatus] = useState<DraftStatus>('idle')

  // Latest values mirrored into refs so the debounce timer, unmount flush and
  // unload flush read current data without being part of their dependency lists.
  const contentRef = useRef(content)
  const canCreateRef = useRef(canCreate)
  const draftIdRef = useRef(draftId)
  const enabledRef = useRef(enabled)
  const isSignedInRef = useRef(isSignedIn)
  contentRef.current = content
  canCreateRef.current = canCreate
  draftIdRef.current = draftId
  enabledRef.current = enabled
  isSignedInRef.current = isSignedIn

  // The `updatedAt` this hook will send as the next update's precondition.
  // Unlike the refs above, this is deliberately NOT mirrored from the
  // `draftUpdatedAt` prop on every render — a successful update bumps it
  // in-place (see saveNow) from the server's response, and re-mirroring the
  // prop on every keystroke-driven render would clobber that with the stale
  // value the caller last knew about. It re-syncs only when the prop itself
  // changes (or the draft does): the caller sets `draftUpdatedAt` exactly when
  // it adopts a fresh server-returned version (resume-hydration, or the create
  // response), so a prop *change* is always authoritative — while keystroke
  // renders leave the prop identity untouched and so never re-fire this
  // effect. `draftUpdatedAt` must be in the deps: when the page mounts with
  // `?draftId` already in the URL (resuming from the drafts list, or
  // refreshing a resumed draft), `draftId` never changes after mount — the
  // hydrated `updatedAt` arrives via this prop alone, and syncing only on
  // `draftId` left the ref stuck at null, so every autosave sent an empty
  // precondition and 409'd (found in V8's live verification).
  const updatedAtRef = useRef(draftUpdatedAt)
  useEffect(() => {
    updatedAtRef.current = draftUpdatedAt
  }, [draftId, draftUpdatedAt])

  // Serialized snapshot of the content we last persisted, so a save is skipped
  // when nothing actually changed.
  const lastSavedRef = useRef<string | null>(null)
  // Tracks the enabled edge so we can re-establish the baseline each time
  // autosave (re)activates — on mount, and again after a resume re-hydrates the
  // form — without ever treating freshly loaded content as an unsaved edit.
  const prevEnabledRef = useRef(false)
  // Set once the recipe is published: stops the unmount flush from recreating
  // the draft we just deleted.
  const disabledRef = useRef(false)
  // True while a save request is in flight. Prevents a fast typist from firing
  // a second createDraft (→ duplicate drafts) before the first resolves; the
  // finally block re-runs once for any edits made during the request.
  const inFlightRef = useRef(false)
  // Set once the server rejects creation at the draft cap. Stops further create
  // attempts this session so we don't fire a failing POST on every keystroke.
  const capReachedRef = useRef(false)
  // Set once an update 409s as a conflict (another tab/session saved newer
  // content). Stops further autosave attempts against this draft — retrying
  // would just 409 again on the same stale `updatedAtRef` — until the page is
  // reloaded to pick up the latest version.
  const conflictRef = useRef(false)
  const onDraftCreatedRef = useRef(onDraftCreated)
  const onLimitReachedRef = useRef(onLimitReached)
  const onConflictRef = useRef(onConflict)
  const onDeletedElsewhereRef = useRef(onDeletedElsewhere)
  onDraftCreatedRef.current = onDraftCreated
  onLimitReachedRef.current = onLimitReached
  onConflictRef.current = onConflict
  onDeletedElsewhereRef.current = onDeletedElsewhere

  const saveNow = async () => {
    // `enabled` is false in edit mode (and before a resume finishes hydrating);
    // never persist a draft then — most importantly, the unmount flush must not
    // create a draft out of a recipe the user was only editing. `isSignedIn`
    // guards the same flushes from firing a doomed (UID-less) save that the API
    // would no-op into a false 'error'.
    if (
      !enabledRef.current ||
      disabledRef.current ||
      inFlightRef.current ||
      !isSignedInRef.current
    )
      return
    const snapshot = JSON.stringify(contentRef.current)
    if (snapshot === lastSavedRef.current) return
    const id = draftIdRef.current
    // Creating a new draft requires draftable content (canCreate) and that
    // we're not already at the cap. Updates to an existing draft are always
    // allowed, unless a prior update already hit a version conflict.
    if (!id && (!canCreateRef.current || capReachedRef.current)) return
    if (id && conflictRef.current) return
    inFlightRef.current = true
    try {
      setStatus('saving')
      let persisted = false
      if (id) {
        const updated = await DraftAPI.updateDraft(
          id,
          contentRef.current,
          updatedAtRef.current ?? ''
        )
        persisted = !!updated
        if (updated) {
          updatedAtRef.current = updated.updatedAt
        }
      } else {
        const created = await DraftAPI.createDraft(contentRef.current)
        if (created) {
          // A publish (clearDraft) can land while this create is in flight, when
          // there's no id yet for clearDraft to delete. If that happened, this
          // draft is now redundant — delete it instead of adopting it, so the
          // published recipe doesn't leave an orphaned draft behind.
          if (disabledRef.current) {
            void DraftAPI.deleteDraft(created._id).catch(err =>
              console.error('Failed to delete draft created during publish:', err)
            )
            return
          }
          // Adopt the id (and its version) immediately so a save that fires
          // before the parent re-renders updates this draft instead of
          // creating a second one.
          draftIdRef.current = created._id
          updatedAtRef.current = created.updatedAt
          onDraftCreatedRef.current(created)
          persisted = true
        }
      }
      if (persisted) {
        lastSavedRef.current = snapshot
        setStatus('saved')
      } else {
        // A null result means the request never went out (e.g. no auth), so the
        // draft was NOT saved. Surface it rather than falsely showing "saved",
        // and leave the baseline untouched so a later edit retries.
        setStatus('error')
      }
    } catch (err) {
      if (isDraftLimitError(err)) {
        // At the per-user cap. Stop trying to create new drafts this session and
        // let the caller tell the user (with the server's message) to free space.
        capReachedRef.current = true
        const message =
          (axios.isAxiosError(err) &&
            (err.response?.data as { error?: string } | undefined)?.error) ||
          'You have too many saved drafts. Delete some to start a new one.'
        onLimitReachedRef.current?.(message)
        setStatus('error')
      } else if (isDraftConflictError(err)) {
        // Another tab/session saved on top of this draft since it was loaded.
        // Stop autosaving so we don't keep clobbering (or 409ing against) it;
        // the caller tells the user to reload for the latest version.
        conflictRef.current = true
        const message =
          (axios.isAxiosError(err) &&
            (err.response?.data as { error?: string } | undefined)?.error) ||
          'This draft was updated elsewhere. Reload the page to see the latest version.'
        onConflictRef.current?.(message)
        setStatus('error')
      } else if (isDraftDeletedError(err)) {
        // The draft we were updating is gone (deleted elsewhere, or evicted by
        // the per-user cap trim). Drop the dead id + version so the flush/unmount
        // paths (which read these refs) can't keep resurrecting the doomed PUT,
        // and so the NEXT edit re-creates a fresh draft via the createDraft path
        // — autosave's prime directive is never to lose active work. The caller
        // owns the real `draftId` (prop-mirrored into draftIdRef every render),
        // so it must null its copy too or the mirror would restore the dead id;
        // onDeletedElsewhere hands it that job (and surfaces the message). We do
        // NOT re-create now — that happens naturally on the next edit/debounce
        // tick — and reset to a calm 'idle' badge rather than a stuck 'error'.
        draftIdRef.current = null
        updatedAtRef.current = null
        onDeletedElsewhereRef.current?.(
          'This draft was deleted elsewhere — your edits here will be saved as a new draft.'
        )
        setStatus('idle')
      } else {
        console.error('Draft autosave failed:', err)
        setStatus('error')
      }
    } finally {
      inFlightRef.current = false
      // Re-run only if new edits arrived while this save was in flight. Compare
      // against the snapshot we just attempted (not the saved baseline): a
      // non-persisting result leaves the baseline stale, and comparing to it
      // would spin in a tight retry loop.
      if (
        !disabledRef.current &&
        JSON.stringify(contentRef.current) !== snapshot
      ) {
        void saveNow()
      }
    }
  }

  // Debounced autosave on content changes.
  useEffect(() => {
    if (!enabled) {
      prevEnabledRef.current = false
      return
    }
    // Just (re)enabled — on mount, or after a resume loaded a draft into the
    // form. Treat whatever is on screen as the saved baseline rather than
    // saving it back.
    if (!prevEnabledRef.current) {
      prevEnabledRef.current = true
      lastSavedRef.current = JSON.stringify(content)
      return
    }
    if (JSON.stringify(content) === lastSavedRef.current) return
    // No signed-in user: a save can't happen. Once the user has typed anything
    // worth saving (draftable content, or an existing draft), show calm
    // "sign in to save" guidance rather than scheduling a save that would fail.
    if (!isSignedIn) {
      if (draftId || canCreate) setStatus('signed-out')
      return
    }
    if (!draftId && (!canCreate || capReachedRef.current)) return
    // Warm the cached ID token so the unload flush can authenticate its
    // keepalive fetch even if this debounced save never fires (tab closed first).
    DraftAPI.warmAuth()
    const timer = setTimeout(saveNow, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, enabled, draftId, canCreate, isSignedIn])

  // Flush pending (debounced) changes when leaving the page mid-edit. saveNow
  // no-ops when autosave isn't enabled, so this is safe in edit mode.
  useEffect(() => {
    return () => {
      void saveNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Flush unsaved work on a *hard* leave — refresh, tab/window close, or
  // navigating away entirely. The unmount flush above only covers in-app (SPA)
  // navigation; a hard unload tears the component down without running React
  // cleanup, and even if it did, an async axios save wouldn't complete before
  // the page dies. So this fires a synchronous keepalive save instead (see
  // DraftAPI.flushDraftKeepalive). Registered as both `beforeunload` (desktop
  // refresh/close) and `pagehide` (the reliable mobile/bfcache signal); a guard
  // prevents the two firing a duplicate flush for the same unload.
  useEffect(() => {
    let flushed = false
    const flush = () => {
      if (flushed) return
      // Nothing to do without a live create-mode form and a signed-in user.
      if (!enabledRef.current || disabledRef.current || !isSignedInRef.current)
        return
      if (conflictRef.current) return
      const id = draftIdRef.current
      const dirty = JSON.stringify(contentRef.current) !== lastSavedRef.current
      // No-op when there's nothing pending: no unsaved edits and no save
      // currently in flight (an in-flight axios save may not survive the unload,
      // so we still flush to guarantee it lands).
      if (!dirty && !inFlightRef.current) return
      if (!id) {
        // Creating a new draft: needs draftable content and headroom under the
        // cap. Skip if a create is already in flight — letting the keepalive
        // create fire too would risk a duplicate draft.
        if (!canCreateRef.current || capReachedRef.current || inFlightRef.current)
          return
      }
      flushed = DraftAPI.flushDraftKeepalive(
        id,
        contentRef.current,
        updatedAtRef.current ?? ''
      )
    }
    // A bfcache restore reuses the same page; allow a later unload to flush again.
    const reset = () => {
      flushed = false
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    window.addEventListener('pageshow', reset)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('pageshow', reset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearDraft = async () => {
    disabledRef.current = true
    const id = draftIdRef.current
    if (!id) return
    try {
      await DraftAPI.deleteDraft(id)
    } catch (err) {
      console.error('Failed to delete draft after publish:', err)
    }
  }

  return { status, clearDraft }
}
