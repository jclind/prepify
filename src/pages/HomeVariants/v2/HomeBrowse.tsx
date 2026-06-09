import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes, moods } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeBrowse.scss'

const HomeBrowse: FC = () => (
  <>
    <Helmet><title>Prepify | Browse</title></Helmet>
    <div className='v2-page home-browse'>
      <Hero sub='Start with a craving — we’ll handle the rest.' />

      <section>
        <SectionHeader title='Start somewhere' sub='Pick a vibe and dive in' />
        <div className='browse-grid'>
          {moods.map(m => (
            <Link to='/recipes' key={m.id} className='browse-tile' style={{ ['--accent' as string]: m.color }}>
              <img src={m.image} alt='' />
              <div className='overlay'>
                <h3>{m.label}</h3>
                <p>{m.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title='Trending this week' sub='Fresh from the community' />
        <div className='grid-4'>
          {mockRecipes.slice(0, 8).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeBrowse
