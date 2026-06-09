import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineCheck, AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { FiPlus } from 'react-icons/fi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes } from './mockData'
import './HomePantry.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

type Ingredient = { id: string; label: string; emoji: string }
const PANTRY: Ingredient[] = [
  { id: 'chicken', label: 'Chicken', emoji: '🍗' },
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'rice', label: 'Rice', emoji: '🍚' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'cheese', label: 'Cheese', emoji: '🧀' },
  { id: 'tomato', label: 'Tomatoes', emoji: '🍅' },
  { id: 'spinach', label: 'Spinach', emoji: '🥬' },
  { id: 'garlic', label: 'Garlic', emoji: '🧄' },
  { id: 'onion', label: 'Onion', emoji: '🧅' },
  { id: 'avocado', label: 'Avocado', emoji: '🥑' },
  { id: 'bread', label: 'Bread', emoji: '🍞' },
  { id: 'butter', label: 'Butter', emoji: '🧈' },
  { id: 'beef', label: 'Beef', emoji: '🥩' },
  { id: 'tofu', label: 'Tofu', emoji: '🍱' },
  { id: 'beans', label: 'Beans', emoji: '🫘' },
  { id: 'mushroom', label: 'Mushrooms', emoji: '🍄' },
]

// Mock: each recipe matches some pantry items
const matches: Record<string, string[]> = {
  r1: ['spinach', 'tomato'],
  r2: ['pasta', 'cheese', 'garlic', 'tomato', 'spinach'],
  r3: ['chicken', 'onion'],
  r4: ['tofu', 'rice', 'garlic'],
  r5: ['eggs', 'avocado', 'bread'],
  r6: ['eggs', 'butter'],
  r7: ['tomato', 'beans'],
  r8: ['beef', 'bread', 'cheese'],
  r9: ['eggs'],
  r10: ['mushroom', 'onion', 'garlic'],
  r11: ['chicken', 'cheese'],
  r12: ['beef', 'garlic', 'butter'],
}

const HomePantry: FC = () => {
  const [have, setHave] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const n = new Set(have)
    n.has(id) ? n.delete(id) : n.add(id)
    setHave(n)
  }

  // Sort recipes: highest match ratio first
  const sorted = [...mockRecipes].map(r => {
    const req = matches[r.id] || []
    const matched = req.filter(i => have.has(i)).length
    const score = req.length > 0 ? matched / req.length : 0
    return { recipe: r, matched, total: req.length, score }
  }).sort((a, b) => b.score - a.score || b.matched - a.matched)

  return (
    <>
      <Helmet><title>Prepify | Pantry</title></Helmet>
      <div className='home-pantry'>
        <section className='pantry-hero'>
          <div className='kicker'>Pantry-First</div>
          <h1>What's in your kitchen?</h1>
          <p>Tap what you have. We'll show recipes that fit — best matches first.</p>
          <div className='pantry-chips'>
            {PANTRY.map(i => (
              <button
                key={i.id}
                className={`chip ${have.has(i.id) ? 'active' : ''}`}
                onClick={() => toggle(i.id)}
              >
                <span className='emoji' aria-hidden>{i.emoji}</span>
                <span className='label'>{i.label}</span>
                {have.has(i.id) && <AiOutlineCheck className='check' />}
              </button>
            ))}
            <button className='chip add'>
              <FiPlus />
              <span className='label'>Add more</span>
            </button>
          </div>
          <div className='pantry-summary'>
            {have.size > 0 ? (
              <span><strong>{have.size}</strong> {have.size === 1 ? 'ingredient' : 'ingredients'} in pantry</span>
            ) : (
              <span>Tap ingredients above to start filtering</span>
            )}
          </div>
        </section>

        <section className='matches-section'>
          <h2>{have.size > 0 ? 'Best matches' : 'Browse all recipes'}</h2>
          <div className='matches-grid'>
            {sorted.slice(0, 8).map(({ recipe, matched, total, score }) => (
              <Link to='/recipes' key={recipe.id} className='match-card'>
                <div className='match-img'>
                  <img src={recipe.image} alt={recipe.title} />
                  {have.size > 0 && total > 0 && (
                    <div className={`match-badge ${score === 1 ? 'full' : score >= 0.5 ? 'half' : 'low'}`}>
                      {matched}/{total} match
                    </div>
                  )}
                </div>
                <div className='match-body'>
                  <h3>{recipe.title}</h3>
                  <div className='match-meta'>
                    <span><CgTimer /> {recipe.totalTime}m</span>
                    <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
                    <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
                  </div>
                  {have.size > 0 && (
                    <div className='match-bar'>
                      <div className='match-fill' style={{ width: `${score * 100}%` }} />
                    </div>
                  )}
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

export default HomePantry
