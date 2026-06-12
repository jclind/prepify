import React, { useState } from 'react'
import {
  SavedFilter,
  getSavedFilters,
  saveFilter,
  deleteFilter,
} from 'src/util/savedFilters'
import './SavedFilterBar.scss'

interface SavedFilterBarProps<F> {
  // Storage key for this queue ('reports' | 'audit').
  page: string
  // The page's current filter state, saved verbatim when the admin clicks Save.
  current: F
  // Apply a previously-saved preset back onto the page.
  onApply: (filter: F) => void
  // Whether the current state is the page's default (no point saving "nothing").
  canSave?: boolean
}

// A compact row of saved filter presets for the admin queues. Clicking a chip
// applies it; the × deletes it; "Save current" names and stores the live filter.
// Generic over the page's filter shape — it only round-trips the value.
function SavedFilterBar<F>({ page, current, onApply, canSave = true }: SavedFilterBarProps<F>) {
  const [filters, setFilters] = useState<SavedFilter<F>[]>(() => getSavedFilters<F>(page))

  const handleSave = () => {
    const name = window.prompt('Name this filter preset:')
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) return
    setFilters(saveFilter(page, trimmed, current))
  }

  const handleDelete = (name: string) => {
    setFilters(deleteFilter<F>(page, name))
  }

  return (
    <div className='saved-filter-bar'>
      {filters.length > 0 && (
        <div className='preset-chips'>
          {filters.map(f => (
            <span key={f.name} className='preset-chip'>
              <button
                type='button'
                className='preset-apply'
                onClick={() => onApply(f.filter)}
              >
                {f.name}
              </button>
              <button
                type='button'
                className='preset-delete'
                aria-label={`Delete preset ${f.name}`}
                onClick={() => handleDelete(f.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {canSave && (
        <button type='button' className='preset-save' onClick={handleSave}>
          + Save current
        </button>
      )}
    </div>
  )
}

export default SavedFilterBar
