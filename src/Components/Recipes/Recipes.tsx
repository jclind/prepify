import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './Recipes.scss'
import RecipeThumbnail from '../RecipeThumbnail/RecipeThumbnail'
import RecipeFilters from '../RecipeFilters/RecipeFilters'
import SearchRecipesInput from '../SearchRecipesInput/SearchRecipesInput'
import { Helmet } from 'react-helmet'
import RecipeAPI from 'src/api/recipes'
import { RecipeType } from 'types'
import { TailSpin } from 'react-loader-spinner'

const Recipes = () => {
  const [recipeList, setRecipeList] = useState<RecipeType[]>([])

  const [selectFilterVal, setSelectFilterVal] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [fetchRecipesLoading, setFetchRecipesLoading] = useState(false)

  const [currPage, setCurrPage] = useState<number | null>(null)
  const [totalResults, setTotalResults] = useState<number | null>(null)

  const location = useLocation()
  const urlParams = new URLSearchParams(location.search)
  const param = urlParams.get('q')
  const query = param ? param.split('-').join(' ') : ''

  useEffect(() => {
    getRecipes(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const getRecipes = (page: number) => {
    const orderParam = urlParams.get('order')
    const filter = orderParam || selectFilterVal
    const recipesPerPage = 3

    setFetchRecipesLoading(true)
    RecipeAPI.getAllRecipes(page, filter, selectedTags, recipesPerPage, query)
      .then(res => {
        setTotalResults(res.total_results)

        if (res.recipeList) {
          if (currPage !== 0) {
            setRecipeList([...recipeList, ...res.recipeList])
          } else {
            setRecipeList(res.recipeList)
          }
        } else {
          setRecipeList([])
        }
      })
      .finally(() => setFetchRecipesLoading(false))
  }

  console.log(totalResults, recipeList.length)

  useEffect(() => {
    console.log('here', selectedTags)
    if (selectFilterVal) {
      setCurrPage(0)
      getRecipes(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectFilterVal, selectedTags])

  useEffect(() => {
    if (currPage !== null && currPage !== 0) {
      getRecipes(currPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currPage])
  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Search Recipes</title>
      </Helmet>
      <div className='page recipes-page'>
        <h1 className='title'>Recipes</h1>
        <SearchRecipesInput defaultVal={query} autoComplete={true} />
        <section className='recipes-container'>
          <RecipeFilters
            setSelectVal={setSelectFilterVal}
            selectedDietTags={selectedTags}
            setSelectedDietTags={setSelectedTags}
          />
          {totalResults === 0 ? (
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
              className='load-more-recipes-btn btn'
              onClick={() => setCurrPage(currPage + 1)}
              disabled={fetchRecipesLoading}
            >
              {fetchRecipesLoading ? (
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