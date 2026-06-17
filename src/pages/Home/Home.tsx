import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { BiChevronRight } from 'react-icons/bi'
import HomeHero from 'src/pages/Home/HomeHero/HomeHero'
import HomeForYou from 'src/pages/Home/HomeForYou'
import HomeTrending from 'src/pages/Home/HomeTrending'
import HomeBrowseByMeal from 'src/pages/Home/HomeBrowseByMeal'
import './Home.scss'

const Home: FC = () => {
  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Home</title>
        <link rel='canonical' href='https://www.prepifymeals.com/' />
      </Helmet>
      <div className='page home-page'>
        <HomeHero />

        <HomeForYou />

        <section className='home-section'>
          <div className='home-section-header'>
            <h2>Trending this week</h2>
            <p>What the community is cooking right now</p>
            <Link to='/recipes' className='see-all'>See all <BiChevronRight /></Link>
          </div>
          <HomeTrending />
        </section>

        <section className='home-section'>
          <div className='home-section-header'>
            <h2>Browse by meal</h2>
            <p>Pick a slot and go</p>
          </div>
          <HomeBrowseByMeal />
        </section>

        <section className='home-section home-view-all-section'>
          <Link to='/recipes' className='home-view-all'>
            View all recipes <BiChevronRight />
          </Link>
        </section>
      </div>
    </>
  )
}

export default Home
