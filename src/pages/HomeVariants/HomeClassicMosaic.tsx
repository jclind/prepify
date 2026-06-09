import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe } from './mockData'
import './HomeClassicMosaic.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const tagCloud = ['Vegetarian', 'Italian', 'Comfort Food', 'High Protein', 'One-Pan', 'Gluten-Free', 'Asian', 'Quick Dinner', 'Mexican', 'Vegan', 'Family-Friendly', 'Mediterranean']

const RecipeCell: FC<{ recipe: MockRecipe; cls?: string }> = ({ recipe, cls }) => (
  <Link to='/recipes' className={`mosaic-cell recipe ${cls || ''}`}>
    <img src={recipe.image} alt={recipe.title} />
    <div className='cell-overlay'>
      <h3>{recipe.title}</h3>
      <div className='cell-meta'>
        <span><CgTimer /> {recipe.totalTime}m</span>
        <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
      </div>
    </div>
  </Link>
)

const HomeClassicMosaic: FC = () => {
  const r = mockRecipes
  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-classic-mosaic'>
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

        <section className='mosaic-section'>
          <div className='section-header'>
            <h2>This week's mix</h2>
            <Link to='/recipes' className='see-all'>Browse all <BiChevronRight /></Link>
          </div>
          <div className='mosaic-grid'>
            <RecipeCell recipe={r[0]} cls='wide tall' />
            <RecipeCell recipe={r[1]} />
            <RecipeCell recipe={r[2]} />
            <Link to='/recipes' className='mosaic-cell promo orange'>
              <div className='promo-content'>
                <span className='promo-kicker'>Trending</span>
                <h3>30-minute dinners</h3>
                <p>612 weeknight winners</p>
                <span className='promo-arrow'>Browse →</span>
              </div>
            </Link>
            <RecipeCell recipe={r[3]} />
            <Link to='/recipes' className='mosaic-cell promo teal'>
              <div className='promo-content'>
                <span className='promo-kicker'>Save money</span>
                <h3>Under $3 per serving</h3>
                <p>405 budget-friendly recipes</p>
                <span className='promo-arrow'>Explore →</span>
              </div>
            </Link>
            <RecipeCell recipe={r[4]} cls='tall' />
            <RecipeCell recipe={r[5]} />
            <RecipeCell recipe={r[6]} cls='wide' />
            <Link to='/recipes' className='mosaic-cell promo dark'>
              <div className='promo-content'>
                <span className='promo-kicker'>From the community</span>
                <h3>This week we love @mariekitchen</h3>
                <p>Italian comfort food, weeknight-friendly</p>
                <span className='promo-arrow'>Browse author →</span>
              </div>
            </Link>
            <RecipeCell recipe={r[7]} />
            <RecipeCell recipe={r[8]} />
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

export default HomeClassicMosaic
