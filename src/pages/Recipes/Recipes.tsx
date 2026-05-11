import React, { FC, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import './Recipes.scss'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'
import RecipeFilters from 'src/Components/RecipeFilters/RecipeFilters'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import { Helmet } from 'react-helmet-async'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { TailSpin } from 'react-loader-spinner'

const Recipes: FC = () => {
  const [recipeList, setRecipeList] = useState<RecipeType[]>([])

  const [selectFilterVal, setSelectFilterVal] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCuisine, setSelectedCuisine] = useState('')

  const [filtersLoading, setFiltersLoading] = useState(true)

  const [currPage, setCurrPage] = useState<number | null>(null)
  const [totalResults, setTotalResults] = useState<number | null>(null)

  const location = useLocation()
  const urlParams = new URLSearchParams(location.search)
  const param = urlParams.get('q')
  const query = param ? param.split('-').join(' ') : ''
  const orderParam = urlParams.get('order')
  const filter = orderParam || selectFilterVal

  const { data, isFetching, isError } = useQuery({
    queryKey: [
      'recipes',
      {
        page: currPage,
        sort: filter,
        tags: selectedTags,
        cuisine: selectedCuisine,
        search: query,
      },
    ],
    queryFn: () =>
      RecipeAPI.getAllRecipes(
        currPage as number,
        filter,
        selectedTags,
        selectedCuisine,
        9,
        query
      ),
    enabled: currPage !== null,
    retry: false,
  })

  useEffect(() => {
    if (!filtersLoading) {
      setRecipeList([])
      setCurrPage(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectFilterVal, selectedTags, selectedCuisine, location.search])

  useEffect(() => {
    if (data) {
      setTotalResults(data.total_results)
      if (data.page === 0) {
        setRecipeList(data.recipeList || [])
      } else {
        setRecipeList(prev => [...prev, ...(data.recipeList || [])])
      }
    }
  }, [data])

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

          {totalResults &&
          totalResults > recipeList.length &&
          currPage !== null ? (
            <button
              className='load-more-btn btn'
              onClick={() => setCurrPage(currPage + 1)}
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

export default Recipes
