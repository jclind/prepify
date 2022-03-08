import React from 'react'
import HomeHero from '../HomeHero/HomeHero'
import TrendingRecipes from '../TrendingRecipes/TrendingRecipes'
import { Helmet } from 'react-helmet'

const Home = () => {
  const handleFetch = async () => {
    // let test = await fetch(
    //   `https://api.edamam.com/api/nutrition-data?app_id=${process.env.REACT_APP_EDAMAM_APP_ID}&app_key=${process.env.REACT_APP_EDAMAM_APP_KEY}&nutrition-type=cooking&ingr=1%201%2F2%20pound%20Bonelss%20skinless%20chicken%20breasts%20%2C%20diced%20into%203%2F4-inch%20pieces`,
    //   { mode: 'no-cors' }
    // )
    // console.log(test)
  }

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Home</title>
      </Helmet>
      <div className='page home-page'>
        <HomeHero />
        <TrendingRecipes />
        <button onClick={handleFetch}>Get Data</button>
      </div>
    </>
  )
}

export default Home
