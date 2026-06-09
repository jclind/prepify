import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineSearch } from 'react-icons/ai'
import { BsStars } from 'react-icons/bs'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes, MockRecipe } from '../mockData'
import { RecipeCard } from './_shared'
import './HomeAssistant.scss'

const prompts: { label: string; reply: string; picks: MockRecipe[] }[] = [
  { label: 'I have chicken & peppers', reply: 'Nice — here are three quick dinners using chicken and peppers:', picks: mockRecipes.filter(r => /chicken|fajita/i.test(r.title)).concat(mockRecipes.slice(2, 4)).slice(0, 3) },
  { label: 'Something quick & cheap', reply: 'On a budget and short on time? These are all under 25 minutes and under $3 a serving:', picks: mockRecipes.filter(r => r.totalTime <= 25 && r.servingPrice < 300).slice(0, 3) },
  { label: 'High-protein dinner', reply: 'Here are some protein-packed dinners to keep you full:', picks: mockRecipes.filter(r => r.tags.includes('High Protein')).slice(0, 3) },
  { label: 'Cozy comfort food', reply: 'Comfort food coming right up:', picks: mockRecipes.filter(r => r.tags.includes('Comfort Food') || r.tags.includes('Cozy')).slice(0, 3) },
]

const HomeAssistant: FC = () => {
  const [active, setActive] = useState<number | null>(null)
  const current = active === null ? null : prompts[active]

  return (
    <>
      <Helmet><title>Prepify | Assistant</title></Helmet>
      <div className='home-assistant'>
        <section className='assistant-stage'>
          <div className='assistant-inner'>
            <span className='badge'><BsStars /> Prepify Assistant</span>
            <h1>Tell me what you have, and I’ll tell you what to cook.</h1>

            <form className='assistant-input' onSubmit={e => e.preventDefault()}>
              <AiOutlineSearch className='icon' />
              <input placeholder='e.g. “I have salmon and 20 minutes”' />
              <button type='submit'>Ask</button>
            </form>

            <div className='prompt-chips'>
              {prompts.map((p, i) => (
                <button
                  key={p.label}
                  className={`prompt-chip ${active === i ? 'active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {current && (
              <div className='assistant-reply'>
                <p className='reply-text'><BsStars /> {current.reply}</p>
                <div className='reply-grid'>
                  {current.picks.map(r => <RecipeCard recipe={r} key={r.id} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeAssistant
