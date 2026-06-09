import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard } from './_shared'
import './HomeNutrition.scss'

const goals = [
  { label: 'High protein', match: 'High Protein' },
  { label: 'Vegetarian', match: 'Vegetarian' },
  { label: 'Vegan', match: 'Vegan' },
  { label: 'Gluten-free', match: 'Gluten-Free' },
]

const HomeNutrition: FC = () => {
  const [active, setActive] = useState<string[]>(['High Protein'])
  const toggle = (m: string) =>
    setActive(a => (a.includes(m) ? a.filter(x => x !== m) : [...a, m]))

  const matches = active.length
    ? mockRecipes.filter(r => active.every(m => r.tags.includes(m)))
    : mockRecipes

  return (
    <>
      <Helmet><title>Prepify | Nutrition</title></Helmet>
      <div className='v2-page home-nutrition'>
        <Hero heading='Eat for your goals.' sub='Filter recipes by what matters to you — protein, diet, and more, with full nutrition on every recipe.' />

        <section className='macro-control'>
          <div className='macro-card'>
            <h2>What are you aiming for?</h2>
            <div className='goal-chips'>
              {goals.map(g => (
                <button
                  key={g.match}
                  className={`goal-chip ${active.includes(g.match) ? 'active' : ''}`}
                  onClick={() => toggle(g.match)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className='macro-bars'>
              <div className='macro'><span className='m-label'>Protein</span><div className='track'><div className='fill protein' style={{ width: '72%' }} /></div><span className='m-val'>32g avg</span></div>
              <div className='macro'><span className='m-label'>Carbs</span><div className='track'><div className='fill carbs' style={{ width: '45%' }} /></div><span className='m-val'>38g avg</span></div>
              <div className='macro'><span className='m-label'>Calories</span><div className='track'><div className='fill cals' style={{ width: '52%' }} /></div><span className='m-val'>480 avg</span></div>
            </div>
          </div>
        </section>

        <section>
          <p className='match-count'>{matches.length} recipes match your goals</p>
          <div className='grid-4'>
            {matches.map(r => <RecipeCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeNutrition
