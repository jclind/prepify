import React from 'react'
import './HomeHero.scss'
import SearchRecipesInput from '../../../Components/SearchRecipesInput/SearchRecipesInput'

const HomeHero = () => {
  return (
    <div className='home-hero'>
      <img
        src='/images/home-images/hero.jpg'
        alt='Assorted Foods Background'
        className='background'
        height={500}
        width={1000}
        title='Assorted Foods Background'
        loading='eager'
      />
      <div className='hero-overlay'>
        <h1 className='text'>Save money. Reduce stress. Be healthy.</h1>
        <SearchRecipesInput autoComplete={true} />
      </div>
    </div>
  )
}

export default HomeHero
