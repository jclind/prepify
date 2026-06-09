import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiChevronRight } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes } from './mockData'
import './HomeAtlas.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

type Cuisine = {
  id: string
  label: string
  flag: string
  color: string
  count: number
  signature: string
}

const cuisines: Cuisine[] = [
  { id: 'italian', label: 'Italian', flag: '🇮🇹', color: '#c44536', count: 412, signature: 'Pasta, risotto, pizza' },
  { id: 'mexican', label: 'Mexican', flag: '🇲🇽', color: '#e07a3f', count: 287, signature: 'Tacos, salsa, mole' },
  { id: 'japanese', label: 'Japanese', flag: '🇯🇵', color: '#8b4a8c', count: 215, signature: 'Ramen, sushi, donburi' },
  { id: 'thai', label: 'Thai', flag: '🇹🇭', color: '#2a9d8f', count: 198, signature: 'Curries, pad thai, salads' },
  { id: 'indian', label: 'Indian', flag: '🇮🇳', color: '#d4731e', count: 324, signature: 'Curries, biryani, naan' },
  { id: 'french', label: 'French', flag: '🇫🇷', color: '#4a6ea9', count: 156, signature: 'Sauces, pastry, classics' },
  { id: 'chinese', label: 'Chinese', flag: '🇨🇳', color: '#b8261c', count: 268, signature: 'Stir-fry, dumplings, noodles' },
  { id: 'korean', label: 'Korean', flag: '🇰🇷', color: '#5d4a8c', count: 145, signature: 'BBQ, bibimbap, kimchi' },
  { id: 'greek', label: 'Greek', flag: '🇬🇷', color: '#3a6da8', count: 132, signature: 'Souvlaki, salads, dips' },
  { id: 'vietnamese', label: 'Vietnamese', flag: '🇻🇳', color: '#288c5c', count: 121, signature: 'Pho, banh mi, fresh rolls' },
  { id: 'spanish', label: 'Spanish', flag: '🇪🇸', color: '#d4a91e', count: 98, signature: 'Tapas, paella, jamón' },
  { id: 'american', label: 'American', flag: '🇺🇸', color: '#2c5f9e', count: 487, signature: 'BBQ, sandwiches, comfort' },
]

const HomeAtlas: FC = () => {
  const [hovered, setHovered] = useState<string | null>(null)
  const hoveredCuisine = cuisines.find(c => c.id === hovered)
  const topRecipes = mockRecipes.slice(0, 3)

  return (
    <>
      <Helmet><title>Prepify | Atlas</title></Helmet>
      <div className='home-atlas'>
        <section className='atlas-hero'>
          <div className='kicker'>Cuisine Atlas</div>
          <h1>Eat your way around the world.</h1>
          <p>10,247 recipes across 32 cuisines, one tile at a time.</p>
        </section>

        <section className='atlas-grid-section'>
          <div className='atlas-grid'>
            {cuisines.map(c => (
              <Link
                to='/recipes'
                key={c.id}
                className='atlas-tile'
                style={{ backgroundColor: c.color }}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className='tile-flag'>{c.flag}</div>
                <div className='tile-body'>
                  <h3>{c.label}</h3>
                  <p>{c.signature}</p>
                  <div className='tile-foot'>
                    <span>{c.count} recipes</span>
                    <BiChevronRight />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className='atlas-feature'>
          <div className='feature-head'>
            <h2>
              {hoveredCuisine ? `Top recipes from ${hoveredCuisine.label}` : 'Top recipes from around the world'}
            </h2>
            <Link to='/recipes' className='see-all'>Browse all <BiChevronRight /></Link>
          </div>
          <div className='feature-grid'>
            {topRecipes.map(r => (
              <Link to='/recipes' key={r.id} className='feature-card'>
                <img src={r.image} alt={r.title} />
                <div className='feature-body'>
                  <span className='feature-cuisine' style={{ backgroundColor: hoveredCuisine?.color || '#303841' }}>
                    {hoveredCuisine ? `${hoveredCuisine.flag} ${hoveredCuisine.label}` : r.cuisine}
                  </span>
                  <h3>{r.title}</h3>
                  <div className='feature-meta'>
                    <span><CgTimer /> {r.totalTime}m</span>
                    <span><AiOutlineStar /> {r.rating.rateValue}</span>
                    <span className='price'>{formatPrice(r.servingPrice)}/serv</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeAtlas
