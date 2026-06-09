import React, { FC, useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar, AiOutlineUser, AiOutlineHeart } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiBookmark, BiShare, BiArrowFromBottom, BiArrowFromTop } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes } from './mockData'
import './HomeFeed.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const HomeFeed: FC = () => {
  const recipes = mockRecipes.slice(0, 6)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const slides = document.querySelectorAll<HTMLElement>('.feed-card')
      let curr = 0
      slides.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight / 2) curr = i
      })
      setActive(curr)
    }
    const container = document.querySelector('.feed-stack')
    container?.addEventListener('scroll', onScroll)
    return () => container?.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (i: number) => {
    const target = document.querySelectorAll<HTMLElement>('.feed-card')[i]
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <Helmet><title>Prepify | Feed</title></Helmet>
      <div className='home-feed'>
        <div className='feed-stack'>
          {recipes.map((r, i) => (
            <div
              key={r.id}
              className='feed-card'
              style={{ backgroundImage: `url(${r.image})` }}
            >
              <div className='feed-overlay'>
                <div className='feed-top'>
                  <span className='feed-cuisine'>{r.cuisine}</span>
                  <span className='feed-counter'>{i + 1} / {recipes.length}</span>
                </div>
                <div className='feed-bottom'>
                  <h1>{r.title}</h1>
                  <p>{r.tags.slice(0, 3).join(' · ')}</p>
                  <div className='feed-meta'>
                    <span><AiOutlineUser /> @{r.author}</span>
                    <span><CgTimer /> {r.totalTime} min</span>
                    <span><AiOutlineStar /> {r.rating.rateValue} ({r.rating.rateCount})</span>
                    <span className='price'>{formatPrice(r.servingPrice)}/serv</span>
                  </div>
                  <div className='feed-actions'>
                    <Link to='/recipes' className='primary'>View recipe</Link>
                    <button className='icon-btn' aria-label='Save'><BiBookmark /></button>
                    <button className='icon-btn' aria-label='Like'><AiOutlineHeart /></button>
                    <button className='icon-btn' aria-label='Share'><BiShare /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='feed-nav'>
          <button
            className='feed-nav-btn'
            disabled={active === 0}
            onClick={() => scrollTo(Math.max(0, active - 1))}
            aria-label='Previous recipe'
          >
            <BiArrowFromBottom />
          </button>
          <div className='feed-dots'>
            {recipes.map((_, i) => (
              <button
                key={i}
                className={`feed-dot ${i === active ? 'active' : ''}`}
                onClick={() => scrollTo(i)}
                aria-label={`Recipe ${i + 1}`}
              />
            ))}
          </div>
          <button
            className='feed-nav-btn'
            disabled={active === recipes.length - 1}
            onClick={() => scrollTo(Math.min(recipes.length - 1, active + 1))}
            aria-label='Next recipe'
          >
            <BiArrowFromTop />
          </button>
        </div>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeFeed
