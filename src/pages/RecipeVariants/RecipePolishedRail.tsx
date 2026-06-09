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
import './RecipePolishedRail.scss'

const MACRO_COLORS: Record<string, string> = {
  protein: '#00adb5',
  fat: '#ff5722',
  carbs: '#f5a623',
  fiber: '#7c5cff',
}

const RecipePolishedRail: FC = () => {
  const r = mockRecipe
  const [isOwner, setIsOwner] = useState(false)
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const scale = servings / r.servings

  const ms = macros(r.nutrition)
  const total = ms.reduce((a, m) => a + m.value, 0)
  // build conic-gradient stops for the donut
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
      <div className='recipe-rail'>
        <header className='hero'>
          <img src={r.image} alt={r.title} className='hero-img' />
          <div className='hero-text'>
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
            <div className='quick'>
              <span><AiOutlineClockCircle /> {r.totalTime} min</span>
              <span><AiOutlineUser /> {servings} servings</span>
              <span><AiOutlineStar /> {r.rating.rateValue} ({r.rating.rateCount})</span>
              <span className='price'>{formatPrice(r.servingPrice)}/serving</span>
            </div>
            {isOwner ? (
              <div className='actions'>
                <button className='primary'><BiEditAlt /> Edit recipe</button>
                <button className='secondary'><BiPrinter /> Print</button>
                <button className='danger'><BiTrash /> Delete</button>
              </div>
            ) : (
              <div className='actions'>
                <button className='primary'><BiBookmark /> Save</button>
                <button className='secondary'><AiOutlineStar /> Rate</button>
                <button className='secondary'><BiPrinter /> Print</button>
              </div>
            )}
          </div>
        </header>

        <section className='body'>
          <div className='main'>
            <div className='block'>
              <div className='pane-header'>
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
            </div>

            <div className='block'>
              <h2>Instructions</h2>
              <ol className='step-list'>
                {r.steps.map(s => (
                  <li key={s.id}>
                    <span className='num'>{s.index}</span>
                    <div className='content'>
                      <div className='step-meta'>
                        <span className={`phase ${s.phase}`}>{s.phase}</span>
                        <span className='dur'>{s.minutes} min</span>
                      </div>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className='block'>
              <h3 className='tags-h'>Tags</h3>
              <div className='tags'>{r.tags.map(t => <span key={t} className='tag'>{t}</span>)}</div>
            </div>
          </div>

          <aside className='rail'>
            {/* stats */}
            <div className='rail-card stats-card'>
              <div className='rc-title'>{isOwner ? 'Your recipe’s reach' : 'At a glance'}</div>
              <div className='kpis'>
                <div className='kpi'><AiOutlineEye /><div><span className='n'>{compactNum(r.views)}</span><span className='l'>views</span></div></div>
                <div className='kpi'><BiBookmark /><div><span className='n'>{compactNum(r.saves)}</span><span className='l'>saves</span></div></div>
                <div className='kpi'><TbToolsKitchen2 /><div><span className='n'>{compactNum(r.madeIt)}</span><span className='l'>made it</span></div></div>
              </div>
            </div>

            {/* nutrition donut */}
            <div className='rail-card nutrition-card'>
              <div className='rc-title'>Nutrition <span className='per'>/ serving</span></div>
              <div className='donut-row'>
                <div className='donut' style={{ background: `conic-gradient(${stops})` }}>
                  <div className='donut-hole'>
                    <span className='cal'>{r.nutrition.calories}</span>
                    <span className='cal-l'>cal</span>
                  </div>
                </div>
                <ul className='legend'>
                  {ms.map(m => (
                    <li key={m.key}>
                      <span className='swatch' style={{ background: MACRO_COLORS[m.key] }} />
                      <span className='lk'>{m.label}</span>
                      <span className='lv'>{m.value}{m.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className='diet-labels'>{r.nutritionLabels.map(l => <span key={l} className='diet'>{l}</span>)}</div>
            </div>

            {/* rate / owner card */}
            {isOwner ? (
              <div className='rail-card owner-card'>
                <div className='rc-title'>Manage</div>
                <p className='owner-sub'>Published {new Date(r.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</p>
                <button className='owner-btn primary'><BiEditAlt /> Edit recipe</button>
                <button className='owner-btn'><AiOutlineStar /> View all reviews</button>
                <button className='owner-btn danger'><BiTrash /> Delete recipe</button>
              </div>
            ) : (
              <div className='rail-card rate-card'>
                <RateWidget size='sm' title='Made it? Rate it' />
              </div>
            )}
          </aside>
        </section>

        <section className='reviews'>
          <div className='reviews-header'>
            <h2>Ratings & Reviews</h2>
            <div className='avg'>
              <div className='big'>{r.rating.rateValue}</div>
              <div>
                <div className='stars'>{'★'.repeat(Math.round(r.rating.rateValue))}{'☆'.repeat(5 - Math.round(r.rating.rateValue))}</div>
                <div className='count'>{r.rating.rateCount} ratings</div>
              </div>
            </div>
          </div>
          <div className='review-list'>
            {r.reviews.map(rev => (
              <div className='review' key={rev.id}>
                <div className='review-head'>
                  <strong>@{rev.username}</strong>
                  <span className='stars'>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                  <span className='date'>{rev.date}</span>
                </div>
                <p>{rev.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <OwnerToggle isOwner={isOwner} onChange={setIsOwner} />
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipePolishedRail
