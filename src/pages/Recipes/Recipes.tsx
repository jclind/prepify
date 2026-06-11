import React, { FC, useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { BiChevronDown, BiSliderAlt } from 'react-icons/bi'
import { TailSpin } from 'react-loader-spinner'
import './Recipes.scss'
import RecipeCard from 'src/Components/RecipeCard/RecipeCard'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import RecipeAPI from 'src/api/recipes'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import cuisinesList from 'src/recipeData/cuisinesList'
import mealTypesList from 'src/recipeData/mealTypesList'

const RECIPES_PER_PAGE = 9

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'new', label: 'Newest' },
  { value: 'old', label: 'Oldest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'expensive', label: 'Priciest' },
  { value: 'shortest', label: 'Quickest' },
  { value: 'longest', label: 'Longest' },
]

const dietLabelOf = (value: string) =>
  dietLabelsOptions.find(o => o.value === value)?.label ??
  value.replace(/[-_]/g, ' ')

const Recipes: FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const urlParams = new URLSearchParams(location.search)
  const param = urlParams.get('q')
  const query = param ? param.split('-').join(' ') : ''

  const [sort, setSort] = useState('popular')
  const [diets, setDiets] = useState<string[]>([])
  const [cuisine, setCuisine] = useState('')
  const [meals, setMeals] = useState<string[]>([])
  // Gate the query until the initial URL params have been read into state, so
  // we don't fire a default fetch and then immediately refetch with filters.
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Hydrate filter state from the URL once on mount.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setSort(params.get('order') || 'popular')
    setDiets(params.get('dietTags')?.split(',').filter(Boolean) ?? [])
    setCuisine(params.get('cuisine') ?? '')
    setMeals(params.get('mealTypes')?.split(',').filter(Boolean) ?? [])
    setFiltersLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close the sort popover on outside click.
  useEffect(() => {
    if (!sortOpen) return
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [sortOpen])

  // Reflect filter state back into the URL (shareable + bookmarkable).
  const syncUrl = (next: {
    sort?: string
    diets?: string[]
    cuisine?: string
    meals?: string[]
  }) => {
    const params = new URLSearchParams(location.search)
    const s = next.sort ?? sort
    const d = next.diets ?? diets
    const c = next.cuisine ?? cuisine
    const m = next.meals ?? meals
    s && s !== 'popular' ? params.set('order', s) : params.delete('order')
    d.length ? params.set('dietTags', d.join(',')) : params.delete('dietTags')
    c ? params.set('cuisine', c) : params.delete('cuisine')
    m.length ? params.set('mealTypes', m.join(',')) : params.delete('mealTypes')
    navigate(`/recipes?${params.toString()}`)
  }

  const changeSort = (value: string) => {
    setSort(value)
    setSortOpen(false)
    syncUrl({ sort: value })
  }
  const toggleDiet = (value: string) => {
    const next = diets.includes(value)
      ? diets.filter(d => d !== value)
      : [...diets, value]
    setDiets(next)
    syncUrl({ diets: next })
  }
  const changeCuisine = (value: string) => {
    const next = cuisine === value ? '' : value
    setCuisine(next)
    syncUrl({ cuisine: next })
  }
  const toggleMeal = (value: string) => {
    const next = meals.includes(value)
      ? meals.filter(m => m !== value)
      : [...meals, value]
    setMeals(next)
    syncUrl({ meals: next })
  }
  const clearFilters = () => {
    setDiets([])
    setCuisine('')
    setMeals([])
    syncUrl({ diets: [], cuisine: '', meals: [] })
  }

  const { data, isFetching, isError, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: [
        'recipes',
        { sort, tags: diets, cuisine, search: query, meals },
      ],
      queryFn: ({ pageParam }) =>
        RecipeAPI.getAllRecipes(
          pageParam as number,
          sort,
          diets,
          cuisine,
          RECIPES_PER_PAGE,
          query,
          meals
        ),
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => {
        const totalFetched = allPages.reduce(
          (sum, p) => sum + p.recipeList.length,
          0
        )
        return totalFetched < lastPage.total_results
          ? lastPage.page + 1
          : undefined
      },
      enabled: !filtersLoading,
      retry: false,
    })

  const recipeList = data?.pages.flatMap(p => p.recipeList) ?? []
  const totalResults = data?.pages[0]?.total_results ?? null
  const activeFilterCount = diets.length + meals.length + (cuisine ? 1 : 0)
  const hasResults = recipeList.length > 0
  const isInitialLoading = !data && !isError

  const currentSortLabel =
    SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Popular'

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Search Recipes</title>
        <meta
          name='description'
          content="Find healthy and budget-friendly recipes on Prepify's search page. Get meal prices and nutrition info for easy meal planning. Cook delicious meals with our flavorful recipes."
        />
      </Helmet>
      <div className='page recipes-page'>
        <header className='recipes-header'>
          <h1>Recipes</h1>
          <p>Healthy, budget-friendly meals with real prices per serving.</p>
        </header>

        <div className='recipes-toolbar'>
          <SearchRecipesInput defaultVal={query} autoComplete={true} />
          <button
            type='button'
            className='recipes-filters-btn'
            onClick={() => setDrawerOpen(true)}
          >
            <BiSliderAlt /> Filters
            {activeFilterCount > 0 && (
              <span className='recipes-filters-btn__badge'>
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className='recipes-sort' ref={sortRef}>
            <button
              type='button'
              className={`recipes-sort__trigger ${sortOpen ? 'is-open' : ''}`}
              aria-expanded={sortOpen}
              onClick={() => setSortOpen(o => !o)}
            >
              Sort: {currentSortLabel}
              <BiChevronDown className='chev' />
            </button>
            {sortOpen && (
              <ul className='recipes-sort__menu'>
                {SORT_OPTIONS.map(o => (
                  <li key={o.value}>
                    <button
                      type='button'
                      className={o.value === sort ? 'is-active' : ''}
                      onClick={() => changeSort(o.value)}
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className='recipes-active'>
            {cuisine && (
              <button
                className='recipes-active__chip'
                onClick={() => changeCuisine(cuisine)}
              >
                {cuisine} ✕
              </button>
            )}
            {diets.map(d => (
              <button
                key={d}
                className='recipes-active__chip'
                onClick={() => toggleDiet(d)}
              >
                {dietLabelOf(d)} ✕
              </button>
            ))}
            {meals.map(m => (
              <button
                key={m}
                className='recipes-active__chip'
                onClick={() => toggleMeal(m)}
              >
                {m} ✕
              </button>
            ))}
            <button className='recipes-active__clear' onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {isError ? (
          <div className='recipes-message'>
            Failed to load recipes. Please try again.
          </div>
        ) : totalResults === 0 ? (
          <div className='recipes-empty'>
            <div className='recipes-empty__emoji'>🍽️</div>
            <h2>No recipes found</h2>
            <p>Try a different search or clear your filters.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <div className='recipes-grid'>
              {isInitialLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <RecipeCard key={i} recipe={null} loading={true} />
                  ))
                : recipeList.map(recipe => (
                    <RecipeCard key={recipe._id} recipe={recipe} />
                  ))}
            </div>

            {hasNextPage && hasResults && (
              <div className='recipes-load-more'>
                <button
                  className='load-more-btn'
                  onClick={() => fetchNextPage()}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <TailSpin
                      height='22'
                      width='22'
                      color='#ff5722'
                      ariaLabel='loading'
                    />
                  ) : (
                    <>
                      Load more recipes <BiChevronDown />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {drawerOpen && (
          <div className='recipes-drawer' role='dialog' aria-label='Filters'>
            <div
              className='recipes-drawer__backdrop'
              onClick={() => setDrawerOpen(false)}
            />
            <div className='recipes-drawer__panel'>
              <div className='recipes-drawer__head'>
                <h2>Filters</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label='Close filters'
                >
                  ✕
                </button>
              </div>
              <div className='recipes-drawer__body'>
                <section>
                  <h3>Diet</h3>
                  <div className='recipes-drawer__chips'>
                    {dietLabelsOptions.map(o => (
                      <button
                        key={o.value}
                        className={`recipes-chip ${
                          diets.includes(o.value) ? 'is-active' : ''
                        }`}
                        onClick={() => toggleDiet(o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3>Cuisine</h3>
                  <div className='recipes-drawer__chips'>
                    {cuisinesList.map(c => (
                      <button
                        key={c}
                        className={`recipes-chip ${
                          cuisine === c ? 'is-active' : ''
                        }`}
                        onClick={() => changeCuisine(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3>Meal</h3>
                  <div className='recipes-drawer__chips'>
                    {mealTypesList.map(m => (
                      <button
                        key={m}
                        className={`recipes-chip ${
                          meals.includes(m) ? 'is-active' : ''
                        }`}
                        onClick={() => toggleMeal(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <div className='recipes-drawer__foot'>
                <button
                  className='recipes-drawer__reset'
                  onClick={clearFilters}
                >
                  Reset
                </button>
                <button
                  className='recipes-drawer__apply'
                  onClick={() => setDrawerOpen(false)}
                >
                  Show recipes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Recipes
