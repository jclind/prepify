import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeSeasonal.scss'

const seasonal = ['Strawberries', 'Asparagus', 'Zucchini', 'Cherries', 'Fresh basil', 'Sweet corn', 'Peaches']

const HomeSeasonal: FC = () => (
  <>
    <Helmet><title>Prepify | Seasonal</title></Helmet>
    <div className='v2-page home-seasonal'>
      <Hero />

      <section className='season-band-wrap'>
        <div className='season-band'>
          <div className='season-intro'>
            <span className='eyebrow'>In season · June</span>
            <h2>Cook with what’s fresh right now</h2>
            <p>Peak-season produce tastes better and costs less. Here’s what’s good this month.</p>
          </div>
          <div className='season-chips'>
            {seasonal.map(s => <Link to='/recipes' key={s} className='season-chip'>{s}</Link>)}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title='Bright & seasonal' sub='Recipes that make the most of June produce' />
        <div className='grid-4'>
          {mockRecipes.filter(r => r.tags.some(t => /vegan|veget|gluten|no-cook/i.test(t))).slice(0, 4).map(r => (
            <RecipeCard recipe={r} key={r.id} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title='Trending this week' />
        <div className='grid-4'>
          {mockRecipes.slice(0, 4).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeSeasonal
