import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiBookmark } from 'react-icons/bi'
import { FiZap } from 'react-icons/fi'
import DesignSwitcher from './DesignSwitcher'
import { byMeal, mockRecipes, MockRecipe } from './mockData'
import './HomeCook.scss'

type MealKey = 'breakfast' | 'lunch' | 'dinner'

const timeFilters = [
  { id: '15', label: 'Under 15 min', max: 15 },
  { id: '30', label: 'Under 30 min', max: 30 },
  { id: '60', label: 'Under 1 hr', max: 60 },
]
const dietFilters = ['Vegetarian', 'Vegan', 'Gluten-Free', 'High Protein']
const priceFilters = [
  { id: 'cheap', label: 'Under $2/serv', max: 200 },
  { id: 'mid', label: 'Under $4/serv', max: 400 },
]

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const CookCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='cook-card'>
    <div className='thumb'>
      <img src={recipe.image} alt={recipe.title} />
      <div className='time-chip'><CgTimer /> {recipe.totalTime}m</div>
    </div>
    <div className='content'>
      <div className='top-row'>
        <h3>{recipe.title}</h3>
        <button className='save' onClick={e => e.preventDefault()} aria-label='Save'>
          <BiBookmark />
        </button>
      </div>
      <div className='tags'>
        {recipe.tags.slice(0, 3).map(t => <span key={t}>{t}</span>)}
      </div>
      <div className='footer'>
        <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
      </div>
    </div>
  </Link>
)

const HomeCook: FC = () => {
  const [meal, setMeal] = useState<MealKey>('dinner')
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(activeFilters)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setActiveFilters(next)
  }

  const tonightPicks = byMeal[meal].slice(0, 4)
  const under15 = mockRecipes.filter(r => r.totalTime <= 15).slice(0, 2)
  const under30 = mockRecipes.filter(r => r.totalTime > 15 && r.totalTime <= 30).slice(0, 2)
  const under60 = mockRecipes.filter(r => r.totalTime > 30 && r.totalTime <= 60).slice(0, 2)
  const fiveIng = mockRecipes.slice(4, 7)

  return (
    <>
      <Helmet>
        <title>Prepify | Cook Now</title>
      </Helmet>
      <div className='home-cook'>
        {/* HERO */}
        <section className='cook-hero'>
          <div className='hero-inner'>
            <span className='kicker'><FiZap /> Cook Now</span>
            <h1>What are you cooking tonight?</h1>
            <p>Tell us what you've got — time, diet, budget — and we'll find dinner.</p>
            <form className='cook-search' onSubmit={e => e.preventDefault()}>
              <AiOutlineSearch className='icon' />
              <input placeholder='Try "30 minute chicken" or "vegan pasta"' />
              <button type='submit'>Find recipes</button>
            </form>

            <div className='filter-row'>
              <div className='filter-group'>
                <span className='filter-label'>Time</span>
                {timeFilters.map(t => (
                  <button
                    key={t.id}
                    className={`chip ${activeFilters.has(`t-${t.id}`) ? 'active' : ''}`}
                    onClick={() => toggle(`t-${t.id}`)}
                  >{t.label}</button>
                ))}
              </div>
              <div className='filter-group'>
                <span className='filter-label'>Diet</span>
                {dietFilters.map(d => (
                  <button
                    key={d}
                    className={`chip ${activeFilters.has(`d-${d}`) ? 'active' : ''}`}
                    onClick={() => toggle(`d-${d}`)}
                  >{d}</button>
                ))}
              </div>
              <div className='filter-group'>
                <span className='filter-label'>Price</span>
                {priceFilters.map(p => (
                  <button
                    key={p.id}
                    className={`chip ${activeFilters.has(`p-${p.id}`) ? 'active' : ''}`}
                    onClick={() => toggle(`p-${p.id}`)}
                  >{p.label}</button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MEAL SELECTOR */}
        <section className='meal-selector'>
          <div className='selector-row'>
            {(['breakfast', 'lunch', 'dinner'] as MealKey[]).map(m => (
              <button
                key={m}
                className={`meal-btn ${meal === m ? 'active' : ''}`}
                onClick={() => setMeal(m)}
              >
                <span className='emoji' aria-hidden>
                  {m === 'breakfast' ? '☕' : m === 'lunch' ? '🥗' : '🍽️'}
                </span>
                <span className='label'>{m.charAt(0).toUpperCase() + m.slice(1)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* TONIGHT'S PICKS */}
        <section className='picks-section'>
          <div className='section-header'>
            <h2>Tonight's top {meal} picks</h2>
            <Link to='/recipes' className='see-all'>Browse all →</Link>
          </div>
          <div className='picks-grid'>
            {tonightPicks.map(r => <CookCard recipe={r} key={r.id} />)}
          </div>
        </section>

        {/* BY TIME */}
        <section className='by-time'>
          <h2>Got time for…</h2>
          <div className='time-columns'>
            <div className='time-col'>
              <div className='time-header'>
                <span className='big'>15</span>
                <span className='small'>minutes</span>
              </div>
              {under15.map(r => <CookCard recipe={r} key={r.id} />)}
            </div>
            <div className='time-col'>
              <div className='time-header'>
                <span className='big'>30</span>
                <span className='small'>minutes</span>
              </div>
              {under30.map(r => <CookCard recipe={r} key={r.id} />)}
            </div>
            <div className='time-col'>
              <div className='time-header'>
                <span className='big'>1</span>
                <span className='small'>hour</span>
              </div>
              {under60.map(r => <CookCard recipe={r} key={r.id} />)}
            </div>
          </div>
        </section>

        {/* PANTRY */}
        <section className='pantry'>
          <div className='section-header'>
            <div>
              <span className='eyebrow'>Pantry-friendly</span>
              <h2>5 ingredients or less</h2>
            </div>
            <Link to='/recipes' className='see-all'>See all →</Link>
          </div>
          <div className='pantry-row'>
            {fiveIng.map(r => <CookCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeCook
