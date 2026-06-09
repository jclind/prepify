import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser, AiOutlineEye, AiFillStar } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiCheckCircle, BiEditAlt, BiTrash, BiTrendingUp, BiDollarCircle } from 'react-icons/bi'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { TbToolsKitchen2 } from 'react-icons/tb'
import RecipeDesignSwitcher from './RecipeDesignSwitcher'
import OwnerToggle from './shared/OwnerToggle'
import RateWidget from './shared/RateWidget'
import { scaledQty, macros, nutritionRows, compactNum } from './shared/recipeHelpers'
import { mockRecipe, formatPrice } from './mockRecipe'
import './RecipeDashboard.scss'

const RecipeDashboard: FC = () => {
  const r = mockRecipe
  const [isOwner, setIsOwner] = useState(false)
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const scale = servings / r.servings
  const ms = macros(r.nutrition)
  const macroMax = Math.max(...ms.map(m => m.value))

  const toggle = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-dashboard'>
        {/* control bar */}
        <div className='control-bar'>
          <div className='cb-left'>
            <div className='eyebrow'>
              <span className='cuisine'>{r.cuisine}</span>
              {isOwner && <span className='owner-badge'>Your recipe</span>}
            </div>
            <h1>{r.title}</h1>
            <div className='author-row'>
              <img src={r.authorAvatar} alt='' className='avatar' />
              <span>by <strong>@{r.author}</strong> · {new Date(r.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          <div className='cb-actions'>
            {isOwner ? (
              <>
                <button className='primary'><BiEditAlt /> Edit</button>
                <button className='ghost'><BiPrinter /> Print</button>
                <button className='ghost danger'><BiTrash /> Delete</button>
              </>
            ) : (
              <>
                <button className='primary'><BiBookmark /> Save</button>
                <button className='ghost'><BiPrinter /> Print</button>
              </>
            )}
          </div>
        </div>

        {/* hero image strip */}
        <div className='hero-strip'>
          <img src={r.image} alt={r.title} />
          <p className='description'>{r.description}</p>
        </div>

        {/* KPI grid */}
        <div className='kpi-grid'>
          <div className='kpi'><div className='ic time'><AiOutlineClockCircle /></div><div className='kv'><span className='n'>{r.totalTime}</span><span className='l'>minutes</span></div></div>
          <div className='kpi'><div className='ic serv'><AiOutlineUser /></div><div className='kv'><span className='n'>{servings}</span><span className='l'>servings</span></div></div>
          <div className='kpi'><div className='ic rate'><AiFillStar /></div><div className='kv'><span className='n'>{r.rating.rateValue}</span><span className='l'>{r.rating.rateCount} ratings</span></div></div>
          <div className='kpi'><div className='ic price'><BiDollarCircle /></div><div className='kv'><span className='n'>{formatPrice(r.servingPrice)}</span><span className='l'>per serving</span></div></div>
        </div>

        {/* owner analytics panel */}
        {isOwner && (
          <div className='analytics'>
            <div className='an-head'><BiTrendingUp /> <h2>Performance</h2><span className='since'>since publishing</span></div>
            <div className='an-grid'>
              <div className='an-card'><AiOutlineEye className='an-ic' /><span className='an-n'>{compactNum(r.views)}</span><span className='an-l'>Views</span></div>
              <div className='an-card'><BiBookmark className='an-ic' /><span className='an-n'>{compactNum(r.saves)}</span><span className='an-l'>Saves</span></div>
              <div className='an-card'><TbToolsKitchen2 className='an-ic' /><span className='an-n'>{compactNum(r.madeIt)}</span><span className='an-l'>Made it</span></div>
              <div className='an-card'><AiFillStar className='an-ic' /><span className='an-n'>{r.rating.rateValue}</span><span className='an-l'>Avg rating</span></div>
            </div>
          </div>
        )}

        {/* main two-col */}
        <div className='main'>
          <aside className='ingredients'>
            <div className='card'>
              <div className='card-head'>
                <h2>Ingredients</h2>
                <div className='servings-control'>
                  <button onClick={() => setServings(Math.max(1, servings - 1))}><FiMinus /></button>
                  <span>{servings}</span>
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
              <div className='total-row'><span>Estimated total</span><strong>{formatPrice(r.servingPrice * servings)}</strong></div>
            </div>

            <div className='card nutrition'>
              <div className='card-head'><h2>Nutrition</h2><span className='per'>/ serving</span></div>
              <div className='cal-big'><strong>{r.nutrition.calories}</strong> cal</div>
              <div className='macro-bars'>
                {ms.map(m => (
                  <div className='macro' key={m.key}>
                    <div className='macro-top'><span>{m.label}</span><span>{m.value}{m.unit}</span></div>
                    <div className='track'><div className='fill' style={{ width: `${(m.value / macroMax) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <table className='facts'>
                <tbody>
                  {nutritionRows(r.nutrition).map(row => (<tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>))}
                </tbody>
              </table>
            </div>
          </aside>

          <div className='instructions'>
            <div className='card'>
              <h2>Instructions</h2>
              <ol className='step-list'>
                {r.steps.map(s => (
                  <li key={s.id}>
                    <span className='num'>{s.index}</span>
                    <div className='content'>
                      <div className='step-meta'><span className={`phase ${s.phase}`}>{s.phase}</span><span className='dur'>{s.minutes} min</span></div>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className='card tags-card'>
              <h2>Tags</h2>
              <div className='tags'>{r.tags.map(t => <span key={t} className='tag'>{t}</span>)}</div>
            </div>
          </div>
        </div>

        {/* reviews */}
        <div className='card reviews'>
          <div className='reviews-header'>
            <h2>Ratings & Reviews</h2>
            <div className='avg'><div className='big'>{r.rating.rateValue}</div><div><div className='stars'>{'★'.repeat(Math.round(r.rating.rateValue))}{'☆'.repeat(5 - Math.round(r.rating.rateValue))}</div><div className='count'>{r.rating.rateCount} ratings</div></div></div>
          </div>
          {!isOwner && <div className='rate-card'><RateWidget /></div>}
          <div className='review-list'>
            {r.reviews.map(rev => (
              <div className='review' key={rev.id}>
                <div className='review-head'><strong>@{rev.username}</strong><span className='stars'>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span><span className='date'>{rev.date}</span></div>
                <p>{rev.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <OwnerToggle isOwner={isOwner} onChange={setIsOwner} />
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeDashboard
