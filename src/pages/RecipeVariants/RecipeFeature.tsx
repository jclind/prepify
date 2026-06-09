import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser, AiOutlineEye } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiCheckCircle, BiEditAlt, BiTrash } from 'react-icons/bi'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { TbToolsKitchen2 } from 'react-icons/tb'
import RecipeDesignSwitcher from './RecipeDesignSwitcher'
import OwnerToggle from './shared/OwnerToggle'
import RateWidget from './shared/RateWidget'
import { scaledQty, macros, compactNum } from './shared/recipeHelpers'
import { mockRecipe, formatPrice } from './mockRecipe'
import './RecipeFeature.scss'

const RecipeFeature: FC = () => {
  const r = mockRecipe
  const [isOwner, setIsOwner] = useState(false)
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const scale = servings / r.servings
  const ms = macros(r.nutrition)

  const toggle = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-feature'>
        {/* full-bleed hero */}
        <header className='hero' style={{ backgroundImage: `linear-gradient(to bottom, rgba(20,16,14,0.25), rgba(20,16,14,0.85)), url(${r.image})` }}>
          <div className='hero-inner'>
            <div className='eyebrow'>
              <span className='cuisine'>{r.cuisine} · {r.tags[0]}</span>
              {isOwner && <span className='owner-badge'>Your recipe</span>}
            </div>
            <h1>{r.title}</h1>
            <p className='description'>{r.description}</p>
            <div className='author-row'>
              <img src={r.authorAvatar} alt='' className='avatar' />
              <span>by <strong>@{r.author}</strong></span>
              <span className='dot'>·</span>
              <span>{new Date(r.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className='chips'>
              <span className='chip'><AiOutlineClockCircle /> {r.totalTime} min</span>
              <span className='chip'><AiOutlineUser /> {servings} servings</span>
              <span className='chip'><AiOutlineStar /> {r.rating.rateValue} ({r.rating.rateCount})</span>
              <span className='chip'>{formatPrice(r.servingPrice)}/serving</span>
            </div>
            <div className='actions'>
              {isOwner ? (
                <>
                  <button className='primary'><BiEditAlt /> Edit recipe</button>
                  <button className='ghost'><BiPrinter /> Print</button>
                  <button className='ghost'><BiTrash /> Delete</button>
                </>
              ) : (
                <>
                  <button className='primary'><BiBookmark /> Save recipe</button>
                  <button className='ghost'><BiPrinter /> Print</button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className='editorial'>
          {/* facts bar */}
          <div className='facts-bar'>
            <div className='fact cal'><span className='fv'>{r.nutrition.calories}</span><span className='fl'>calories</span></div>
            {ms.map(m => (
              <div className='fact' key={m.key}><span className='fv'>{m.value}{m.unit}</span><span className='fl'>{m.label}</span></div>
            ))}
            <div className='fact diets'>{r.nutritionLabels.map(l => <span key={l} className='diet'>{l}</span>)}</div>
          </div>

          {/* owner stats */}
          {isOwner && (
            <div className='owner-stats'>
              <span className='os-title'>Your recipe’s reach</span>
              <div className='os-row'>
                <span><AiOutlineEye /> {compactNum(r.views)} views</span>
                <span><BiBookmark /> {compactNum(r.saves)} saves</span>
                <span><TbToolsKitchen2 /> {compactNum(r.madeIt)} made it</span>
              </div>
            </div>
          )}

          <section className='ingredients'>
            <div className='sec-head'>
              <h2>Ingredients</h2>
              <div className='servings-control'>
                <button onClick={() => setServings(Math.max(1, servings - 1))}><FiMinus /></button>
                <span>{servings} servings</span>
                <button onClick={() => setServings(servings + 1)}><FiPlus /></button>
              </div>
            </div>
            <ul className='ing-list'>
              {r.ingredients.map(i => (
                <li key={i.id} className={checked.has(i.id) ? 'checked' : ''} onClick={() => toggle(i.id)}>
                  <span className='box'>{checked.has(i.id) ? <BiCheckCircle /> : null}</span>
                  <span className='qty'>{scale === 1 ? i.qty : scaledQty(i.qty, scale)}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className='instructions'>
            <h2>Method</h2>
            <ol className='step-list'>
              {r.steps.map(s => (
                <li key={s.id}>
                  <div className='step-head'><span className='num'>{s.index}</span><span className={`phase ${s.phase}`}>{s.phase} · {s.minutes} min</span></div>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className='tags-section'>
            <div className='tags'>{r.tags.map(t => <span key={t} className='tag'>{t}</span>)}</div>
          </section>

          {!isOwner && (
            <section className='rate-block'>
              <RateWidget />
            </section>
          )}

          <section className='reviews'>
            <div className='reviews-header'>
              <h2>Ratings & Reviews</h2>
              <div className='avg'><div className='big'>{r.rating.rateValue}</div><div><div className='stars'>{'★'.repeat(Math.round(r.rating.rateValue))}{'☆'.repeat(5 - Math.round(r.rating.rateValue))}</div><div className='count'>{r.rating.rateCount} ratings</div></div></div>
            </div>
            <div className='review-list'>
              {r.reviews.map(rev => (
                <div className='review' key={rev.id}>
                  <div className='review-head'><strong>@{rev.username}</strong><span className='stars'>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span><span className='date'>{rev.date}</span></div>
                  <p>{rev.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <OwnerToggle isOwner={isOwner} onChange={setIsOwner} />
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeFeature
