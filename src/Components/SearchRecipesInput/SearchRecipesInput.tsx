import { ClockIcon, SearchIcon, StarOutlineIcon, UserIcon } from 'src/Components/icons'
import React, { FC, useState, useEffect, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const listboxId = useId()
  const optionId = (index: number) => `${listboxId}-option-${index}`
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

  // Whether the autocomplete popup is currently displayed. Drives the
  // conditional render below; keep them in lockstep so assistive tech and the
  // DOM never disagree. (`queryActive` already folds in the `autoComplete`
  // prop, so it isn't re-checked here.)
  const isOpen = !isBlurred && queryActive

  // True only while the popup actually contains the `role="listbox"` element —
  // i.e. we have results to navigate. Drives `aria-expanded`/`aria-controls`
  // together so we never claim an expanded combobox that owns no listbox (the
  // loading-skeleton and empty states render a popup but no listbox).
  const listboxOpen = isOpen && results.length > 0

  // Index of the option highlighted by keyboard navigation (-1 = none). The
  // active option is surfaced to AT via the input's `aria-activedescendant`
  // (focus stays on the input — the APG list-autocomplete combobox pattern),
  // not by moving DOM focus into the list.
  const [activeIndex, setActiveIndex] = useState(-1)

  const navigate = useNavigate()

  const wrapperRef = useRef<HTMLFormElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  useOutsideAlerter(wrapperRef, setIsBlurred)

  // Reset the keyboard highlight whenever the query changes or the popup
  // opens/closes, so a reopened dropdown never starts on a stale row.
  useEffect(() => {
    setActiveIndex(-1)
  }, [trimmedQuery, isOpen])

  // Clamp the highlight if a background refetch (same query) shrinks the result
  // set out from under it — otherwise `activeIndex` would point past the end,
  // leaving `aria-activedescendant` dangling at an id that's no longer in the
  // DOM. Only fires when actually out of range, so a same-size refetch keeps
  // the user's keyboard position.
  useEffect(() => {
    if (activeIndex >= results.length) setActiveIndex(-1)
  }, [results.length, activeIndex])

  // Keep the highlighted option scrolled into view within the (scrollable) list.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  // Combobox keyboard handling. Arrow/Home/End move the highlight via
  // `aria-activedescendant`; Enter activates the highlighted option (falling
  // back to a full search); Escape closes the popup.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const count = results.length

    // The navigation keys share a guard (popup open with at least one option)
    // and all suppress the default; only the index math differs.
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      if (!isOpen || count === 0) return
      e.preventDefault()
      if (e.key === 'ArrowDown') setActiveIndex(i => (i + 1) % count)
      else if (e.key === 'ArrowUp') setActiveIndex(i => (i <= 0 ? count - 1 : i - 1))
      else if (e.key === 'Home') setActiveIndex(0)
      else setActiveIndex(count - 1)
      return
    }

    if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        // Preventing default suppresses the implicit form submit so we
        // navigate to the highlighted result instead of running a search.
        e.preventDefault()
        goToRecipe(results[activeIndex]._id)
      } else {
        handleSubmit(e)
      }
    } else if (e.key === 'Escape') {
      if (!isOpen) return
      setIsBlurred(true)
    }
  }

  // The single "activate a result" action, shared by the mouse-click and the
  // keyboard-Enter paths so the destination (and dropdown-close) can't drift
  // between them.
  const goToRecipe = (id: string) => {
    navigate(`/recipes/${id}`)
    setIsBlurred(true)
  }

  // Resolve the result row under a pointer event from its `data-recipe-id`.
  // Delegated to the stable results container rather than bound per-row: an
  // in-flight refetch (keepPreviousData, or a background refetch) can re-render
  // the list and replace the <li> mid-interaction, so a handler bound to a row
  // would fire on a node React has already detached. The container persists
  // across those swaps, so the bubbled event always lands. Returns the row's
  // id, or undefined for non-result targets (skeleton/empty/footer).
  const resolveRowId = (e: React.MouseEvent<HTMLDivElement>) =>
    (e.target as HTMLElement).closest<HTMLElement>('[data-recipe-id]')?.dataset
      .recipeId

  // Click (not mousedown) covers both mouse and keyboard (Enter/Space dispatches
  // a click); because activation is stateless it stays correct for the navbar's
  // SearchRecipesInput, which lives in the persistent <Layout> and is reused
  // across navigations.
  const handleResultActivate = (e: React.MouseEvent<HTMLDivElement>) => {
    const id = resolveRowId(e)
    if (id) goToRecipe(id)
  }

  // Sync the keyboard highlight to the hovered row so the mouse `:hover` and the
  // keyboard `.is-active` states (and `aria-activedescendant`) always name the
  // same option — never two highlighted rows at once.
  const handleResultHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const id = resolveRowId(e)
    if (!id) return
    const index = results.findIndex(r => r._id === id)
    if (index >= 0) setActiveIndex(index)
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
        <SearchIcon className='icon' />
        <input
          id={inputId}
          className='search-recipes-input'
          placeholder='Search All Recipes'
          aria-label='Search all recipes'
          role='combobox'
          aria-expanded={listboxOpen}
          aria-controls={listboxOpen ? listboxId : undefined}
          aria-autocomplete='list'
          aria-activedescendant={
            listboxOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          onChange={e => {
            setSearchRecipeVal(e.target.value)
            // Re-open after an Escape (or a prior submit): the user is typing
            // again, so suggestions should come back without a blur/refocus.
            setIsBlurred(false)
          }}
          value={searchRecipeVal}
          onFocus={() => setIsBlurred(false)}
          onKeyDown={handleKeyDown}
        />
        {searchRecipeVal && (
          <div className='search-recipes-btn btn' onClick={handleSubmit}>
            Search
          </div>
        )}
      </label>
      {isOpen && (
        <div
          className='auto-complete-results'
          onClick={handleResultActivate}
          onMouseOver={handleResultHover}
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
              <ul className='ac-list' role='listbox' id={listboxId} ref={listRef}>
                {results.map((recipe, index) => (
                  <li
                    key={recipe._id}
                    id={optionId(index)}
                    role='option'
                    aria-selected={index === activeIndex}
                    className={`ac-item${index === activeIndex ? ' is-active' : ''}`}
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
                          <ClockIcon /> {recipe.totalTime}
                        </span>
                        <span className='ac-item__stat'>
                          <UserIcon /> {recipe.servings}
                        </span>
                        <span className='ac-item__stat'>
                          <StarOutlineIcon />{' '}
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
                  </li>
                ))}
              </ul>
              <button
                type='button'
                className='ac-footer'
                onClick={handleSubmit}
              >
                <SearchIcon className='ac-footer__icon' />
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
