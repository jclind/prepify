import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, formatPrice } from './_shared'
import './HomeBudget.scss'

const HomeBudget: FC = () => {
  const [maxPrice, setMaxPrice] = useState(350) // cents
  const matches = mockRecipes
    .filter(r => r.servingPrice <= maxPrice)
    .sort((a, b) => a.servingPrice - b.servingPrice)

  return (
    <>
      <Helmet><title>Prepify | Budget</title></Helmet>
      <div className='v2-page home-budget'>
        <Hero heading='Eat well without blowing the budget.' sub='Every recipe shows its real cost per serving. Set your limit and we’ll show you what fits.' />

        <section className='budget-control'>
          <div className='control-card'>
            <div className='control-head'>
              <span className='label'>Max cost per serving</span>
              <span className='value'>{formatPrice(maxPrice)}</span>
            </div>
            <input
              type='range'
              min={100}
              max={550}
              step={5}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
            />
            <div className='scale'><span>$1.00</span><span>$5.50</span></div>
            <p className='result-count'>
              <strong>{matches.length}</strong> recipes fit your budget
            </p>
          </div>
        </section>

        <section>
          <div className='budget-grid'>
            {matches.map(r => <RecipeCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeBudget
