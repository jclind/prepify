import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineClockCircle, AiOutlineStar } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, formatPrice } from './_shared'
import './HomeBistro.scss'

const HomeBistro: FC = () => (
  <>
    <Helmet><title>Prepify | Bistro</title></Helmet>
    <div className='home-bistro'>
      <Hero />

      <section className='bistro-intro'>
        <span className='eyebrow'>From the Prepify kitchen</span>
        <h2>Good food doesn’t have to be complicated — or expensive.</h2>
        <p>Every recipe comes with a real per-serving cost, so you always know what dinner actually costs.</p>
      </section>

      <section className='bistro-grid-section'>
        <h3 className='row-title'>Trending this week</h3>
        <div className='bistro-grid'>
          {mockRecipes.slice(0, 6).map(r => (
            <Link to='/recipes' key={r.id} className='bistro-card'>
              <img src={r.image} alt={r.title} />
              <div className='body'>
                <h4>{r.title}</h4>
                <div className='meta'>
                  <span><AiOutlineClockCircle /> {r.totalTime}m</span>
                  <span><AiOutlineStar /> {r.rating.rateValue}</span>
                  <span className='price'>{formatPrice(r.servingPrice)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className='cta-row'>
          <Link to='/recipes' className='bistro-btn'>Explore the full menu →</Link>
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeBistro
