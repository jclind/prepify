import React, { FC, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import './Recipes.scss'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'
import RecipeFilters from 'src/Components/RecipeFilters/RecipeFilters'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import { Helmet } from 'react-helmet-async'
import RecipeAPI from 'src/api/recipes'
import { TailSpin } from 'react-loader-spinner'
import RecipesSwitcher from './redesign/RecipesSwitcher'
import { useRecipesTake } from './redesign/variantStore'
import { getTake } from './redesign/registry'

const RecipesDefault: FC = () => {
  const [selectFilterVal, setSelectFilterVal] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCuisine, setSelectedCuisine] = useState('')
  const [filtersLoading, setFiltersLoading] = useState(true)

  const location = useLocation()
  const urlParams = new URLSearchParams(location.search)
  const param = urlParams.get('q')
  const query = param ? param.split('-').join(' ') : ''
  const orderParam = urlParams.get('order')
  const filter = orderParam || selectFilterVal

  const { data, isFetching, isError, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: [
        'recipes',
        {
          sort: filter,
          tags: selectedTags,
          cuisine: selectedCuisine,
          search: query,
        },
      ],
      queryFn: ({ pageParam }) =>
        RecipeAPI.getAllRecipes(
          pageParam as number,
          filter,
          selectedTags,
          selectedCuisine,
          9,
          query
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
        <h1 className='title'>Recipes</h1>
        <SearchRecipesInput defaultVal={query} autoComplete={true} />
        <section className='recipes-container'>
          <RecipeFilters
            selectVal={selectFilterVal}
            setSelectVal={setSelectFilterVal}
            selectedDietTags={selectedTags}
            setSelectedDietTags={setSelectedTags}
            selectedCuisine={selectedCuisine}
            setSelectedCuisine={setSelectedCuisine}
            filtersLoading={filtersLoading}
            setFiltersLoading={setFiltersLoading}
          />
          {isError ? (
            <div className='fetch-error'>
              Failed to load recipes. Please try again.
            </div>
          ) : totalResults === 0 ? (
            <div>No Results Found</div>
          ) : (
            <>
              {recipeList[0] ? (
                <div className='recipes-list'>
                  {recipeList.map((recipe, idx) => {
                    return <RecipeThumbnail key={idx} recipe={recipe} />
                  })}
                </div>
              ) : (
                <div className='recipes-list'>
                  <RecipeThumbnail recipe={null} loading={true} />
                  <RecipeThumbnail recipe={null} loading={true} />
                  <RecipeThumbnail recipe={null} loading={true} />
                  <RecipeThumbnail recipe={null} loading={true} />
                </div>
              )}
            </>
          )}

          {hasNextPage ? (
            <button
              className='load-more-btn btn'
              onClick={() => fetchNextPage()}
              disabled={isFetching}
            >
              {isFetching ? (
                <TailSpin
                  height='30'
                  width='30'
                  color='black'
                  ariaLabel='loading'
                />
              ) : (
                'Load More Recipes'
              )}
            </button>
          ) : null}
        </section>
      </div>
    </>
  )
}

/**
 * Dispatcher: in dev, a selected redesign take replaces the production page so
 * the takes can be compared live; the floating switcher is always mounted in
 * dev. In prod, only the real page renders (the switcher self-guards to null).
 */
const Recipes: FC = () => {
  const take = useRecipesTake()
  const activeTake = import.meta.env.DEV ? getTake(take) : undefined

  return (
    <>
      {activeTake ? (
        <>
          <Helmet>
            <meta charSet='utf-8' />
            <title>Prepify | Recipes — preview: {activeTake.label}</title>
          </Helmet>
          <div className='page'>
            <activeTake.Component />
          </div>
        </>
      ) : (
        <RecipesDefault />
      )}
      <RecipesSwitcher />
    </>
  )
}

export default Recipes
