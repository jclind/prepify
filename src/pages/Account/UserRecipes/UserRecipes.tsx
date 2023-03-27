// import React from 'react'
import React, { FC } from 'react'
import './UserRecipes.scss'

// const options = [
//   // { value: 'popular', label: 'Popular' },
//   // { value: 'new', label: 'Recipe Date: Newest' },
//   // { value: 'old', label: 'Recipe Date: Oldest' },
//   // { value: 'shortest', label: 'Time: Shortest' },
//   // { value: 'longest', label: 'Time: Longest' },
//   { value: 'newAdd', label: 'Save Time: Recent' },
//   { value: 'oldAdd', label: 'Save Time: Oldest' },
// ]

const UserRecipes: FC = () => {
  return <div>Functionality not yet set up!</div>
  // const [recipes, setRecipes] = useState<RecipeType[]>([])
  // const [recipesPage, setRecipesPage] = useState(0)
  // const [isMoreRecipes, setIsMoreRecipes] = useState(false)

  // const [selectOption, setSelectOption] = useState(options[0])

  // const handleGetCreatedRecipes = (
  //   recipesPage: number,
  //   selectValue: string
  // ) => {
  //   if (recipesPage >= 0 && selectValue) {
  //     RecipeAPI.getSavedRecipes(recipesPage, 6, selectValue).then(res => {
  //       if (res) {
  //         const updatedArr =
  //           recipesPage === 0 ? [...res.recipes] : [...recipes, ...res.recipes]
  //         setRecipes([...updatedArr])

  //         if (Number(res.totalCount) > updatedArr.length) {
  //           setIsMoreRecipes(true)
  //         } else {
  //           setIsMoreRecipes(false)
  //         }

  //         setRecipesPage(recipesPage + 1)
  //       }
  //     })
  //   }
  // }
  // useEffect(() => {
  //   handleGetCreatedRecipes(recipesPage, selectOption.value)
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [])

  // const handleSelectChange = (
  //   e: SingleValue<{
  //     value: string
  //     label: string
  //   }>
  // ) => {
  //   if (e) {
  //     setSelectOption(e)
  //     setRecipesPage(0)
  //     handleGetSavedRecipes(0, e.value)
  //   }
  // }
  // const handleLoadMoreRecipes = () => {
  //   handleGetSavedRecipes(recipesPage, selectOption.value)
  // }

  // return (
  //   <div className='saved-recipes'>
  //     {recipes.length > 0 ? (
  //       <>
  //         <div className='saved-recipes-filters'>
  //           <Select
  //             options={options}
  //             styles={selectCustomStyles}
  //             isSearchable={false}
  //             isClearable={false}
  //             className='select'
  //             onChange={handleSelectChange}
  //             value={selectOption}
  //           />
  //         </div>
  //         <div className='thumbnails-container'>
  //           {recipes.map(recipe => {
  //             return <RecipeThumbnail key={recipe._id} recipe={recipe} />
  //           })}
  //         </div>
  //         {isMoreRecipes && recipes.length > 0 ? (
  //           <button
  //             className='load-more-btn btn'
  //             onClick={handleLoadMoreRecipes}
  //           >
  //             Load More Recipes
  //           </button>
  //         ) : null}
  //       </>
  //     ) : (
  //       <div className='no-recipes-saved'>
  //         <h2>No Recipes Saved Yet</h2>
  //         <p>Start saving your favorite recipes today!</p>
  //       </div>
  //     )}
  //   </div>
  // )
}

export default UserRecipes
