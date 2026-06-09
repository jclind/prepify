import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { BsPlus } from 'react-icons/bs'
import DesignSwitcher from '../DesignSwitcher'
import { weeklyPlan } from '../mockData'
import { Hero, formatPrice } from './_shared'
import './HomePlanner.scss'

const slots = ['breakfast', 'lunch', 'dinner'] as const

const HomePlanner: FC = () => {
  const weekTotal = weeklyPlan.reduce((sum, day) => {
    return sum + slots.reduce((s, slot) => s + (day[slot]?.servingPrice ?? 0), 0)
  }, 0)
  const planned = weeklyPlan.reduce((n, day) => n + slots.filter(s => day[s]).length, 0)

  return (
    <>
      <Helmet><title>Prepify | Meal Planner</title></Helmet>
      <div className='v2-page home-planner'>
        <Hero heading='Plan your whole week in one place.' sub='Drag recipes into your week, get one combined shopping list, and know the cost before you shop.' placeholder='Search recipes to add' />

        <section className='planner-section'>
          <div className='planner-head'>
            <div>
              <h2>This week’s plan</h2>
              <p>{planned} meals planned · est. {formatPrice(weekTotal)} total</p>
            </div>
            <div className='planner-actions'>
              <button className='ghost'>Auto-fill my week</button>
              <Link to='/recipes' className='primary'>Build shopping list →</Link>
            </div>
          </div>

          <div className='week-grid'>
            {weeklyPlan.map(day => (
              <div className='day-col' key={day.day}>
                <div className='day-label'>{day.day}</div>
                {slots.map(slot => {
                  const r = day[slot]
                  return r ? (
                    <Link to='/recipes' className='meal-cell filled' key={slot}>
                      <img src={r.image} alt='' />
                      <span className='cell-title'>{r.title}</span>
                      <span className='cell-price'>{formatPrice(r.servingPrice)}</span>
                    </Link>
                  ) : (
                    <button className='meal-cell empty' key={slot}>
                      <BsPlus /> Add {slot}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomePlanner
