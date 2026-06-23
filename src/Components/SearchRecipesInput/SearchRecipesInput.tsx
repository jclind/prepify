import React, { FC, useState, useEffect, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import './SearchRecipesInput.scss'
import { formatRating } from 'src/util/formatRating'
import slugify from 'slugify'
import RecipeAPI from 'src/api/recipes'
import { useDebounce } from 'src/hooks/useDebounce'
import { RecipeSearchResponseType } from 'types'
import Skeleton from 'react-loading-skeleton'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

const skeletonColor = '#d6d6d6'

function useOutsideAlerter(
  ref: React.RefObject<HTMLFormElement | null>,
  setVal: (val: boolean) => void
) {
  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node | null)) {
        setVal(true)
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}

type SearchRecipesInputProps = {
  defaultVal?: string
  autoComplete: boolean
}

const SearchRecipesInput: FC<SearchRecipesInputProps> = ({
  defaultVal,
  autoComplete,
}) => {
  const inputId = useId()
  const [searchRecipeVal, setSearchRecipeVal] = useState(defaultVal || '')
  const debouncedQuery = useDebounce(searchRecipeVal, 300)

  const trimmedQuery = debouncedQuery.trim()
  const queryActive = autoComplete && trimmedQuery.length > 2

  const { data, isFetching } = useQuery<RecipeSearchResponseType[]>({
    queryKey: ['recipe-autocomplete', trimmedQuery],
    queryFn: () => RecipeAPI.searchAutoCompleteRecipes(trimmedQuery),
    enabled: queryActive,
    // Keep the prior results visible while the next keystroke's query resolves,
    // so the dropdown doesn't blank-then-repopulate on every character.
    placeholderData: keepPreviousData,
  })

  const results = data ?? []
  // The server falls back to fuzzy matches when nothing contains the query
  // literally; detect that (no result contains the query) to show a gentle
  // "did you mean" affordance. Skipped mid-fetch to avoid a flash against the
  // previous query's results.
  const isCorrected =
    !isFetching &&
    results.length > 0 &&
    !results.some(r =>
      (r.title ?? '').toLowerCase().includes(trimmedQuery.toLowerCase())
    )

  const [isBlurred, setIsBlurred] = useState(true)

  const navigate = useNavigate()

  const wrapperRef = useRef<HTMLFormElement>(null)
  useOutsideAlerter(wrapperRef, setIsBlurred)

  // Activate an autocomplete result. Delegated to the stable results container
  // rather than bound per-row, because an in-flight refetch (keepPreviousData,
  // or a background refetch) re-renders the list and *replaces* the <li>/<button>
  // DOM nodes mid-interaction. A handler bound to a row therefore fires on a
  // node React has already detached — the click no-ops and the dropdown just
  // sits there. The container persists across those swaps, so the bubbled event
  // always lands; we read the target row's id from its data attribute. We fire
  // on mousedown (before mouseup can miss a swapped node) and also on click so
  // keyboard activation (Enter/Space → click, no mousedown) still works; the ref
  // guard keeps the two paths from double-navigating.
  const navigatingRef = useRef(false)
  const handleResultActivate = (e: React.MouseEvent<HTMLDivElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-recipe-id]'
    )
    const id = row?.dataset.recipeId
    if (!id || navigatingRef.current) return
    navigatingRef.current = true
    navigate(`/recipes/${id}`)
  }

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault()

    if (slugify(searchRecipeVal)) {
      navigate(`/recipes?q=${slugify(searchRecipeVal)}`)
    } else {
      navigate('/recipes')
    }
    setIsBlurred(true)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='search-recipes-form'
      ref={wrapperRef}
    >
      <label htmlFor={inputId} className='search-recipes-input-label'>
        <AiOutlineSearch className='icon' />
        <input
          id={inputId}
          className='search-recipes-input'
          placeholder='Search All Recipes'
          aria-label='Search all recipes'
          onChange={e => setSearchRecipeVal(e.target.value)}
          value={searchRecipeVal}
          onFocus={() => setIsBlurred(false)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit(e)
          }}
        />
        {searchRecipeVal && (
          <div className='search-recipes-btn btn' onClick={handleSubmit}>
            Search
          </div>
        )}
      </label>
      {autoComplete && !isBlurred && queryActive && (
        <div
          className='auto-complete-results'
          onMouseDown={handleResultActivate}
          onClick={handleResultActivate}
        >
          {isFetching && results.length === 0 ? (
            <ul className='ac-list' aria-hidden='true'>
              {Array.from({ length: 4 }).map((_, i) => (
                // Loading placeholders deliberately do NOT use `.ac-item`: that
                // class is the interactive, navigable result row, and the
                // skeleton shares its `<ul>`. Selectors/tests (and a fast user)
                // targeting `.ac-item` must only ever hit a real result — never
                // a skeleton that looks clickable but isn't.
                <li className='ac-skeleton' key={i}>
                  <Skeleton
                    className='ac-skeleton__thumb'
                    baseColor={skeletonColor}
                  />
                  <div className='ac-skeleton__body'>
                    <Skeleton width='65%' baseColor={skeletonColor} />
                    <Skeleton width='40%' baseColor={skeletonColor} />
                  </div>
                </li>
              ))}
            </ul>
          ) : results.length === 0 ? (
            <div className='ac-empty'>
              <span className='ac-empty__title'>
                No matches for “{trimmedQuery}”
              </span>
              <span className='ac-empty__hint'>Press Enter to search anyway.</span>
            </div>
          ) : (
            <>
              {isCorrected && (
                <p className='ac-corrected'>
                  No exact match — showing similar recipes
                </p>
              )}
              <ul className='ac-list' role='listbox'>
                {results.map(recipe => (
                  <li key={recipe._id}>
                    <button
                      type='button'
                      role='option'
                      aria-selected='false'
                      className='ac-item'
                      data-recipe-id={recipe._id}
                    >
                      <div className='ac-item__thumb'>
                        <Skeleton
                          className='ac-item__thumb-skeleton'
                          baseColor={skeletonColor}
                        />
                        <img src={recipe.recipeImage} alt='' />
                      </div>
                      <div className='ac-item__body'>
                        <span className='ac-item__title'>{recipe.title}</span>
                        <span className='ac-item__meta'>
                          <span className='ac-item__stat'>
                            <CgTimer /> {recipe.totalTime}
                          </span>
                          <span className='ac-item__stat'>
                            <AiOutlineUser /> {recipe.servings}
                          </span>
                          <span className='ac-item__stat'>
                            <AiOutlineStar />{' '}
                            {formatRating(
                              Number(recipe.rating?.rateValue ?? 0),
                              Number(recipe.rating?.rateCount ?? 0)
                            )}
                          </span>
                        </span>
                      </div>
                      <div className='ac-item__tags'>
                        {(recipe.nutritionLabels ?? []).slice(0, 3).map(tag => (
                          <span className='ac-item__tag' key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type='button'
                className='ac-footer'
                onClick={handleSubmit}
              >
                <AiOutlineSearch className='ac-footer__icon' />
                Search for “{searchRecipeVal.trim()}”
              </button>
            </>
          )}
        </div>
      )}
    </form>
  )
}

export default SearchRecipesInput
