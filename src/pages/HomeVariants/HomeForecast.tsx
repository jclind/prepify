import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiTimer } from 'react-icons/bi'
import { WiDaySunny, WiDayCloudy, WiNightClear } from 'react-icons/wi'
import { GiCookingPot } from 'react-icons/gi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes } from './mockData'
import './HomeForecast.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const HomeForecast: FC = () => {
  const now = new Date()
  const hour = now.getHours()
  const timeLabel = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const slots = [
    { id: 'morning', label: 'Morning', time: '7–11 am', icon: <WiDaySunny />, mealLabel: 'Breakfast', recipe: mockRecipes[4] },
    { id: 'afternoon', label: 'Afternoon', time: '12–4 pm', icon: <WiDayCloudy />, mealLabel: 'Lunch', recipe: mockRecipes[6] },
    { id: 'evening', label: 'Evening', time: '5–9 pm', icon: <WiNightClear />, mealLabel: 'Dinner', recipe: mockRecipes[1] },
  ]
  const activeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const currentSlot = slots.find(s => s.id === activeSlot)!

  return (
    <>
      <Helmet><title>Prepify | Forecast</title></Helmet>
      <div className='home-forecast'>
        <section className='forecast-hero'>
          <div className='forecast-meta'>
            <div className='date'>
              {now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className='greeting'>Good {timeLabel.toLowerCase()}, hungry one.</div>
          </div>
          <div className='now-card'>
            <div className='now-label'>Now · {timeLabel.toLowerCase()}</div>
            <div className='now-meal'>
              <span className='now-icon'>{currentSlot.icon}</span>
              <div>
                <div className='now-title'>{currentSlot.mealLabel} time</div>
                <div className='now-sub'>Recommended: {currentSlot.recipe.title}</div>
              </div>
            </div>
            <div className='now-stats'>
              <div className='now-stat'>
                <BiTimer />
                <div><strong>{currentSlot.recipe.totalTime}m</strong><span>cook time</span></div>
              </div>
              <div className='now-stat'>
                <GiCookingPot />
                <div><strong>{formatPrice(currentSlot.recipe.servingPrice)}</strong><span>per serving</span></div>
              </div>
              <div className='now-stat'>
                <AiOutlineStar />
                <div><strong>{currentSlot.recipe.rating.rateValue}</strong><span>{currentSlot.recipe.rating.rateCount} reviews</span></div>
              </div>
            </div>
            <Link to='/recipes' className='now-cta'>View recipe →</Link>
          </div>
        </section>

        <section className='daily-forecast'>
          <h2>Today's forecast</h2>
          <div className='forecast-cards'>
            {slots.map(s => (
              <div className={`f-card ${s.id === activeSlot ? 'active' : ''}`} key={s.id}>
                <div className='f-card-head'>
                  <span className='f-icon'>{s.icon}</span>
                  <div>
                    <div className='f-label'>{s.label}</div>
                    <div className='f-time'>{s.time}</div>
                  </div>
                </div>
                <div className='f-card-body'>
                  <img src={s.recipe.image} alt='' />
                  <div className='f-recipe'>
                    <span className='meal-tag'>{s.mealLabel}</span>
                    <h3>{s.recipe.title}</h3>
                    <div className='f-meta'>
                      <span><CgTimer /> {s.recipe.totalTime}m</span>
                      <span className='price'>{formatPrice(s.recipe.servingPrice)}/serv</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className='conditions'>
          <h2>This week's conditions</h2>
          <div className='cond-grid'>
            <div className='cond high'>
              <div className='cond-label'>Budget pressure</div>
              <div className='cond-value'>High</div>
              <div className='cond-sub'>21 budget-friendly recipes available</div>
            </div>
            <div className='cond mid'>
              <div className='cond-label'>Time available</div>
              <div className='cond-value'>Moderate</div>
              <div className='cond-sub'>Filter shown to recipes under 45 min</div>
            </div>
            <div className='cond low'>
              <div className='cond-label'>Adventurousness</div>
              <div className='cond-value'>Low</div>
              <div className='cond-sub'>Leaning into comfort food this week</div>
            </div>
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeForecast
