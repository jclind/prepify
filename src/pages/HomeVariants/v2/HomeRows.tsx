import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeRows.scss'

const rails = [
  { title: 'Trending this week', sub: 'Most cooked right now', items: mockRecipes.slice(0, 8) },
  { title: 'Quick & easy', sub: 'On the table in 30 minutes or less', items: mockRecipes.filter(r => r.totalTime <= 25) },
  { title: 'Budget picks', sub: 'Delicious for under $3 a serving', items: [...mockRecipes].sort((a, b) => a.servingPrice - b.servingPrice).slice(0, 8) },
]

const HomeRows: FC = () => (
  <>
    <Helmet><title>Prepify | Rows</title></Helmet>
    <div className='v2-page home-rows'>
      <Hero />

      {rails.map(rail => (
        <section key={rail.title}>
          <SectionHeader title={rail.title} sub={rail.sub} />
          <div className='rail'>
            {rail.items.map(r => (
              <div className='rail-item' key={r.id + rail.title}>
                <RecipeCard recipe={r} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
    <DesignSwitcher />
  </>
)

export default HomeRows
