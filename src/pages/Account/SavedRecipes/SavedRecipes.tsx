import React, { FC, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiPlus, FiFolderPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi'
import Select, { SingleValue } from 'react-select'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'

import './SavedRecipes.scss'
import RecipeAPI from 'src/api/recipes'
import CollectionsAPI from 'src/api/collections'
import { RecipeType } from 'types'
import { selectCustomStyles } from 'src/pages/Account/selectCustomStyles'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'
import AddToCollectionControl from 'src/Components/AddToCollection/AddToCollectionControl'

type OptionType = { value: string; label: string }

// Save-time orders sort the saved entries; the rest are field sorts the server
// resolves from the recipe docs (see GET /getSavedRecipes).
const options: OptionType[] = [
  { value: 'newAdd', label: 'Save Time: Recent' },
  { value: 'oldAdd', label: 'Save Time: Oldest' },
  { value: 'alpha', label: 'Title: A–Z' },
  { value: 'rating', label: 'Rating: Highest' },
  { value: 'timeShort', label: 'Time: Shortest' },
  { value: 'timeLong', label: 'Time: Longest' },
]

const SavedRecipes: FC = () => {
  const queryClient = useQueryClient()

  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const [currPage, setCurrPage] = useState(0)
  const [isMoreRecipes, setIsMoreRecipes] = useState(false)
  const [selectOption, setSelectOption] = useState(options[0])

  // null = the "All" view (the master saved list); otherwise a collection id.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: CollectionsAPI.list,
  })
  const activeCollection = collections.find(c => c.id === activeCollectionId) ?? null

  // A deleted collection (e.g. from another tab) shouldn't strand the view on a
  // filter that no longer exists — fall back to All. Only once collections have
  // loaded, so the initial empty list doesn't bounce a valid deep-link.
  useEffect(() => {
    if (activeCollectionId && collections.length > 0 && !activeCollection) {
      setActiveCollectionId(null)
      setCurrPage(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCollectionId, activeCollection, collections.length])

  const { data, isLoading } = useQuery({
    queryKey: ['saved-recipes', selectOption.value, currPage, activeCollectionId],
    queryFn: () =>
      RecipeAPI.getSavedRecipes(
        currPage,
        6,
        selectOption.value,
        activeCollectionId ?? undefined
      ),
  })
  const showSkeleton = useDelayedLoading(isLoading)

  useEffect(() => {
    if (data) {
      if (currPage === 0) {
        setRecipes([...data.recipes])
        setIsMoreRecipes(Number(data.totalCount) > data.recipes.length)
      } else {
        const updated = [...recipes, ...data.recipes]
        setRecipes(updated)
        setIsMoreRecipes(Number(data.totalCount) > updated.length)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleSelectChange = (e: SingleValue<OptionType>) => {
    if (!e) return
    setSelectOption(e)
    setCurrPage(0)
  }

  const handleLoadMoreRecipes = () => setCurrPage(prev => prev + 1)

  const selectCollection = (id: string | null) => {
    setActiveCollectionId(id)
    setCurrPage(0)
    setRenaming(false)
  }

  // Refresh after a membership/collection change. Counts (and covers) always
  // refetch; the grid only needs to reset when a filter is active, since adding
  // or removing a tag can change which recipes the active collection shows.
  const refreshAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
    if (activeCollectionId !== null) {
      setCurrPage(0)
      queryClient.invalidateQueries({ queryKey: ['saved-recipes'] })
    }
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

  // On the first load, hold an empty frame while a fast query settles, so the
  // skeleton only shows for genuinely slow loads — and the empty state never
  // flashes before data. Scoped to the initial load so paging never blanks the
  // already-rendered list.
  if (isLoading && !showSkeleton && recipes.length === 0) {
    return <div className='saved-recipes' />
  }

  return (
    <div className='saved-recipes'>
      {/* Collection chips: All + each collection + a create affordance. */}
      <div className='collection-chips'>
        <button
          className={`chip ${activeCollectionId === null ? 'active' : ''}`}
          onClick={() => selectCollection(null)}
        >
          All
        </button>
        {collections.map(c => (
          <button
            key={c.id}
            className={`chip ${activeCollectionId === c.id ? 'active' : ''}`}
            onClick={() => selectCollection(c.id)}
          >
            {c.name}
            <span className='chip-count'>{c.count}</span>
          </button>
        ))}
        {creatingNew ? (
          <form
            className='new-chip-form'
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
              className='chip-icon-btn'
              aria-label='Create'
              disabled={creating || !newName.trim()}
            >
              <FiPlus />
            </button>
          </form>
        ) : (
          <button
            className='chip chip-new'
            onClick={() => setCreatingNew(true)}
            aria-label='New collection'
          >
            <FiFolderPlus /> New
          </button>
        )}
      </div>

      {/* Toolbar for the active collection: rename / delete. */}
      {activeCollection && (
        <div className='collection-toolbar'>
          {renaming ? (
            <form
              className='rename-form'
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
              <h2 className='collection-name'>{activeCollection.name}</h2>
              <button
                className='btn-small ghost'
                onClick={() => {
                  setRenameValue(activeCollection.name)
                  setRenaming(true)
                }}
                aria-label='Rename collection'
              >
                <FiEdit2 />
              </button>
              <button
                className='btn-small ghost danger'
                onClick={handleDelete}
                aria-label='Delete collection'
              >
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
      )}

      {recipes.length > 0 || isLoading ? (
        <>
          <div className='saved-recipes-filters'>
            <Select<OptionType, false>
              options={options}
              styles={selectCustomStyles}
              isSearchable={false}
              isClearable={false}
              className='select'
              onChange={handleSelectChange}
              value={selectOption}
            />
          </div>
          <div className='thumbnails-container'>
            {!isLoading ? (
              recipes.map(recipe => (
                <div className='saved-card' key={recipe._id}>
                  <RecipeThumbnail recipe={recipe} />
                  <AddToCollectionControl
                    recipeId={recipe._id}
                    className='saved-card__collection'
                    triggerClassName='add-to-collection-btn'
                    onMutated={refreshAfterMutation}
                  />
                </div>
              ))
            ) : (
              <>
                <RecipeThumbnail recipe={null} loading={true} />
                <RecipeThumbnail recipe={null} loading={true} />
                <RecipeThumbnail recipe={null} loading={true} />
              </>
            )}
          </div>
          {isMoreRecipes && recipes.length > 0 ? (
            <button className='load-more-btn btn' onClick={handleLoadMoreRecipes}>
              Load More Recipes
            </button>
          ) : null}
        </>
      ) : (
        <div className='no-data-saved'>
          <h2>{activeCollection ? 'Nothing here yet' : 'No Recipes Saved Yet'}</h2>
          <p>
            {activeCollection
              ? 'Add saved recipes to this collection from the folder icon on any card.'
              : 'Start saving your favorite recipes today!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default SavedRecipes
