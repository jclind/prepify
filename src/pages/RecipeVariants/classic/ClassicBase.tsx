import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineUsergroupAdd, AiOutlineEye } from 'react-icons/ai'
import { BsStar } from 'react-icons/bs'
import { BiBookmark, BiPrinter, BiCheckCircle, BiEditAlt, BiTrash, BiLeftArrowAlt } from 'react-icons/bi'
import { AiOutlineStar } from 'react-icons/ai'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { TbToolsKitchen2 } from 'react-icons/tb'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import OwnerToggle from '../shared/OwnerToggle'
import RateWidget from '../shared/RateWidget'
import { scaledQty, macros, nutritionRows, compactNum } from '../shared/recipeHelpers'
import { mockRecipe, formatPrice } from '../mockRecipe'

type Props = {
  /** root modifier class that each Batch B variant styles in its own scss */
  rootClass: string
}

/**
 * Shared layout for the "Batch B" recipe variants — a faithful, polished
 * rebuild of the real SingleRecipe page (controls, header w/ image + data row +
 * actions, stacked body sections, nutrition, ratings & reviews). The five
 * variants are thin wrappers that pass a different `rootClass` and ship their
 * own scss, so they differ purely in styling, not structure.
 */
const ClassicBase: FC<Props> = ({ rootClass }) => {
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
      <div className={`classic ${rootClass}`}>
        <div className='controls'>
          <button className='back'><BiLeftArrowAlt /> All recipes</button>
          {isOwner && <span className='owner-badge'>Your recipe</span>}
        </div>

        <header className='header'>
          <div className='image-wrap'>
            <img src={r.image} alt={r.title} />
          </div>
          <div className='desc'>
            <div className='eyebrow'>{r.cuisine} · {r.tags[0]}</div>
            <h1>{r.title}</h1>
            <p className='description'>{r.description}</p>
            <div className='author-row'>
              <img src={r.authorAvatar} alt='' className='avatar' />
              <span>by <strong>@{r.author}</strong> · {new Date(r.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className='data-row'>
              <div className='data'><AiOutlineClockCircle className='icon' /><div><div className='t'>Total Time</div><div className='v'>{r.totalTime} min.</div></div></div>
              <div className='data'><AiOutlineUsergroupAdd className='icon' /><div><div className='t'>Servings</div><div className='v'>{servings}</div></div></div>
              <div className='data'><BsStar className='icon' /><div><div className='t'>Rating</div><div className='v'>{r.rating.rateValue} ({r.rating.rateCount})</div></div></div>
            </div>
            <div className='actions'>
              {isOwner ? (
                <>
                  <button className='primary'><BiEditAlt /> Edit</button>
                  <button className='secondary'><BiPrinter /> Print</button>
                  <button className='danger'><BiTrash /> Delete</button>
                </>
              ) : (
                <>
                  <button className='primary'><BiBookmark /> Save</button>
                  <button className='secondary'><AiOutlineStar /> Rate</button>
                  <button className='secondary'><BiPrinter /> Print</button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className='body'>
          <section className='ingredients section'>
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
                  <span className='qty'>{scale === 1 ? i.qty : scaledQty(i.qty, scale)}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
            <div className='price-line'>Estimated <strong>{formatPrice(r.servingPrice * servings)}</strong> total · {formatPrice(r.servingPrice)}/serving</div>
          </section>

          <section className='instructions section'>
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

          <section className='tags section'>
            <h2>Tags</h2>
            <div className='tag-list'>{r.tags.map(t => <span key={t} className='tag'>{t}</span>)}</div>
          </section>

          <div className='made-row'>
            <button className='made-btn'><TbToolsKitchen2 /> I made this</button>
            {isOwner && (
              <div className='owner-stats'>
                <span><AiOutlineEye /> {compactNum(r.views)} views</span>
                <span><BiBookmark /> {compactNum(r.saves)} saves</span>
                <span><TbToolsKitchen2 /> {compactNum(r.madeIt)} made it</span>
              </div>
            )}
          </div>

          <section className='nutrition section'>
            <h2>Nutrition</h2>
            <div className='nut-grid'>
              <div className='macros'>
                <div className='cal'><strong>{r.nutrition.calories}</strong> calories / serving</div>
                {ms.map(m => (
                  <div className='macro' key={m.key}>
                    <div className='macro-top'><span>{m.label}</span><span>{m.value}{m.unit}</span></div>
                    <div className='track'><div className='fill' style={{ width: `${(m.value / macroMax) * 100}%` }} /></div>
                  </div>
                ))}
                <div className='diet-labels'>{r.nutritionLabels.map(l => <span key={l} className='diet'>{l}</span>)}</div>
              </div>
              <table className='facts'>
                <tbody>
                  {nutritionRows(r.nutrition).map(row => (<tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className='reviews'>
          <div className='reviews-header'>
            <h2>Ratings &amp; Reviews</h2>
            <div className='avg'><div className='big'>{r.rating.rateValue}</div><div><div className='stars'>{'★'.repeat(Math.round(r.rating.rateValue))}{'☆'.repeat(5 - Math.round(r.rating.rateValue))}</div><div className='count'>{r.rating.rateCount} ratings</div></div></div>
          </div>
          {!isOwner && <div className='add-review'><RateWidget /></div>}
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
      <OwnerToggle isOwner={isOwner} onChange={setIsOwner} />
      <RecipeDesignSwitcher />
    </>
  )
}

export default ClassicBase
