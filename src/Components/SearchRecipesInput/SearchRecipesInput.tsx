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

  // Whether the autocomplete popup is currently displayed. Drives the input's
  // `aria-expanded` as well as the conditional render below — keep the two in
  // lockstep so assistive tech and the DOM never disagree.
  const isOpen = autoComplete && !isBlurred && queryActive

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
    switch (e.key) {
      case 'ArrowDown':
        if (!isOpen || count === 0) return
        e.preventDefault()
        setActiveIndex(i => (i + 1) % count)
        break
      case 'ArrowUp':
        if (!isOpen || count === 0) return
        e.preventDefault()
        setActiveIndex(i => (i <= 0 ? count - 1 : i - 1))
        break
      case 'Home':
        if (!isOpen || count === 0) return
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        if (!isOpen || count === 0) return
        e.preventDefault()
        setActiveIndex(count - 1)
        break
      case 'Enter':
        if (isOpen && activeIndex >= 0 && results[activeIndex]) {
          // Preventing default suppresses the implicit form submit so we
          // navigate to the highlighted result instead of running a search.
          e.preventDefault()
          navigate(`/recipes/${results[activeIndex]._id}`)
          setIsBlurred(true)
        } else {
          handleSubmit(e)
        }
        break
      case 'Escape':
        if (!isOpen) return
        setIsBlurred(true)
        break
      default:
        break
    }
  }

  // Activate an autocomplete result. Delegated to the stable results container
  // rather than bound per-row: an in-flight refetch (keepPreviousData, or a
  // background refetch) can re-render the list and replace the <li>/<button>
  // mid-interaction, so a handler bound to a row would fire on a node React has
  // already detached — the click no-ops and the dropdown just sits there. The
  // container persists across those swaps, so the bubbled click always lands;
  // we read the target row's id from its data attribute. Click (not mousedown)
  // covers both mouse and keyboard (Enter/Space dispatches a click), and because
  // it's stateless it stays correct for the navbar's SearchRecipesInput, which
  // lives in the persistent <Layout> and is reused across navigations.
  const handleResultActivate = (e: React.MouseEvent<HTMLDivElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-recipe-id]'
    )
    const id = row?.dataset.recipeId
    if (id) navigate(`/recipes/${id}`)
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
          role='combobox'
          aria-expanded={isOpen}
          aria-controls={isOpen && results.length > 0 ? listboxId : undefined}
          aria-autocomplete='list'
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          onChange={e => setSearchRecipeVal(e.target.value)}
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
        <div className='auto-complete-results' onClick={handleResultActivate}>
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
