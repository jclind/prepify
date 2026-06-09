import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineSearch } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { moods, mockRecipes } from '../mockData'
import { RecipeCard } from './_shared'
import './HomeMood.scss'

const HomeMood: FC = () => {
  const [active, setActive] = useState(moods[0].id)
  return (
    <>
      <Helmet><title>Prepify | Mood</title></Helmet>
      <div className='home-mood'>
        <section className='mood-landing'>
          <div className='mood-intro'>
            <h1>What are you in the mood for?</h1>
            <form className='v2-search mood-search' onSubmit={e => e.preventDefault()}>
              <AiOutlineSearch className='icon' />
              <input placeholder='Or search all recipes' />
              <button type='submit'>Search</button>
            </form>
          </div>
          <div className='mood-tiles'>
            {moods.map(m => (
              <button
                key={m.id}
                className={`mood-tile ${active === m.id ? 'active' : ''}`}
                style={{ ['--accent' as string]: m.color }}
                onClick={() => setActive(m.id)}
              >
                <img src={m.image} alt='' />
                <span className='tile-overlay'>
                  <span className='tile-label'>{m.label}</span>
                  <span className='tile-blurb'>{m.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className='mood-results'>
          <h2>{moods.find(m => m.id === active)?.label} picks</h2>
          <div className='grid-4'>
            {mockRecipes.slice(0, 4).map(r => <RecipeCard recipe={r} key={r.id} />)}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeMood
