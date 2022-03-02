import React from 'react'
import HomeHero from '../HomeHero/HomeHero'
import TrendingRecipes from '../TrendingRecipes/TrendingRecipes'
import { Helmet } from 'react-helmet'

const Home = () => {
  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Home</title>
      </Helmet>
      <div className='page home-page'>
        <HomeHero />
        <TrendingRecipes />
      </div>
    </>
  )
}

export default Home
