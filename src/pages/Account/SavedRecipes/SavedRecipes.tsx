import React, { FC, useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FiPlus,
  FiFolderPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiGrid,
  FiBookmark,
  FiFolder,
} from 'react-icons/fi'
import { BiChevronDown } from 'react-icons/bi'
import RecipeCard from 'src/Components/RecipeCard/RecipeCard'
import EmptyState from 'src/Components/EmptyState/EmptyState'

import './SavedRecipes.scss'
import RecipeAPI from 'src/api/recipes'
import CollectionsAPI from 'src/api/collections'
import AuthAPI from 'src/api/auth'
import { RecipeType } from 'types'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'
import CollectionCard from './CollectionCard'

type SortOption = { value: string; label: string }

// Save-time orders ('newAdd'/'oldAdd') sort the saved entries; the rest are
// field sorts the server resolves from the recipe docs (see GET /getSavedRecipes).
const SORT_OPTIONS: SortOption[] = [
  { value: 'newAdd', label: 'Recently saved' },
  { value: 'oldAdd', label: 'Oldest saved' },
  { value: 'alpha', label: 'Title A–Z' },
  { value: 'rating', label: 'Top rated' },
  { value: 'timeShort', label: 'Quickest' },
  { value: 'timeLong', label: 'Longest' },
]

const PER_PAGE = 6

// Custom sort control (matches the Recipes page): a pill trigger that opens a
// styled menu. Closes on outside click / Escape.
const SortMenu: FC<{ sort: SortOption; onChange: (o: SortOption) => void }> = ({
  sort,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className='saved-sort' ref={ref}>
      <button
        type='button'
        className={`saved-sort__trigger ${open ? 'is-open' : ''}`}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        Sort: {sort.label}
        <BiChevronDown className='chev' />
      </button>
      {open && (
        <ul className='saved-sort__menu' role='listbox'>
          {SORT_OPTIONS.map(o => (
            <li key={o.value}>
              <button
                type='button'
                className={o.value === sort.value ? 'is-active' : ''}
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const SavedRecipes: FC = () => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()

  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)
  const [sort, setSort] = useState(SORT_OPTIONS[0])

  // null = the "All" view (the master saved list); otherwise a collection id.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // searchInput is what the user types; query is the debounced term that
  // actually drives the request, so we don't fire one per keystroke.
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: CollectionsAPI.list,
  })
  const activeCollection = collections.find(c => c.id === activeCollectionId) ?? null

  // Total saved count for the "All saved" tile, independent of the filtered
  // view. Shares the account-counts cache the account header already populates.
  const { data: counts } = useQuery({
    queryKey: ['account-counts', uid],
    queryFn: () => RecipeAPI.getAccountCounts(),
    enabled: !!uid,
  })
  const savedTotal = counts?.saved ?? null

  // A collection deleted elsewhere shouldn't strand the view on a dead filter.
  useEffect(() => {
    if (activeCollectionId && collections.length > 0 && !activeCollection) {
      setActiveCollectionId(null)
      setCurrPage(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCollectionId, activeCollection, collections.length])

  const { data, isLoading } = useQuery({
    queryKey: ['saved-recipes', sort.value, currPage, activeCollectionId, query],
    queryFn: () =>
      RecipeAPI.getSavedRecipes(
        currPage,
        PER_PAGE,
        sort.value,
        activeCollectionId ?? undefined,
        query || undefined
      ),
  })
  const showSkeleton = useDelayedLoading(isLoading)

  useEffect(() => {
    if (!data) return
    if (currPage === 0) {
      setRecipes([...data.recipes])
      setIsMoreRecipes(Number(data.totalCount) > data.recipes.length)
    } else {
      const updated = [...recipes, ...data.recipes]
      setRecipes(updated)
      setIsMoreRecipes(Number(data.totalCount) > updated.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const selectCollection = (id: string | null) => {
    setActiveCollectionId(id)
    setCurrPage(0)
    setRenaming(false)
  }
  const changeSort = (o: SortOption) => {
    setSort(o)
    setCurrPage(0)
  }
  const onSearchChange = (v: string) => {
    setSearchInput(v)
    setCurrPage(0)
  }
  const handleLoadMoreRecipes = () => setCurrPage(prev => prev + 1)

  // Refresh after a membership/collection change. Counts + covers always
  // refetch. The grid must refetch too — an unsave from the popover removes a
  // card even in the unfiltered "All saved" view — so reset to page 0 and
  // refetch unconditionally rather than only when a collection filter is active.
  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
    queryClient.invalidateQueries({ queryKey: ['account-counts', uid] })
    setCurrPage(0)
    queryClient.invalidateQueries({ queryKey: ['saved-recipes'] })
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || creating) return // guard against a double-submit firing two creates
    setCreating(true)
    try {
      const created = await CollectionsAPI.create(name)
      setNewName('')
      setCreatingNew(false)
      await queryClient.invalidateQueries({ queryKey: ['collections'] })
      selectCollection(created.id)
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Could not create collection')
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async () => {
    const name = renameValue.trim()
    if (!name || !activeCollection) return
    try {
      await CollectionsAPI.rename(activeCollection.id, name)
      setRenaming(false)
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Could not rename collection')
    }
  }

  const handleDelete = async () => {
    if (!activeCollection) return
    if (!window.confirm(`Delete "${activeCollection.name}"? The recipes stay saved.`)) {
      return
    }
    try {
      await CollectionsAPI.remove(activeCollection.id)
      await queryClient.invalidateQueries({ queryKey: ['collections'] })
      selectCollection(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Could not delete collection')
    }
  }

  const searching = query.length > 0
  // A first-time, totally empty Saved page (no saves, no collections, not
  // searching): drop the collections grid / search / subhead so the empty
  // state sits at the top like the other account tabs instead of below chrome.
  const blankSlate =
    !isLoading &&
    recipes.length === 0 &&
    !searching &&
    !activeCollection &&
    collections.length === 0

  // On the first load, hold an empty frame while a fast query settles so the
  // skeleton only shows for genuinely slow loads and the empty state never
  // flashes before data. Scoped to the initial load so paging never blanks the
  // already-rendered list.
  if (isLoading && !showSkeleton && recipes.length === 0) {
    return <div className='saved-recipes' />
  }

  return (
    <div className='saved-recipes'>
      {!blankSlate && (
        <>
      {/* Collections: All + each collection + a create affordance. */}
      <div className='saved-collections'>
        <CollectionCard
          label='All saved'
          count={savedTotal}
          cover={null}
          icon={<FiGrid />}
          active={activeCollectionId === null}
          onClick={() => selectCollection(null)}
        />
        {collections.map(c => (
          <CollectionCard
            key={c.id}
            label={c.name}
            count={c.count}
            cover={c.coverImage}
            active={activeCollectionId === c.id}
            onClick={() => selectCollection(c.id)}
          />
        ))}
        {creatingNew ? (
          <form
            className='collection-card collection-card--new is-form'
            onSubmit={e => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <input
              type='text'
              autoFocus
              placeholder='Collection name'
              value={newName}
              maxLength={50}
              onChange={e => setNewName(e.target.value)}
              onBlur={() => {
                if (!newName.trim()) setCreatingNew(false)
              }}
            />
            <button
              type='submit'
              className='new-submit'
              disabled={creating || !newName.trim()}
            >
              <FiPlus /> Create
            </button>
          </form>
        ) : (
          <button
            type='button'
            className='collection-card collection-card--new'
            onClick={() => setCreatingNew(true)}
            aria-label='New collection'
          >
            <FiFolderPlus /> New
          </button>
        )}
      </div>

      {/* Toolbar: full-width search + sort. */}
      <div className='saved-toolbar'>
        <div className='saved-search'>
          <FiSearch className='saved-search__icon' />
          <input
            type='text'
            placeholder={
              activeCollection
                ? `Search ${activeCollection.name}…`
                : 'Search saved…'
            }
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              type='button'
              className='saved-search__clear'
              aria-label='Clear search'
              onClick={() => onSearchChange('')}
            >
              <FiX />
            </button>
          )}
        </div>
        <SortMenu sort={sort} onChange={changeSort} />
      </div>

      {/* Subhead: current view + (for a collection) rename / delete. */}
      <div className='saved-subhead'>
        {renaming && activeCollection ? (
          <form
            className='saved-rename'
            onSubmit={e => {
              e.preventDefault()
              handleRename()
            }}
          >
            <input
              type='text'
              autoFocus
              value={renameValue}
              maxLength={50}
              onChange={e => setRenameValue(e.target.value)}
            />
            <button type='submit' className='btn-small'>Save</button>
            <button
              type='button'
              className='btn-small ghost'
              onClick={() => setRenaming(false)}
            >
              <FiX />
            </button>
          </form>
        ) : (
          <>
            <h2>{activeCollection ? activeCollection.name : 'All Saved'}</h2>
            {activeCollection && (
              <div className='saved-collection-actions'>
                <button
                  className='btn-small ghost'
                  onClick={() => {
                    setRenameValue(activeCollection.name)
                    setRenaming(true)
                  }}
                  aria-label='Rename collection'
                >
                  <FiEdit2 /> Rename
                </button>
                <button
                  className='btn-small ghost danger'
                  onClick={handleDelete}
                  aria-label='Delete collection'
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
        </>
      )}

      {recipes.length > 0 || isLoading ? (
        <>
          <div className='saved-grid'>
            {!isLoading
              ? recipes.map(recipe => (
                  <RecipeCard
                    key={recipe._id}
                    recipe={recipe}
                    onMutated={refreshAfterMutation}
                  />
                ))
              : Array.from({ length: PER_PAGE }).map((_, i) => (
                  <RecipeCard key={i} recipe={null} loading={true} />
                ))}
          </div>
          {isMoreRecipes && recipes.length > 0 ? (
            <button className='load-more-btn btn' onClick={handleLoadMoreRecipes}>
              Load More Recipes
            </button>
          ) : null}
        </>
      ) : (
        searching ? (
          <EmptyState
            icon={<FiSearch />}
            title='No matches'
            description={
              <>
                Nothing{' '}
                {activeCollection ? `in ${activeCollection.name}` : 'saved'} matches
                “{query}”.
              </>
            }
          />
        ) : activeCollection ? (
          <EmptyState
            icon={<FiFolder />}
            title='Nothing here yet'
            description='Add saved recipes to this collection from the folder icon on any card.'
          />
        ) : (
          <EmptyState
            icon={<FiBookmark />}
            title='No Recipes Saved Yet'
            description='Start saving your favorite recipes today!'
            action={{ label: 'Browse recipes', to: '/recipes' }}
          />
        )
      )}
    </div>
  )
}

export default SavedRecipes
