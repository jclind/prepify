import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineClockCircle, AiOutlineStar } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes, featuredRecipe } from '../mockData'
import { Hero, SectionHeader, formatPrice } from './_shared'
import './HomeMagazine.scss'

const HomeMagazine: FC = () => {
  const side = mockRecipes.slice(0, 2)
  const list = mockRecipes.slice(2, 7)
  return (
    <>
      <Helmet><title>Prepify | Magazine</title></Helmet>
      <div className='v2-page home-magazine'>
        <Hero />

        <section>
          <SectionHeader title='This week on Prepify' sub='The stories and recipes worth your time' />
          <div className='mag-grid'>
            <Link to='/recipes' className='mag-feature'>
              <img src={featuredRecipe.image} alt='' />
              <div className='caption'>
                <span className='eyebrow'>Featured</span>
                <h3>{featuredRecipe.title}</h3>
                <div className='meta'>
                  <span><AiOutlineClockCircle /> {featuredRecipe.totalTime}m</span>
                  <span><AiOutlineStar /> {featuredRecipe.rating.rateValue}</span>
                  <span className='price'>{formatPrice(featuredRecipe.servingPrice)}/serv</span>
                </div>
              </div>
            </Link>

            <div className='mag-side'>
              {side.map(r => (
                <Link to='/recipes' key={r.id} className='mag-side-card'>
                  <img src={r.image} alt='' />
                  <div className='caption'>
                    <h4>{r.title}</h4>
                    <span className='sub'>{r.cuisine} · {r.totalTime}m</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className='mag-list'>
              <span className='list-label'>Quick reads</span>
              {list.map((r, i) => (
                <Link to='/recipes' key={r.id} className='mag-list-item'>
                  <span className='num'>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <span className='title'>{r.title}</span>
                    <span className='sub'>{r.cuisine} · {formatPrice(r.servingPrice)}/serv</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeMagazine
