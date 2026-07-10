import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { RecipeDraftContent, RecipeDraftType } from 'types'
import DraftAPI, { DRAFT_LIMIT_CODE } from 'src/api/drafts'

export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

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

type Params = {
  // Serializable draft content derived from the form state (no image).
  content: RecipeDraftContent
  // Autosave only runs when true: create-mode, and after any resume-hydration
  // has finished. The first time this flips true the *current* content becomes
  // the saved baseline (so resuming a draft, or landing on an empty form,
  // doesn't immediately fire a redundant save).
  enabled: boolean
  // Whether a brand-new draft may be created for the current content. Gated on
  // the form holding any real content (see hasDraftableContent), so an
  // all-default form doesn't spawn a throwaway draft. Only governs creation —
  // an existing draft (draftId set) is always updated, so clearing fields
  // still persists.
  canCreate: boolean
  // The current draft's id, or null until the first save creates one.
  draftId: string | null
  // Called once with the created draft after the first successful save so the
  // caller can adopt the new id (and reflect it in the URL).
  onDraftCreated: (draft: RecipeDraftType) => void
  // Called when creation is rejected because the user is at their draft cap,
  // with the server's message. The caller surfaces it (e.g. a toast).
  onLimitReached?: (message: string) => void
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
  canCreate,
  draftId,
  onDraftCreated,
  onLimitReached,
}: Params): DraftAutosave {
  const [status, setStatus] = useState<DraftStatus>('idle')

  // Latest values mirrored into refs so the debounce timer and unmount flush
  // read current data without being part of their dependency lists.
  const contentRef = useRef(content)
  const canCreateRef = useRef(canCreate)
  const draftIdRef = useRef(draftId)
  const enabledRef = useRef(enabled)
  contentRef.current = content
  canCreateRef.current = canCreate
  draftIdRef.current = draftId
  enabledRef.current = enabled

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
  const onDraftCreatedRef = useRef(onDraftCreated)
  const onLimitReachedRef = useRef(onLimitReached)
  onDraftCreatedRef.current = onDraftCreated
  onLimitReachedRef.current = onLimitReached

  const saveNow = async () => {
    // `enabled` is false in edit mode (and before a resume finishes hydrating);
    // never persist a draft then — most importantly, the unmount flush must not
    // create a draft out of a recipe the user was only editing.
    if (!enabledRef.current || disabledRef.current || inFlightRef.current) return
    const snapshot = JSON.stringify(contentRef.current)
    if (snapshot === lastSavedRef.current) return
    const id = draftIdRef.current
    // Creating a new draft requires draftable content (canCreate) and that
    // we're not already at the cap. Updates to an existing draft are always
    // allowed.
    if (!id && (!canCreateRef.current || capReachedRef.current)) return
    inFlightRef.current = true
    try {
      setStatus('saving')
      let persisted = false
      if (id) {
        const updated = await DraftAPI.updateDraft(id, contentRef.current)
        persisted = !!updated
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
          // Adopt the id immediately so a save that fires before the parent
          // re-renders updates this draft instead of creating a second one.
          draftIdRef.current = created._id
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
      } else {
        console.error('Draft autosave failed:', err)
      }
      setStatus('error')
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
    if (!draftId && (!canCreate || capReachedRef.current)) return
    const timer = setTimeout(saveNow, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, enabled, draftId, canCreate])

  // Flush pending (debounced) changes when leaving the page mid-edit. saveNow
  // no-ops when autosave isn't enabled, so this is safe in edit mode.
  useEffect(() => {
    return () => {
      void saveNow()
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
