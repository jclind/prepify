import React, { FC, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FiPlus, FiCheck } from 'react-icons/fi'
import CollectionsAPI from 'src/api/collections'
import RecipeAPI from 'src/api/recipes'
import { RecipeCollection } from 'types'

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
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  // Load the recipe's current membership so the right boxes start checked.
  useEffect(() => {
    let active = true
    RecipeAPI.getSavedRecipe(recipeId)
      .then(entry => {
        if (active) setSelected(new Set(entry?.collectionIds ?? []))
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
      toast.error('Could not update collections')
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
    try {
      const created = await CollectionsAPI.create(name)
      setNewName('')
      // Add the recipe to the freshly-created collection in the same gesture.
      const next = new Set(selected)
      next.add(created.id)
      await CollectionsAPI.setRecipeCollections(recipeId, [...next])
      setSelected(next)
      onMutated()
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Could not create collection')
    } finally {
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
        <span className='checkbox'>{saved && <FiCheck />}</span>
        <span className='name'>All saved</span>
      </button>

      <div className='collection-options'>
        {loading ? (
          <div className='popover-empty'>Loading…</div>
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
              <span className='checkbox'>{selected.has(c.id) && <FiCheck />}</span>
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
          className='create-btn'
          disabled={!newName.trim() || busy}
          aria-label='Create collection'
        >
          <FiPlus />
        </button>
      </form>
    </div>
  )
}

export default AddToCollectionPopover
