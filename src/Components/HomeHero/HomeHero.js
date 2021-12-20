import React from 'react'
import './HomeHero.scss'

const HomeHero = () => {
  return (
    <div className='home-hero'>
      <img src='/images/home-images/hero.jpg' alt='Assorted Foods Background' />
      <div className='hero-overlay'>
        <h3 className='text'>Save money. Reduce stress. Be healthy.</h3>
        <button className='btn action-btn'>Recipes</button>
      </div>
    </div>
  )
}

export default HomeHero
