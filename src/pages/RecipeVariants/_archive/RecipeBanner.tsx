import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiTimer } from 'react-icons/bi'
import { FiMinus, FiPlus } from 'react-icons/fi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeBanner.scss'

const RecipeBanner: FC = () => {
  const r = mockRecipe
  const [servings, setServings] = useState(r.servings)

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-banner'>
        <div className='banner-hero' style={{ backgroundImage: `url(${r.image})` }}>
          <div className='banner-overlay'>
            <div className='banner-content'>
              <div className='cuisine'>{r.cuisine} · {r.totalTime} minutes</div>
              <h1>{r.title}</h1>
              <p>{r.description}</p>
              <div className='quick-meta'>
                <span><AiOutlineStar /> {r.rating.rateValue} ({r.rating.rateCount})</span>
                <span><AiOutlineUser /> @{r.author}</span>
                <span className='price'>{formatPrice(r.servingPrice)}/serving</span>
              </div>
              <div className='actions'>
                <button className='primary'><BiBookmark /> Save recipe</button>
                <button className='ghost'><AiOutlineStar /> Rate</button>
                <button className='ghost'><BiPrinter /> Print</button>
              </div>
            </div>
          </div>
        </div>

        <div className='quick-stats'>
          <div className='qstat'>
            <BiTimer />
            <div><div className='num'>{r.prepTime}m</div><div className='label'>prep</div></div>
          </div>
          <div className='qstat'>
            <AiOutlineClockCircle />
            <div><div className='num'>{r.cookTime}m</div><div className='label'>cook</div></div>
          </div>
          <div className='qstat'>
            <AiOutlineUser />
            <div><div className='num'>{r.servings}</div><div className='label'>serves</div></div>
          </div>
          <div className='qstat'>
            <AiOutlineStar />
            <div><div className='num'>{r.rating.rateValue}</div><div className='label'>rated</div></div>
          </div>
        </div>

        <div className='container'>
          <div className='two-col'>
            <section className='ingredients-section'>
              <div className='section-head'>
                <h2>Ingredients</h2>
                <div className='serv-ctrl'>
                  <button onClick={() => setServings(Math.max(1, servings - 1))}><FiMinus /></button>
                  <span>{servings} servings</span>
                  <button onClick={() => setServings(servings + 1)}><FiPlus /></button>
                </div>
              </div>
              <ul>
                {r.ingredients.map(i => (
                  <li key={i.id}>
                    <input type='checkbox' />
                    <span className='qty'>{i.qty}</span>
                    <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className='instructions-section'>
              <h2>Instructions</h2>
              <ol>
                {r.steps.map(s => (
                  <li key={s.id}>
                    <div className='label'>Step {s.index}</div>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className='tags-row'>
            {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
          </div>
        </div>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeBanner
