import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineClockCircle, AiOutlineStar } from 'react-icons/ai'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes, featuredRecipe } from '../mockData'
import { Hero, RecipeCard, SectionHeader, formatPrice } from './_shared'
import './HomeEditorial.scss'

const tagCloud = ['Vegetarian', 'Italian', 'Comfort Food', 'High Protein', 'One-Pan', 'Gluten-Free', 'Asian', 'Quick Dinner', 'Mexican', 'Vegan', 'Mediterranean']

const HomeEditorial: FC = () => (
  <>
    <Helmet><title>Prepify | Editorial</title></Helmet>
    <div className='v2-page home-editorial'>
      <Hero />

      <section>
        <SectionHeader title='The featured recipe' sub='Hand-picked by our editors' />
        <Link to='/recipes' className='feature-split'>
          <img src={featuredRecipe.image} alt={featuredRecipe.title} />
          <div className='feature-text'>
            <span className='eyebrow'>{featuredRecipe.cuisine} · {featuredRecipe.tags[0]}</span>
            <h3>{featuredRecipe.title}</h3>
            <p>{featuredRecipe.description}</p>
            <div className='feature-meta'>
              <span><AiOutlineClockCircle /> {featuredRecipe.totalTime} min</span>
              <span><AiOutlineStar /> {featuredRecipe.rating.rateValue} ({featuredRecipe.rating.rateCount})</span>
              <span className='price'>{formatPrice(featuredRecipe.servingPrice)} / serving</span>
            </div>
            <span className='cta'>Read the recipe →</span>
          </div>
        </Link>
      </section>

      <section>
        <SectionHeader title='More to explore' sub='Fresh ideas across every cuisine' />
        <div className='grid-3'>
          {mockRecipes.slice(0, 6).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
      </section>

      <section>
        <SectionHeader title='Browse by tag' />
        <div className='tag-cloud'>
          {tagCloud.map(t => <Link to='/recipes' key={t} className='tag'>{t}</Link>)}
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeEditorial
