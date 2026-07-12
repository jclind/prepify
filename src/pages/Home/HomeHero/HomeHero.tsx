import React, { FC } from 'react'
import './HomeHero.scss'
import SearchRecipesInput from 'src/Components/SearchRecipesInput/SearchRecipesInput'
import HomeCookSuggestion from '../HomeCookSuggestion'

const HomeHero: FC = () => {
  return (
    <div className='home-hero'>
      <img
        src='/images/home-images/hero.webp'
        alt='Assorted Foods Background'
        className='background'
        height={1000}
        width={3178}
        title='Assorted Foods Background'
        loading='eager'
      />
      <div className='hero-overlay'>
        <h1 className='text'>Save money. Reduce stress. Be healthy.</h1>
        <SearchRecipesInput autoComplete={true} />
        <HomeCookSuggestion />
      </div>
    </div>
  )
}

export default HomeHero
