import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineClockCircle, AiOutlineStar } from 'react-icons/ai'
import { BsShuffle } from 'react-icons/bs'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, formatPrice } from './_shared'
import './HomeSurprise.scss'

const HomeSurprise: FC = () => {
  const [idx, setIdx] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const pick = mockRecipes[idx]

  const spin = () => {
    setSpinning(true)
    let ticks = 0
    const iv = setInterval(() => {
      setIdx(Math.floor(Math.random() * mockRecipes.length))
      if (++ticks > 8) {
        clearInterval(iv)
        setSpinning(false)
      }
    }, 80)
  }

  return (
    <>
      <Helmet><title>Prepify | Surprise Me</title></Helmet>
      <div className='v2-page home-surprise'>
        <Hero heading='Can’t decide what to cook?' sub='Let us pick for you. One tap, one great recipe.' />

        <section className='surprise-section'>
          <div className={`surprise-card ${spinning ? 'spinning' : ''}`}>
            <img src={pick.image} alt={pick.title} />
            <div className='surprise-body'>
              <span className='eyebrow'>Tonight you should cook…</span>
              <h2>{pick.title}</h2>
              <div className='meta'>
                <span><AiOutlineClockCircle /> {pick.totalTime}m</span>
                <span><AiOutlineStar /> {pick.rating.rateValue}</span>
                <span className='price'>{formatPrice(pick.servingPrice)}/serv</span>
                <span className='cuisine'>{pick.cuisine}</span>
              </div>
              <div className='surprise-actions'>
                <button onClick={spin} disabled={spinning}><BsShuffle /> Surprise me again</button>
                <Link to='/recipes' className='view'>View recipe →</Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className='or-title'>…or browse a few favourites</h3>
          <div className='grid-4'>
            {mockRecipes.slice(0, 4).map(r => <RecipeCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeSurprise
