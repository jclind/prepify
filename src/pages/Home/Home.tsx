import React from 'react'
import { Helmet } from 'react-helmet'
import TrendingRecipes from 'src/Components/TrendingRecipes/TrendingRecipes'
import HomeHero from './HomeHero/HomeHero'

const Home = () => {
  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Home</title>
        <link rel='canonical' href='https://www.prepify.netlify.app/' />
      </Helmet>
      <div className='page home-page'>
        <HomeHero />
        <TrendingRecipes />
      </div>
    </>
  )
}

export default Home
