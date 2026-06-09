import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { BiBookmark, BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import {
  featuredRecipe,
  mockRecipes,
  moods,
  MockRecipe,
} from './mockData'
import './HomeDiscover.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const SmallCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='small-card'>
    <img src={recipe.image} alt={recipe.title} />
    <div className='meta'>
      <div className='title'>{recipe.title}</div>
      <div className='row'>
        <span><CgTimer /> {recipe.totalTime} min</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
      </div>
    </div>
  </Link>
)

const StandardCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='standard-card'>
    <div className='img-wrap'>
      <img src={recipe.image} alt={recipe.title} />
      <button className='save' aria-label='Save recipe' onClick={e => e.preventDefault()}>
        <BiBookmark />
      </button>
    </div>
    <div className='body'>
      <div className='cuisine'>{recipe.cuisine}</div>
      <h3 className='title'>{recipe.title}</h3>
      <div className='info'>
        <span><CgTimer /> {recipe.totalTime} min</span>
        <span><AiOutlineStar /> {recipe.rating.rateValue} ({recipe.rating.rateCount})</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
      </div>
    </div>
  </Link>
)

const HomeDiscover: FC = () => {
  const featured = featuredRecipe
  const sidePicks = mockRecipes.slice(0, 3)
  const trending = mockRecipes.slice(1, 5)
  const budget = [...mockRecipes].sort((a, b) => a.servingPrice - b.servingPrice).slice(0, 3)

  return (
    <>
      <Helmet>
        <title>Prepify | Discover</title>
      </Helmet>
      <div className='home-discover'>
        {/* HERO: Recipe of the Day */}
        <section className='hero'>
          <div className='hero-feature'>
            <div className='hero-image'>
              <img src={featured.image} alt={featured.title} />
              <span className='badge'>Recipe of the Day</span>
            </div>
            <div className='hero-text'>
              <div className='cuisine'>{featured.cuisine} · {featured.totalTime} min</div>
              <h1>{featured.title}</h1>
              <p className='description'>{featured.description}</p>
              <div className='hero-meta'>
                <span><AiOutlineStar /> {featured.rating.rateValue} ({featured.rating.rateCount})</span>
                <span><AiOutlineUser /> by @{featured.author}</span>
                <span className='price'>{formatPrice(featured.servingPrice)}/serving</span>
              </div>
              <div className='hero-tags'>
                {featured.tags.map(t => <span className='tag' key={t}>{t}</span>)}
              </div>
              <div className='hero-actions'>
                <Link to='/recipes' className='primary'>Cook this tonight</Link>
                <button className='ghost'><BiBookmark /> Save</button>
              </div>
            </div>
          </div>
          <aside className='side-picks'>
            <div className='side-picks-header'>More from today</div>
            {sidePicks.map(r => <SmallCard recipe={r} key={r.id} />)}
          </aside>
        </section>

        {/* MOODS */}
        <section className='moods'>
          <div className='section-header'>
            <h2>Browse by Mood</h2>
            <span className='subtitle'>Tell us how you're feeling — we'll handle dinner</span>
          </div>
          <div className='mood-grid'>
            {moods.map(m => (
              <Link to='/recipes' key={m.id} className='mood-tile' style={{ backgroundColor: m.color }}>
                <img src={m.image} alt='' />
                <div className='mood-overlay'>
                  <h3>{m.label}</h3>
                  <p>{m.blurb}</p>
                  <span className='arrow'>Explore <BiChevronRight /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* TRENDING */}
        <section className='trending'>
          <div className='section-header'>
            <h2>Trending This Week</h2>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <div className='trending-grid'>
            {trending.map(r => <StandardCard recipe={r} key={r.id} />)}
          </div>
        </section>

        {/* BUDGET */}
        <section className='budget'>
          <div className='section-header'>
            <div>
              <span className='eyebrow'>Editor's picks</span>
              <h2>Dinner for under $3</h2>
            </div>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <div className='budget-row'>
            {budget.map(r => (
              <Link to='/recipes' key={r.id} className='budget-card'>
                <img src={r.image} alt={r.title} />
                <div className='budget-body'>
                  <div className='price-tag'>{formatPrice(r.servingPrice)}/serv</div>
                  <h3>{r.title}</h3>
                  <div className='small-meta'>
                    <span><CgTimer /> {r.totalTime} min</span>
                    <span><AiOutlineStar /> {r.rating.rateValue}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEWSLETTER */}
        <section className='newsletter'>
          <div className='newsletter-inner'>
            <h2>Weekly inspiration in your inbox</h2>
            <p>One curated recipe, one budget tip, one new ingredient to try — every Sunday.</p>
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

export default HomeDiscover
