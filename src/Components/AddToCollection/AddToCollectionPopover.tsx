import { CheckIcon, PlusIcon } from 'src/Components/icons'
import React, { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import CollectionsAPI from 'src/api/collections'
import RecipeAPI from 'src/api/recipes'
import { RecipeCollection } from 'types'
import { COLLECTION_CREATE_ERROR } from 'src/util/toastMessages'

type Props = {
  recipeId: string
  // Collections come from the control's query; the popover toggles membership
  // and can create new folders, calling onMutated so caches (counts, saved
  // grid, saved-id list) refetch.
  collections: RecipeCollection[]
  // Master "All saved" state + toggle (saves when off, unsaves when on).
  saved: boolean
  onToggleSaved: () => void
  onMutated: () => void
}

const AddToCollectionPopover: FC<Props> = ({
  recipeId,
  collections,
  saved,
  onToggleSaved,
  onMutated,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  // Load the recipe's current membership so the right boxes start checked. If
  // this fails we MUST NOT fall through to an empty baseline with interactive
  // boxes: persist() sends the full membership set, so the first toggle from an
  // empty Set would silently wipe every collection the recipe is actually in.
  // Surface the error and block toggling instead.
  useEffect(() => {
    let active = true
    setLoadError(false)
    RecipeAPI.getSavedRecipe(recipeId)
      .then(entry => {
        if (active) setSelected(new Set(entry?.collectionIds ?? []))
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [recipeId])

  const persist = async (next: Set<string>) => {
    setBusy(true)
    const prev = selected
    setSelected(next) // optimistic
    try {
      await CollectionsAPI.setRecipeCollections(recipeId, [...next])
      onMutated()
    } catch {
      setSelected(prev) // roll back on failure
      toast.error('Could not update collections.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    persist(next)
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || busy) return
    setBusy(true)

    let created
    try {
      created = await CollectionsAPI.create(name)
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? COLLECTION_CREATE_ERROR)
      setBusy(false)
      return
    }

    // The collection now exists server-side. Filing the recipe into it is a
    // separate request that can fail on its own — but we must still surface the
    // new collection (onMutated refetches the list) so it can't become an
    // invisible orphan that a same-name retry would 409 against.
    setNewName('')
    const next = new Set(selected)
    next.add(created.id)
    try {
      await CollectionsAPI.setRecipeCollections(recipeId, [...next])
      setSelected(next)
    } catch {
      toast.error('Collection created, but the recipe couldn’t be added to it.')
    } finally {
      onMutated()
      setBusy(false)
    }
  }

  return (
    <div
      className='add-to-collection-popover'
      role='dialog'
      aria-label='Add to collection'
    >
      <div className='popover-title'>Save to</div>

      {/* Master row: the recipe's place in the saved list. Unchecking it
          unsaves (and drops every collection membership with it). */}
      <button
        type='button'
        className={`collection-option master ${saved ? 'checked' : ''}`}
        onClick={onToggleSaved}
        disabled={busy}
      >
        <span className='checkbox'>{saved && <CheckIcon />}</span>
        <span className='name'>All saved</span>
      </button>

      <div className='collection-options'>
        {loading ? (
          <div className='popover-empty'>Loading…</div>
        ) : loadError ? (
          <div className='popover-empty'>
            Couldn’t load this recipe’s collections. Close and reopen to try again.
          </div>
        ) : collections.length === 0 ? (
          <div className='popover-empty'>No collections yet — create one below.</div>
        ) : (
          collections.map(c => (
            <button
              key={c.id}
              type='button'
              className={`collection-option ${selected.has(c.id) ? 'checked' : ''}`}
              onClick={() => toggle(c.id)}
              disabled={busy}
            >
              <span className='checkbox'>{selected.has(c.id) && <CheckIcon />}</span>
              <span className='name'>{c.name}</span>
            </button>
          ))
        )}
      </div>

      <form
        className='new-collection-row'
        onSubmit={e => {
          e.preventDefault()
          handleCreate()
        }}
      >
        <input
          type='text'
          placeholder='New collection…'
          value={newName}
          maxLength={50}
          onChange={e => setNewName(e.target.value)}
        />
        <button
          type='submit'
          className='create-btn btn btn--primary btn--sm'
          disabled={!newName.trim() || busy}
          aria-label='Create collection'
        >
          <PlusIcon />
        </button>
      </form>
    </div>
  )
}

export default AddToCollectionPopover
