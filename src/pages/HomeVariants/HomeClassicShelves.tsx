import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe, byMeal } from './mockData'
import './HomeClassicShelves.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const ShelfCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='shelf-card'>
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

const Shelf: FC<{ title: string; subtitle?: string; recipes: MockRecipe[] }> = ({ title, subtitle, recipes }) => (
  <section className='shelf'>
    <div className='shelf-head'>
      <div>
        <h2>{title}</h2>
        {subtitle && <span className='shelf-sub'>{subtitle}</span>}
      </div>
      <Link to='/recipes' className='shelf-see'>See all <BiChevronRight /></Link>
    </div>
    <div className='shelf-row'>
      {recipes.map(r => <ShelfCard recipe={r} key={r.id} />)}
    </div>
  </section>
)

const HomeClassicShelves: FC = () => {
  const trending = mockRecipes.slice(0, 6)
  const editorsPicks = [...mockRecipes].sort((a, b) => b.rating.rateCount - a.rating.rateCount).slice(0, 6)
  const quickWins = mockRecipes.filter(r => r.totalTime <= 20).slice(0, 6)
  const budget = [...mockRecipes].sort((a, b) => a.servingPrice - b.servingPrice).slice(0, 6)
  const dinner = byMeal.dinner.slice(0, 6)

  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-classic-shelves'>
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

        <div className='shelves-container'>
          <Shelf title='Trending this week' subtitle='What the community is cooking right now' recipes={trending} />
          <Shelf title="Editor's picks" subtitle='Hand-selected highlights from our team' recipes={editorsPicks} />
          <Shelf title='Quick wins' subtitle='20 minutes or less, start to finish' recipes={quickWins} />
          <Shelf title='Under $3 a serving' subtitle='Budget-friendly without sacrificing flavor' recipes={budget} />
          <Shelf title='Dinner tonight' subtitle='Tested weeknight dinners' recipes={dinner} />
        </div>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeClassicShelves
