import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe } from './mockData'
import './HomeSearch.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const filters = [
  { id: 't15', label: 'Under 15 min', kind: 'time' },
  { id: 't30', label: 'Under 30 min', kind: 'time' },
  { id: 'p3', label: 'Under $3/serv', kind: 'price' },
  { id: 'veg', label: 'Vegetarian', kind: 'diet' },
  { id: 'high', label: 'High protein', kind: 'diet' },
  { id: 'pan', label: 'One-pan', kind: 'tag' },
  { id: 'com', label: 'Comfort food', kind: 'tag' },
]

const SearchCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='search-card'>
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

const HomeSearch: FC = () => {
  const [active, setActive] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const n = new Set(active)
    n.has(id) ? n.delete(id) : n.add(id)
    setActive(n)
  }

  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-search'>
        <section className='search-hero'>
          <span className='wordmark'>PREPIFY</span>
          <h1>What's for dinner?</h1>
          <p>Search 10,000+ recipes that respect your time and your wallet.</p>
          <form className='big-search' onSubmit={e => e.preventDefault()}>
            <AiOutlineSearch className='icon' />
            <input placeholder='Try "30-minute chicken" or "vegan pasta"' />
            <button type='submit'>Search</button>
          </form>
          <div className='filter-chips'>
            {filters.map(f => (
              <button
                key={f.id}
                className={`chip ${active.has(f.id) ? 'active' : ''}`}
                onClick={() => toggle(f.id)}
              >{f.label}</button>
            ))}
          </div>
        </section>

        <section className='trending-section'>
          <div className='section-header'>
            <h2>Trending this week</h2>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <div className='trending-grid'>
            {mockRecipes.slice(0, 4).map(r => <SearchCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeSearch
