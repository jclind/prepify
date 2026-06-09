import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeCollections.scss'

const collections = [
  { title: '5 weeknight dinners under $3', count: 5, images: [mockRecipes[1], mockRecipes[2], mockRecipes[3]] },
  { title: 'High-protein lunches', count: 8, images: [mockRecipes[0], mockRecipes[6], mockRecipes[10]] },
  { title: 'Cozy comfort classics', count: 12, images: [mockRecipes[9], mockRecipes[1], mockRecipes[7]] },
  { title: 'No-cook summer meals', count: 6, images: [mockRecipes[6], mockRecipes[8], mockRecipes[4]] },
]

const HomeCollections: FC = () => (
  <>
    <Helmet><title>Prepify | Collections</title></Helmet>
    <div className='v2-page home-collections'>
      <Hero />

      <section>
        <SectionHeader title='Curated collections' sub='Hand-built recipe lists for every occasion' />
        <div className='coll-grid'>
          {collections.map(c => (
            <Link to='/recipes' key={c.title} className='coll-card'>
              <div className='coll-images'>
                {c.images.map((r, i) => <img src={r.image} alt='' key={i} />)}
              </div>
              <div className='coll-body'>
                <h3>{c.title}</h3>
                <span className='count'>{c.count} recipes</span>
              </div>
            </Link>
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

export default HomeCollections
