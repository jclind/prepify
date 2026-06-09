import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe } from './mockData'
import './HomeSplit.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const SplitCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='split-card'>
    <img src={recipe.image} alt={recipe.title} />
    <div className='body'>
      <h3>{recipe.title}</h3>
      <div className='meta'>
        <span><CgTimer /> {recipe.totalTime}m</span>
        <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
      </div>
    </div>
  </Link>
)

const HomeSplit: FC = () => {
  const today = mockRecipes.slice(0, 3)
  const trending = mockRecipes.slice(3, 7)

  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-split'>
        <section className='split-hero'>
          <div className='hero-image'>
            <img src='/images/home-images/hero.jpg' alt='' />
          </div>
          <div className='hero-content'>
            <div className='eyebrow'>Prepify · Save money. Reduce stress.</div>
            <h1>Dinner shouldn't be the hardest part of your day.</h1>
            <p>Browse 10,000+ recipes that respect your time and your wallet.</p>
            <form className='search-form' onSubmit={e => e.preventDefault()}>
              <AiOutlineSearch className='icon' />
              <input placeholder='What are you craving?' />
              <button type='submit'>Find recipes</button>
            </form>
            <div className='quick-cats'>
              <span>Try:</span>
              <Link to='/recipes'>30-minute meals</Link>
              <Link to='/recipes'>Under $3/serving</Link>
              <Link to='/recipes'>High protein</Link>
              <Link to='/recipes'>One-pan</Link>
            </div>
          </div>
        </section>

        <section className='today-section'>
          <div className='section-header'>
            <div>
              <span className='eyebrow'>Today's picks</span>
              <h2>Hand-picked for tonight</h2>
            </div>
            <Link to='/recipes' className='see-all'>See more <BiChevronRight /></Link>
          </div>
          <div className='today-grid'>
            {today.map(r => <SplitCard recipe={r} key={r.id} />)}
          </div>
        </section>

        <section className='trending-section'>
          <div className='section-header'>
            <h2>Trending this week</h2>
            <Link to='/recipes' className='see-all'>Browse all <BiChevronRight /></Link>
          </div>
          <div className='trending-grid'>
            {trending.map(r => <SplitCard recipe={r} key={r.id} />)}
          </div>
        </section>

        <section className='newsletter'>
          <div className='newsletter-inner'>
            <h2>One recipe a week. No spam.</h2>
            <form onSubmit={e => e.preventDefault()} className='newsletter-form'>
              <input type='email' placeholder='you@kitchen.com' />
              <button type='submit'>Subscribe</button>
            </form>
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeSplit
