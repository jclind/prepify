/**
 * savedFilters localStorage store: save (with overwrite-by-name), list, and
 * delete, plus graceful handling of corrupt storage.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  getSavedFilters,
  saveFilter,
  deleteFilter,
} from 'src/util/savedFilters'

type F = { status: string }

beforeEach(() => localStorage.clear())

describe('savedFilters', () => {
  it('starts empty', () => {
    expect(getSavedFilters<F>('reports')).toEqual([])
  })

  it('saves and lists a preset, round-tripping the filter payload', () => {
    saveFilter<F>('reports', 'Open only', { status: 'open' })
    const list = getSavedFilters<F>('reports')
    expect(list).toEqual([{ name: 'Open only', filter: { status: 'open' } }])
  })

  it('overwrites a preset with the same name', () => {
    saveFilter<F>('reports', 'preset', { status: 'open' })
    saveFilter<F>('reports', 'preset', { status: 'resolved' })
    const list = getSavedFilters<F>('reports')
    expect(list).toHaveLength(1)
    expect(list[0].filter).toEqual({ status: 'resolved' })
  })

  it('keeps each page id separate', () => {
    saveFilter<F>('reports', 'r', { status: 'open' })
    saveFilter<F>('audit', 'a', { status: 'x' })
    expect(getSavedFilters<F>('reports')).toHaveLength(1)
    expect(getSavedFilters<F>('audit')).toHaveLength(1)
  })

  it('ignores an empty name', () => {
    saveFilter<F>('reports', '   ', { status: 'open' })
    expect(getSavedFilters<F>('reports')).toEqual([])
  })

  it('deletes a preset by name', () => {
    saveFilter<F>('reports', 'one', { status: 'open' })
    saveFilter<F>('reports', 'two', { status: 'resolved' })
    const after = deleteFilter<F>('reports', 'one')
    expect(after.map(f => f.name)).toEqual(['two'])
  })

  it('degrades to empty on corrupt storage', () => {
    localStorage.setItem('prepify.admin.savedFilters.reports', '{not json')
    expect(getSavedFilters<F>('reports')).toEqual([])
  })
})
