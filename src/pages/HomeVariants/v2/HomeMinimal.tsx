import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeMinimal.scss'

const tagCloud = ['Vegetarian', 'Under 30 min', 'High Protein', 'Comfort Food', 'Budget', 'One-Pan', 'Vegan', 'Quick Dinner']

const HomeMinimal: FC = () => (
  <>
    <Helmet><title>Prepify | Minimal+</title></Helmet>
    <div className='v2-page home-minimal'>
      <Hero />

      <section>
        <SectionHeader title='Trending this week' sub='The recipes everyone’s cooking' />
        <div className='grid-4'>
          {mockRecipes.slice(0, 8).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
        <div className='load-more'>
          <Link to='/recipes' className='ghost-btn'>Browse all 10,000+ recipes →</Link>
        </div>
      </section>

      <section className='tags-row'>
        <span className='label'>Popular right now:</span>
        <div className='tag-cloud'>
          {tagCloud.map(t => <Link to='/recipes' key={t} className='tag'>{t}</Link>)}
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeMinimal
