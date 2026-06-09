import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineClockCircle } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeForYou.scss'

const inProgress = mockRecipes[1]

const HomeForYou: FC = () => (
  <>
    <Helmet><title>Prepify | For You</title></Helmet>
    <div className='v2-page home-foryou'>
      <Hero heading='Welcome back, Jesse.' sub='Picking up where you left off — plus a few new recipes we think you’ll like.' />

      <section className='resume-section'>
        <Link to='/recipes' className='resume-card'>
          <img src={inProgress.image} alt='' />
          <div className='resume-body'>
            <span className='eyebrow'>Continue cooking</span>
            <h3>{inProgress.title}</h3>
            <div className='progress'><div className='bar' style={{ width: '40%' }} /></div>
            <span className='step'>Step 2 of 5 · {inProgress.totalTime}m total</span>
          </div>
          <span className='resume-btn'>Resume →</span>
        </Link>
      </section>

      <section>
        <SectionHeader title='Recommended for you' sub='Based on what you’ve cooked and saved' />
        <div className='grid-4'>
          {mockRecipes.slice(2, 6).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
      </section>

      <section>
        <SectionHeader title='Because you saved Creamy Garlic Tuscan Pasta' sub='More Italian comfort food' />
        <div className='grid-4'>
          {mockRecipes.filter(r => r.cuisine === 'Italian' || r.tags.includes('Comfort Food')).slice(0, 4).map(r => (
            <RecipeCard recipe={r} key={r.id + 'sim'} />
          ))}
        </div>
      </section>

      <section className='goals-strip'>
        <div className='goal'><span className='num'>12</span><span className='lbl'>recipes cooked</span></div>
        <div className='goal'><span className='num'>$47</span><span className='lbl'>saved vs. takeout</span></div>
        <div className='goal'><span className='num'><AiOutlineClockCircle /> 3</span><span className='lbl'>day streak</span></div>
        <div className='goal'><span className='num'>8</span><span className='lbl'>saved for later</span></div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeForYou
