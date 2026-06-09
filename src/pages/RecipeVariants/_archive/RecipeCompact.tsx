import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineEye, AiOutlineHeart, AiOutlineCheckCircle } from 'react-icons/ai'
import { BiBookmark, BiPrinter } from 'react-icons/bi'
import { GiCookingPot, GiKnifeFork } from 'react-icons/gi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeCompact.scss'

const RecipeCompact: FC = () => {
  const r = mockRecipe
  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-compact'>
        <header className='hero'>
          <img src={r.image} alt={r.title} className='hero-img' />
          <div className='hero-main'>
            <div className='cuisine'>{r.cuisine}</div>
            <h1>{r.title}</h1>
            <p className='desc'>{r.description}</p>
            <div className='author-card'>
              <img src={r.authorAvatar} alt='' />
              <div>
                <div className='author-name'>@{r.author}</div>
                <div className='author-sub'>Author · 47 recipes</div>
              </div>
              <button className='follow-btn'>+ Follow</button>
            </div>
            <div className='tags'>
              {r.nutritionLabels.map(t => <span className='nutri' key={t}><AiOutlineCheckCircle /> {t}</span>)}
              {r.tags.slice(0, 3).map(t => <span className='tag' key={t}>{t}</span>)}
            </div>
            <div className='actions'>
              <button className='primary'><BiBookmark /> Save</button>
              <button><AiOutlineStar /> Rate</button>
              <button><BiPrinter /> Print</button>
            </div>
          </div>
          <aside className='hero-aside'>
            <div className='aside-card'>
              <div className='aside-row'>
                <AiOutlineClockCircle className='icon' />
                <div>
                  <div className='aside-label'>Total time</div>
                  <div className='aside-val'>{r.totalTime} min</div>
                  <div className='aside-sub'>{r.prepTime}m prep · {r.cookTime}m cook</div>
                </div>
              </div>
              <div className='aside-row'>
                <GiKnifeFork className='icon' />
                <div>
                  <div className='aside-label'>Yield</div>
                  <div className='aside-val'>{r.servings} servings</div>
                </div>
              </div>
              <div className='aside-row'>
                <span className='dollar-icon'>$</span>
                <div>
                  <div className='aside-label'>Cost</div>
                  <div className='aside-val'>{formatPrice(r.servingPrice)} / serving</div>
                  <div className='aside-sub'>{formatPrice(r.servingPrice * r.servings)} total</div>
                </div>
              </div>
              <div className='aside-row'>
                <AiOutlineStar className='icon' />
                <div>
                  <div className='aside-label'>Rating</div>
                  <div className='aside-val'>{r.rating.rateValue} <span className='aside-sub'>({r.rating.rateCount})</span></div>
                </div>
              </div>
            </div>
            <div className='community-card'>
              <div className='comm-row'><AiOutlineEye /> <strong>{r.views.toLocaleString()}</strong> views</div>
              <div className='comm-row'><AiOutlineHeart /> <strong>{r.saves.toLocaleString()}</strong> saves</div>
              <div className='comm-row'><GiCookingPot /> <strong>{r.madeIt}</strong> made it</div>
            </div>
          </aside>
        </header>

        <section className='body'>
          <div className='ingredients'>
            <h2>Ingredients</h2>
            <ul>
              {r.ingredients.map(i => (
                <li key={i.id}>
                  <input type='checkbox' />
                  <span className='qty'>{i.qty}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className='instructions'>
            <h2>Instructions</h2>
            <ol>
              {r.steps.map(s => (
                <li key={s.id}>
                  <span className='num'>{s.index}</span>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeCompact
