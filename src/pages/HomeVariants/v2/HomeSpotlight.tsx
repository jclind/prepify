import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineClockCircle, AiOutlineStar } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes, featuredRecipe } from '../mockData'
import { Hero, RecipeCard, SectionHeader, formatPrice } from './_shared'
import './HomeSpotlight.scss'

const categories = [
  { label: 'Breakfast', emoji: '☕' },
  { label: 'Lunch', emoji: '🥗' },
  { label: 'Dinner', emoji: '🍽️' },
  { label: 'Under 30 min', emoji: '⚡' },
  { label: 'Healthy', emoji: '🥦' },
  { label: 'Under $3', emoji: '💰' },
]

const HomeSpotlight: FC = () => (
  <>
    <Helmet><title>Prepify | Spotlight</title></Helmet>
    <div className='v2-page home-spotlight'>
      <Hero />

      <section className='cats-strip-wrap'>
        <div className='cats-strip'>
          {categories.map(c => (
            <Link to='/recipes' key={c.label} className='cat-pill'>
              <span aria-hidden>{c.emoji}</span> {c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className='spotlight-section'>
        <span className='day-label'>Recipe of the day</span>
        <Link to='/recipes' className='spotlight-card'>
          <div className='img-wrap'>
            <img src={featuredRecipe.image} alt={featuredRecipe.title} />
          </div>
          <div className='spotlight-text'>
            <h2>{featuredRecipe.title}</h2>
            <p>{featuredRecipe.description}</p>
            <div className='meta'>
              <span><AiOutlineClockCircle /> {featuredRecipe.totalTime}m</span>
              <span><AiOutlineStar /> {featuredRecipe.rating.rateValue}</span>
              <span className='price'>{formatPrice(featuredRecipe.servingPrice)}/serv</span>
              <span className='tag'>{featuredRecipe.tags[0]}</span>
            </div>
          </div>
        </Link>
      </section>

      <section>
        <SectionHeader title='Also worth a look' sub='Popular with the community this week' />
        <div className='grid-4'>
          {mockRecipes.slice(1, 5).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeSpotlight
