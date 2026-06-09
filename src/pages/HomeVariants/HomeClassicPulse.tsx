import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight, BiTrendingUp } from 'react-icons/bi'
import { GiCookingPot } from 'react-icons/gi'
import { FiPlusCircle } from 'react-icons/fi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe } from './mockData'
import './HomeClassicPulse.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const categories = [
  { id: 'breakfast', label: 'Breakfast', emoji: '☕', count: 482 },
  { id: 'lunch', label: 'Lunch', emoji: '🥗', count: 731 },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️', count: 1284 },
  { id: 'quick', label: 'Under 30 min', emoji: '⚡', count: 612 },
  { id: 'healthy', label: 'Healthy', emoji: '🥦', count: 893 },
  { id: 'budget', label: 'Under $3', emoji: '💰', count: 405 },
]

const tagCloud = ['Vegetarian', 'Italian', 'Comfort Food', 'High Protein', 'One-Pan', 'Gluten-Free', 'Asian', 'Quick Dinner', 'Mexican', 'Vegan', 'Family-Friendly', 'Mediterranean']

const Card: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='classic-card'>
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

const HomeClassicPulse: FC = () => {
  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-classic-pulse'>
        <section className='classic-hero'>
          <img src='/images/home-images/hero.jpg' alt='' className='hero-bg' />
          <div className='hero-overlay'>
            <h1>Save money. Reduce stress. Be healthy.</h1>
            <form className='search-form' onSubmit={e => e.preventDefault()}>
              <AiOutlineSearch className='icon' />
              <input placeholder='Search all recipes' />
              <button type='submit'>Search</button>
            </form>
          </div>
        </section>

        <section className='pulse-strip'>
          <div className='pulse-item'>
            <BiTrendingUp className='icon trending' />
            <span className='label'>Trending now</span>
            <span className='value'>Creamy Tuscan Garlic Pasta</span>
          </div>
          <div className='pulse-item'>
            <GiCookingPot className='icon cook' />
            <span className='label'>This week</span>
            <span className='value'>3,200 meals made</span>
          </div>
          <div className='pulse-item'>
            <FiPlusCircle className='icon new' />
            <span className='label'>Latest recipe</span>
            <span className='value'>added 12 min ago</span>
          </div>
          <div className='pulse-item'>
            <AiOutlineStar className='icon star' />
            <span className='label'>Community rating</span>
            <span className='value'>4.6 average</span>
          </div>
        </section>

        <section className='categories-section'>
          <div className='section-header'>
            <h2>Browse by category</h2>
          </div>
          <div className='cat-grid'>
            {categories.map(c => (
              <Link to='/recipes' key={c.id} className='cat-tile'>
                <span className='emoji' aria-hidden>{c.emoji}</span>
                <span className='label'>{c.label}</span>
                <span className='count'>{c.count} recipes</span>
              </Link>
            ))}
          </div>
        </section>

        <section className='trending-section'>
          <div className='section-header'>
            <h2>Trending this week</h2>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <div className='trending-grid'>
            {mockRecipes.slice(0, 4).map(r => <Card recipe={r} key={r.id} />)}
          </div>
        </section>

        <section className='community-section'>
          <div className='community-card'>
            <div className='community-text'>
              <span className='eyebrow'>Featured author</span>
              <h2>This week we love @mariekitchen</h2>
              <p>Italian comfort food made for busy weeknights — pasta-forward, pantry-friendly, and never more than 30 minutes.</p>
              <Link to='/recipes' className='community-btn'>Browse their recipes</Link>
            </div>
            <div className='community-recipes'>
              {mockRecipes.slice(4, 7).map(r => <Card recipe={r} key={r.id} />)}
            </div>
          </div>
        </section>

        <section className='tags-section'>
          <div className='section-header'>
            <h2>Popular tags</h2>
          </div>
          <div className='tag-cloud'>
            {tagCloud.map(t => (
              <Link to='/recipes' key={t} className='tag'>{t}</Link>
            ))}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeClassicPulse
