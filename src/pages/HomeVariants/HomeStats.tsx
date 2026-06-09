import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe } from './mockData'
import './HomeStats.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const StatsCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='stats-card'>
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

const HomeStats: FC = () => {
  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-stats'>
        <section className='stats-hero'>
          <img src='/images/home-images/hero.jpg' alt='' className='hero-bg' />
          <div className='hero-overlay'>
            <div className='hero-content'>
              <span className='eyebrow'>Prepify by the numbers</span>
              <div className='stat-row'>
                <div className='big-stat'>
                  <div className='num'>10,247</div>
                  <div className='lbl'>community recipes</div>
                </div>
                <div className='big-stat'>
                  <div className='num'>$2.85</div>
                  <div className='lbl'>average per serving</div>
                </div>
                <div className='big-stat'>
                  <div className='num'>30<span>min</span></div>
                  <div className='lbl'>typical recipe time</div>
                </div>
              </div>
              <h1>Eat better. Spend less. Cook smarter.</h1>
              <form className='search-form' onSubmit={e => e.preventDefault()}>
                <AiOutlineSearch className='icon' />
                <input placeholder='Search all recipes' />
                <button type='submit'>Find recipes</button>
              </form>
            </div>
          </div>
        </section>

        <section className='trending-section'>
          <div className='section-header'>
            <h2>Trending this week</h2>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <div className='trending-grid'>
            {mockRecipes.slice(0, 4).map(r => <StatsCard recipe={r} key={r.id} />)}
          </div>
        </section>

        <section className='value-row'>
          <div className='value'>
            <div className='value-icon'>💰</div>
            <div>
              <strong>$140 / month</strong>
              <span>saved by avg user vs takeout</span>
            </div>
          </div>
          <div className='value'>
            <div className='value-icon'>⏱️</div>
            <div>
              <strong>2.3 hours / week</strong>
              <span>saved by meal planning</span>
            </div>
          </div>
          <div className='value'>
            <div className='value-icon'>🌱</div>
            <div>
              <strong>3,200 meals</strong>
              <span>made by the community last week</span>
            </div>
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeStats
