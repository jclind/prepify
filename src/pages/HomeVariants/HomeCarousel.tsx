import React, { FC, useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineSearch, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes, MockRecipe } from './mockData'
import './HomeCarousel.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const slides = mockRecipes.slice(0, 4)

const CarouselCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='carousel-card'>
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

const HomeCarousel: FC = () => {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setIdx(i => (i + 1) % slides.length), 5000)
    return () => window.clearInterval(id)
  }, [paused])

  const next = () => setIdx((idx + 1) % slides.length)
  const prev = () => setIdx((idx - 1 + slides.length) % slides.length)

  const trending = mockRecipes.slice(4, 8)

  return (
    <>
      <Helmet><title>Prepify | Home</title></Helmet>
      <div className='home-carousel'>
        <section
          className='carousel-hero'
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className='carousel-track' style={{ transform: `translateX(-${idx * 100}%)` }}>
            {slides.map(s => (
              <div className='carousel-slide' key={s.id} style={{ backgroundImage: `url(${s.image})` }}>
                <div className='slide-overlay'>
                  <div className='slide-content'>
                    <span className='badge'>Featured Recipe</span>
                    <h1>{s.title}</h1>
                    <div className='slide-meta'>
                      <span><AiOutlineUser /> @{s.author}</span>
                      <span><CgTimer /> {s.totalTime} min</span>
                      <span><AiOutlineStar /> {s.rating.rateValue} ({s.rating.rateCount})</span>
                      <span className='price'>{formatPrice(s.servingPrice)}/serv</span>
                    </div>
                    <Link to='/recipes' className='slide-cta'>View recipe →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className='nav-btn left' onClick={prev} aria-label='Previous'><BiChevronLeft /></button>
          <button className='nav-btn right' onClick={next} aria-label='Next'><BiChevronRight /></button>
          <div className='dots'>
            {slides.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === idx ? 'active' : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </section>

        <section className='search-bar-section'>
          <form className='search-form' onSubmit={e => e.preventDefault()}>
            <AiOutlineSearch className='icon' />
            <input placeholder='Search 10,000+ recipes' />
            <button type='submit'>Search</button>
          </form>
        </section>

        <section className='trending-section'>
          <div className='section-header'>
            <h2>Trending this week</h2>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <div className='trending-grid'>
            {trending.map(r => <CarouselCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeCarousel
