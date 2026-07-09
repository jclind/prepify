import { AlertCircleIcon, BookmarkIcon, ChevronDownIcon, CloseIcon, EditIcon, FolderIcon, FolderPlusIcon, GridIcon, PlusIcon, SearchIcon, TrashIcon } from 'src/Components/icons'
import React, { FC, useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import RecipeCard from 'src/Components/RecipeCard/RecipeCard'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import SortDropdown from 'src/Components/SortDropdown/SortDropdown'

import './SavedRecipes.scss'
import RecipeAPI from 'src/api/recipes'
import CollectionsAPI from 'src/api/collections'
import AuthAPI from 'src/api/auth'
import { RecipeType } from 'types'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'
import { COLLECTION_CREATE_ERROR } from 'src/util/toastMessages'
import { useDebounce } from 'src/hooks/useDebounce'
import { invalidateSavedCaches } from 'src/util/invalidateSavedCaches'
import { usePaginatedLoadMore } from 'src/pages/Account/usePaginatedLoadMore'
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

const SavedRecipes: FC = () => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()

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
  const query = useDebounce(searchInput.trim(), 300)

  // The saved grid's load-more core (page cursor, accumulate, is-more,
  // flash-guarded skeleton) lives in the shared hook; sort/collection/search are
  // baked into the key so changing any of them refetches, paired with
  // resetToFirstPage() at each of those change sites to jump back to page 0.
  const {
    items: recipes,
    isLoading,
    showSkeleton,
    isError,
    refetch,
    isMore: isMoreRecipes,
    loadMore: handleLoadMoreRecipes,
    reset: resetToFirstPage,
  } = usePaginatedLoadMore<RecipeType>({
    queryKey: page => [
      'saved-recipes',
      sort.value,
      page,
      activeCollectionId,
      query,
    ],
    queryFn: page =>
      RecipeAPI.getSavedRecipes(
        page,
        PER_PAGE,
        sort.value,
        activeCollectionId ?? undefined,
        query || undefined
      ).then(d => d && { items: d.recipes, totalCount: d.totalCount }),
  })

  // Reset to the first page off the debounced term, not the keystroke, so a new
  // search doesn't fire a throwaway page-0 request for the old term first.
  useEffect(() => {
    resetToFirstPage()
  }, [query, resetToFirstPage])

  const { data: collections = [], isLoading: collectionsLoading } = useQuery({
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
      resetToFirstPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCollectionId, activeCollection, collections.length])

  // Collections load on their own query; reserve their row with skeleton tiles
  // (delay-gated, same as the grid) so collections don't pop in and shove the
  // grid down.
  const showCollSkeleton = useDelayedLoading(collectionsLoading)

  const selectCollection = (id: string | null) => {
    setActiveCollectionId(id)
    resetToFirstPage()
    setRenaming(false)
  }
  const changeSort = (value: string) => {
    const next = SORT_OPTIONS.find(o => o.value === value)
    if (next) setSort(next)
    resetToFirstPage()
  }
  const onSearchChange = (v: string) => setSearchInput(v)

  // Refresh after a membership/collection change. Counts + covers always
  // refetch. The grid must refetch too — an unsave from the popover removes a
  // card even in the unfiltered "All saved" view — so reset to page 0 and
  // refetch unconditionally rather than only when a collection filter is active.
  // useCallback so the reference is stable across renders — it's passed as
  // `onMutated` to the memoized RecipeCard grid, and a fresh function each
  // render would defeat React.memo and re-render every saved card.
  const refreshAfterMutation = useCallback(() => {
    invalidateSavedCaches(queryClient, uid)
    resetToFirstPage()
  }, [queryClient, uid, resetToFirstPage])

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
      toast.error(err?.response?.data?.error ?? COLLECTION_CREATE_ERROR)
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
      toast.error(err?.response?.data?.error ?? 'Could not rename collection.')
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
      toast.error(err?.response?.data?.error ?? 'Could not delete collection.')
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

  return (
    <div className='saved-recipes'>
      {!blankSlate && (
        <>
      {/* Collections: All + each collection + a create affordance. */}
      <div className='saved-collections'>
        <CollectionCard
          label='All saved'
          count={savedTotal}
          countLoading={savedTotal === null}
          cover={null}
          icon={<GridIcon />}
          variant='all'
          active={activeCollectionId === null}
          onClick={() => selectCollection(null)}
        />
        {collectionsLoading
          ? // Reserve the tile slots for the whole load (so "New" doesn't get
            // nudged when they appear); sk-hold holds them invisible until the
            // flash-guard delay elapses — same reserve pattern as the grid.
            Array.from({ length: 3 }).map((_, i) => (
              <CollectionCard
                key={i}
                loading
                className={showCollSkeleton ? '' : 'sk-hold'}
              />
            ))
          : collections.map(c => (
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
              className='btn btn--primary new-submit'
              disabled={creating || !newName.trim()}
            >
              <PlusIcon /> Create
            </button>
          </form>
        ) : (
          <button
            type='button'
            className='collection-card collection-card--new'
            onClick={() => setCreatingNew(true)}
            aria-label='New collection'
          >
            <FolderPlusIcon /> New
          </button>
        )}
      </div>

      {/* Toolbar: full-width search + sort. */}
      <div className='saved-toolbar'>
        <div className='saved-search'>
          <SearchIcon className='saved-search__icon' />
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
              className='btn btn--icon saved-search__clear'
              aria-label='Clear search'
              onClick={() => onSearchChange('')}
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <SortDropdown
          className='saved-sort'
          options={SORT_OPTIONS}
          value={sort.value}
          onChange={changeSort}
        />
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
            <button type='submit' className='btn btn--outline btn-small'>Save</button>
            <button
              type='button'
              className='btn btn--outline btn-small ghost'
              onClick={() => setRenaming(false)}
            >
              <CloseIcon />
            </button>
          </form>
        ) : (
          <>
            <h2>{activeCollection ? activeCollection.name : 'All Saved'}</h2>
            {activeCollection && (
              <div className='saved-collection-actions'>
                <button
                  className='btn btn--outline btn-small ghost'
                  onClick={() => {
                    setRenameValue(activeCollection.name)
                    setRenaming(true)
                  }}
                  aria-label='Rename collection'
                >
                  <EditIcon /> Rename
                </button>
                <button
                  className='btn btn--danger btn-small'
                  onClick={handleDelete}
                  aria-label='Delete collection'
                >
                  <TrashIcon /> Delete
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
          {/* Render the skeleton cards whenever loading so the grid reserves its
              height from frame 1; the flash-guard delay only hides them (sk-hold)
              until it's worth drawing — no blank-then-grow jump. */}
          <div
            className={`saved-grid ${
              isLoading && !showSkeleton ? 'sk-hold' : ''
            }`}
          >
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
            <button className='load-more-btn' onClick={handleLoadMoreRecipes}>
              Load more recipes <ChevronDownIcon />
            </button>
          ) : null}
        </>
      ) : isError ? (
        // Error is not empty: a failed fetch must never read as "no saves" to a
        // user who has them. See docs/design/loading-states.md.
        <EmptyState
          icon={<AlertCircleIcon />}
          title='Couldn’t load your saved recipes'
          description='Something went wrong. Please try again.'
          action={{ label: 'Try again', onClick: () => refetch() }}
        />
      ) : (
        searching ? (
          <EmptyState
            icon={<SearchIcon />}
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
            icon={<FolderIcon />}
            title='Nothing here yet'
            description='Add saved recipes to this collection from the folder icon on any card.'
          />
        ) : (
          <EmptyState
            icon={<BookmarkIcon />}
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
