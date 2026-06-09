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
import './RecipeStudio.scss'

const MACRO_COLORS: Record<string, string> = {
  protein: '#00adb5',
  fat: '#ff5722',
  carbs: '#f5a623',
  fiber: '#7c5cff',
}

const RecipeStudio: FC = () => {
  const r = mockRecipe
  const [isOwner, setIsOwner] = useState(false)
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const scale = servings / r.servings

  const ms = macros(r.nutrition)
  const total = ms.reduce((a, m) => a + m.value, 0)
  let acc = 0
  const stops = ms.map(m => {
    const start = (acc / total) * 360
    acc += m.value
    const end = (acc / total) * 360
    return `${MACRO_COLORS[m.key]} ${start}deg ${end}deg`
  }).join(', ')

  const toggle = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-studio'>
        <div className='layout'>
          {/* sticky cook panel */}
          <aside className='panel'>
            <div className='panel-img'>
              <img src={r.image} alt={r.title} />
              {isOwner && <span className='owner-badge'>Your recipe</span>}
            </div>

            <div className='tiles'>
              <div className='tile'><AiOutlineClockCircle /><span className='t-n'>{r.totalTime}</span><span className='t-l'>min</span></div>
              <div className='tile'><AiOutlineUser /><span className='t-n'>{servings}</span><span className='t-l'>servings</span></div>
              <div className='tile'><AiOutlineStar /><span className='t-n'>{r.rating.rateValue}</span><span className='t-l'>{r.rating.rateCount} rated</span></div>
            </div>

            <div className='nutrition'>
              <div className='donut' style={{ background: `conic-gradient(${stops})` }}>
                <div className='hole'><span className='cal'>{r.nutrition.calories}</span><span className='cal-l'>cal/serv</span></div>
              </div>
              <ul className='legend'>
                {ms.map(m => (
                  <li key={m.key}><span className='sw' style={{ background: MACRO_COLORS[m.key] }} /><span className='lk'>{m.label}</span><span className='lv'>{m.value}{m.unit}</span></li>
                ))}
              </ul>
            </div>

            <div className='price-row'><span>Cost per serving</span><strong>{formatPrice(r.servingPrice)}</strong></div>

            {isOwner ? (
              <div className='cta-group'>
                <div className='owner-reach'>
                  <span><AiOutlineEye /> {compactNum(r.views)}</span>
                  <span><BiBookmark /> {compactNum(r.saves)}</span>
                  <span><TbToolsKitchen2 /> {compactNum(r.madeIt)}</span>
                </div>
                <button className='cta primary'><BiEditAlt /> Edit recipe</button>
                <button className='cta ghost'><BiTrash /> Delete</button>
              </div>
            ) : (
              <div className='cta-group'>
                <button className='cta primary'><BiBookmark /> Save recipe</button>
                <button className='cta ghost'><BiPrinter /> Print</button>
              </div>
            )}
          </aside>

          {/* content */}
          <div className='content'>
            <div className='head'>
              <span className='cuisine'>{r.cuisine} · {r.tags[0]}</span>
              <h1>{r.title}</h1>
              <p className='description'>{r.description}</p>
              <div className='author-row'>
                <img src={r.authorAvatar} alt='' className='avatar' />
                <span>by <strong>@{r.author}</strong> · {new Date(r.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <section className='ingredients'>
              <div className='sec-head'>
                <h2>Ingredients</h2>
                <div className='servings-control'>
                  <button onClick={() => setServings(Math.max(1, servings - 1))}><FiMinus /></button>
                  <span>{servings} serv</span>
                  <button onClick={() => setServings(servings + 1)}><FiPlus /></button>
                </div>
              </div>
              <ul className='ing-list'>
                {r.ingredients.map(i => (
                  <li key={i.id} className={checked.has(i.id) ? 'checked' : ''} onClick={() => toggle(i.id)}>
                    <span className='box'>{checked.has(i.id) ? <BiCheckCircle /> : null}</span>
                    <img src={i.image} alt='' />
                    <span className='qty'>{scale === 1 ? i.qty : scaledQty(i.qty, scale)}</span>
                    <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className='instructions'>
              <h2>Instructions</h2>
              <ol className='step-list'>
                {r.steps.map(s => (
                  <li key={s.id}>
                    <span className='num'>{s.index}</span>
                    <div className='c'>
                      <div className='step-meta'><span className={`phase ${s.phase}`}>{s.phase}</span><span className='dur'>{s.minutes} min</span></div>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className='tags-section'>
              <div className='tags'>{r.tags.map(t => <span key={t} className='tag'>{t}</span>)}</div>
            </section>

            {!isOwner && (
              <section className='rate-block'>
                <h2>Cooked this?</h2>
                <RateWidget title={null} />
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
      </div>
      <OwnerToggle isOwner={isOwner} onChange={setIsOwner} />
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeStudio
