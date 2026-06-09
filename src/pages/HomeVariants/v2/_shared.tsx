import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar, AiOutlineClockCircle } from 'react-icons/ai'
import { MockRecipe } from '../mockData'
import './_shared.scss'

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

/** The shared hero used across the "filled-in" batch — same image + gradient + search as the original. */
export const Hero: FC<{ heading?: string; sub?: string; placeholder?: string }> = ({
  heading = 'Save money. Reduce stress. Be healthy.',
  sub,
  placeholder = 'Search all recipes',
}) => (
  <section className='v2-hero'>
    <img src='/images/home-images/hero.jpg' alt='' className='v2-hero-bg' />
    <div className='v2-hero-overlay'>
      <h1>{heading}</h1>
      {sub && <p className='v2-hero-sub'>{sub}</p>}
      <form className='v2-search' onSubmit={e => e.preventDefault()}>
        <AiOutlineSearch className='icon' />
        <input placeholder={placeholder} />
        <button type='submit'>Search</button>
      </form>
    </div>
  </section>
)

/** A clean recipe card matching the Classic+ aesthetic. */
export const RecipeCard: FC<{ recipe: MockRecipe; to?: string }> = ({ recipe, to = '/recipes' }) => (
  <Link to={to} className='v2-card'>
    <div className='thumb'>
      <img src={recipe.image} alt={recipe.title} />
      <span className='price-chip'>{formatPrice(recipe.servingPrice)}/serv</span>
    </div>
    <div className='body'>
      <h3>{recipe.title}</h3>
      <div className='meta'>
        <span><AiOutlineClockCircle /> {recipe.totalTime}m</span>
        <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
        <span className='cuisine'>{recipe.cuisine}</span>
      </div>
    </div>
  </Link>
)

export const SectionHeader: FC<{ title: string; sub?: string; href?: string }> = ({ title, sub, href = '/recipes' }) => (
  <div className='v2-section-header'>
    <div>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
    <Link to={href} className='see-all'>See all →</Link>
  </div>
)
