import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import './Recipes.scss'
import RecipeThumbnail from '../RecipeThumbnail/RecipeThumbnail'
import RecipeFilters from '../RecipeFilters/RecipeFilters'
import RecipeAPI from '../../api/recipes'
import SearchRecipesInput from '../SearchRecipesInput/SearchRecipesInput'
import { Helmet } from 'react-helmet'

const Recipes = () => {
  const [recipeList, setRecipeList] = useState([])

  const [selectFilterVal, setSelectFilterVal] = useState('')
  const [selectedTags, setSelectedTags] = useState([])

  const [currPage, setCurrPage] = useState(null)
  const [totalResults, setTotalResults] = useState(null)

  const location = useLocation()
  const urlParams = new URLSearchParams(location.search)
  const param = urlParams.get('q')
  const query = param ? param.split('-').join(' ') : ''

  useEffect(() => {
    getRecipes(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const getRecipes = page => {
    const orderParam = urlParams.get('order')
    const filter = orderParam || selectFilterVal || 'popular'

    RecipeAPI.getAll(page, filter, selectedTags, query).then(res => {
      const totalResults = Number(
        res.data && res.data.total_results ? res.data.total_results : 0
      )
      setTotalResults(totalResults)

      if (res.data && res.data.recipeList) {
        if (currPage !== 0) {
          setRecipeList([...recipeList, ...res.data.recipeList])
        } else {
          setRecipeList(res.data.recipeList)
        }
      } else {
        setRecipeList([])
      }
    })
  }

  useEffect(() => {
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
            selectVal={selectFilterVal}
            setSelectVal={setSelectFilterVal}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
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

          {totalResults && totalResults > recipeList.length ? (
            <button
              className='load-more-recipes-btn btn'
              onClick={() => setCurrPage(currPage + 1)}
            >
              Load More Recipes
            </button>
          ) : null}
        </section>
      </div>
    </>
  )
}

export default Recipes
