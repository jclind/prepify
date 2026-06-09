import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { BiChevronRight } from 'react-icons/bi'
import HomeHero from 'src/pages/Home/HomeHero/HomeHero'
import DesignSwitcher from '../DesignSwitcher'
import WarmTrending from './WarmTrending'
import WarmBrowseByMeal from './WarmBrowseByMeal'
import './HomeWarm.scss'

const HomeWarm: FC = () => (
  <>
    <Helmet><title>Prepify | Home</title></Helmet>
    <div className='page home-page home-warm'>
      <HomeHero />

      <section className='warm-section'>
        <div className='warm-header'>
          <div>
            <h2>Trending this week</h2>
            <p>What the community is cooking right now</p>
          </div>
          <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
        </div>
        <WarmTrending />
      </section>

      <section className='warm-section'>
        <div className='warm-header'>
          <div>
            <h2>Browse by meal</h2>
            <p>Pick a slot and go</p>
          </div>
        </div>
        <WarmBrowseByMeal />
      </section>

      <section className='warm-section view-all-section'>
        <Link to='/recipes' className='view-all-btn'>
          View all recipes <BiChevronRight />
        </Link>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeWarm
