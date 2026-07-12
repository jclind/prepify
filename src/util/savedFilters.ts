// Tiny localStorage store for named admin filter presets. Per-browser only (no
// backend) — presets don't follow an admin across devices, which is fine for a
// small internal tool. Keyed by a page id ('reports' | 'audit') so each queue
// keeps its own list. The filter payload is whatever JSON-serializable shape the
// page uses for its filter state.

export interface SavedFilter<F> {
  name: string
  filter: F
}

const KEY_PREFIX = 'prepify.admin.savedFilters.'

// All reads/writes are defensive: a corrupt or unavailable localStorage (e.g.
// privacy mode) degrades to "no saved filters" rather than throwing.
export function getSavedFilters<F>(page: string): SavedFilter<F>[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + page)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Save (or overwrite, by name) a preset and return the updated list. An empty
// name is ignored.
export function saveFilter<F>(page: string, name: string, filter: F): SavedFilter<F>[] {
  const trimmed = name.trim()
  if (!trimmed) return getSavedFilters<F>(page)
  const others = getSavedFilters<F>(page).filter(f => f.name !== trimmed)
  const next = [...others, { name: trimmed, filter }]
  persist(page, next)
  return next
}

export function deleteFilter<F>(page: string, name: string): SavedFilter<F>[] {
  const next = getSavedFilters<F>(page).filter(f => f.name !== name)
  persist(page, next)
  return next
}

function persist<F>(page: string, filters: SavedFilter<F>[]) {
  try {
    localStorage.setItem(KEY_PREFIX + page, JSON.stringify(filters))
  } catch {
    // Best-effort: if we can't write (quota / privacy mode), the in-memory list
    // the caller holds still reflects the change for this session.
  }
}
