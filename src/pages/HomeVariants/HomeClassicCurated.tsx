import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight, BiBookmark } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe, weeklyPlan } from './mockData'
import './HomeClassicCurated.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const categories = [
  { id: 'breakfast', label: 'Breakfast', emoji: '☕' },
  { id: 'lunch', label: 'Lunch', emoji: '🥗' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'quick', label: 'Under 30 min', emoji: '⚡' },
  { id: 'healthy', label: 'Healthy', emoji: '🥦' },
  { id: 'budget', label: 'Under $3', emoji: '💰' },
]

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

const HomeClassicCurated: FC = () => {
  const feature = mockRecipes[1]

  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-classic-curated'>
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

        <section className='editor-pick-section'>
          <div className='editor-pick'>
            <img src={feature.image} alt={feature.title} />
            <div className='editor-text'>
              <span className='badge'>Editor's pick · Recipe of the day</span>
              <h2>{feature.title}</h2>
              <p>A silky parmesan cream sauce loaded with sun-dried tomatoes, garlic, and spinach — the weeknight dinner that tastes like Sunday.</p>
              <div className='editor-meta'>
                <span><AiOutlineUser /> @{feature.author}</span>
                <span><CgTimer /> {feature.totalTime} min</span>
                <span><AiOutlineStar /> {feature.rating.rateValue} ({feature.rating.rateCount})</span>
                <span className='price'>{formatPrice(feature.servingPrice)}/serv</span>
              </div>
              <div className='editor-actions'>
                <Link to='/recipes' className='primary'>Cook this tonight →</Link>
                <button className='secondary'><BiBookmark /> Save</button>
              </div>
            </div>
          </div>
        </section>

        <section className='categories-strip'>
          <div className='cat-scroll'>
            {categories.map(c => (
              <Link to='/recipes' key={c.id} className='cat-pill'>
                <span className='emoji' aria-hidden>{c.emoji}</span>
                <span>{c.label}</span>
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
            {mockRecipes.slice(2, 6).map(r => <Card recipe={r} key={r.id} />)}
          </div>
        </section>

        <section className='lineup-section'>
          <div className='section-header'>
            <div>
              <span className='eyebrow'>Curated by our editors</span>
              <h2>This week's lineup</h2>
            </div>
            <Link to='/design/plan' className='see-all'>Plan your week <BiChevronRight /></Link>
          </div>
          <div className='lineup-row'>
            {weeklyPlan.slice(0, 7).map(d => (
              <Link to='/recipes' className='day-card' key={d.day}>
                <div className='day-head'>{d.day}</div>
                {d.dinner ? (
                  <>
                    <img src={d.dinner.image} alt='' />
                    <div className='day-title'>{d.dinner.title}</div>
                    <div className='day-meta'>
                      <span><CgTimer /> {d.dinner.totalTime}m</span>
                      <span>{formatPrice(d.dinner.servingPrice)}/serv</span>
                    </div>
                  </>
                ) : (
                  <div className='day-empty'>No dinner yet</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeClassicCurated
