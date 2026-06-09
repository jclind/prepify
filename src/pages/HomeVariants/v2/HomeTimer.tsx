import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard } from './_shared'
import './HomeTimer.scss'

const options = [
  { label: '15 min', max: 15 },
  { label: '30 min', max: 30 },
  { label: '45 min', max: 45 },
  { label: 'Any time', max: Infinity },
]

const HomeTimer: FC = () => {
  const [max, setMax] = useState(30)
  const matches = mockRecipes.filter(r => r.totalTime <= max).sort((a, b) => a.totalTime - b.totalTime)

  return (
    <>
      <Helmet><title>Prepify | Time-based</title></Helmet>
      <div className='v2-page home-timer'>
        <Hero heading='How much time do you have tonight?' sub='Tell us your window and we’ll only show recipes that fit.' />

        <section className='timer-control'>
          <div className='time-chips'>
            {options.map(o => (
              <button
                key={o.label}
                className={`time-chip ${max === o.max ? 'active' : ''}`}
                onClick={() => setMax(o.max)}
              >
                <AiOutlineClockCircle /> {o.label}
              </button>
            ))}
          </div>
          <p className='count'>{matches.length} recipes ready in {max === Infinity ? 'any time' : `${max} minutes or less`}</p>
        </section>

        <section>
          <div className='grid-4'>
            {matches.map(r => <RecipeCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeTimer
