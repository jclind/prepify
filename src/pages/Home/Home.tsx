import { ChevronRightIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
} from 'src/util/seo'
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
        <title>{DEFAULT_TITLE}</title>
        <meta name='description' content={DEFAULT_DESCRIPTION} />
        <link rel='canonical' href={`${SITE_URL}/`} />
        {/* Default branded link preview for the home route. The static
            index.html copies are stripped on JS boot, so this is the live
            source once the app mounts. */}
        <meta property='og:type' content='website' />
        <meta property='og:title' content={DEFAULT_TITLE} />
        <meta property='og:description' content={DEFAULT_DESCRIPTION} />
        <meta property='og:image' content={DEFAULT_OG_IMAGE} />
        <meta property='og:url' content={`${SITE_URL}/`} />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={DEFAULT_TITLE} />
        <meta name='twitter:description' content={DEFAULT_DESCRIPTION} />
        <meta name='twitter:image' content={DEFAULT_OG_IMAGE} />
      </Helmet>
      <div className='page home-page'>
        <HomeHero />

        <HomeForYou />

        <section className='home-section'>
          <div className='home-section-header'>
            <h2>Trending this week</h2>
            <p>What the community is cooking right now</p>
            <Link to='/recipes' className='see-all'>See all <ChevronRightIcon /></Link>
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
            View all recipes <ChevronRightIcon />
          </Link>
        </section>
      </div>
    </>
  )
}

export default Home
