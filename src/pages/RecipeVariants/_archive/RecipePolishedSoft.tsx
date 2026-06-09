import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser, AiOutlineHeart } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiCheckCircle } from 'react-icons/bi'
import { FiMinus, FiPlus } from 'react-icons/fi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipePolishedSoft.scss'

const RecipePolishedSoft: FC = () => {
  const r = mockRecipe
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-polished-soft'>
        <header className='hero'>
          <img src={r.image} alt={r.title} className='hero-img' />
          <div className='hero-text'>
            <div className='cuisine'><AiOutlineHeart /> {r.cuisine} comfort</div>
            <h1>{r.title}</h1>
            <p className='description'>{r.description}</p>
            <div className='author-row'>
              <img src={r.authorAvatar} alt='' className='avatar' />
              <span>shared by <strong>@{r.author}</strong></span>
              <span className='dot'>·</span>
              <span>{new Date(r.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className='stats'>
              <div className='stat'>
                <AiOutlineClockCircle className='icon' />
                <div><div className='num'>{r.totalTime}</div><div className='label'>min</div></div>
              </div>
              <div className='stat'>
                <AiOutlineUser className='icon' />
                <div><div className='num'>{servings}</div><div className='label'>servings</div></div>
              </div>
              <div className='stat'>
                <AiOutlineStar className='icon' />
                <div><div className='num'>{r.rating.rateValue}</div><div className='label'>({r.rating.rateCount})</div></div>
              </div>
              <div className='stat'>
                <span className='dollar'>$</span>
                <div><div className='num'>{(r.servingPrice/100).toFixed(2)}</div><div className='label'>/serv</div></div>
              </div>
            </div>
            <div className='actions'>
              <button className='primary'><BiBookmark /> Save</button>
              <button className='secondary'><AiOutlineStar /> Rate</button>
              <button className='secondary'><BiPrinter /> Print</button>
            </div>
          </div>
        </header>

        <section className='body'>
          <aside className='ingredients-pane'>
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
                  <span className='qty'>{i.qty}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
            <div className='price-card'>
              <div className='price-label'>Estimated total</div>
              <div className='price-value'>{formatPrice(r.servingPrice * servings)}</div>
              <div className='price-sub'>{formatPrice(r.servingPrice)} per serving</div>
            </div>
          </aside>

          <div className='instructions-pane'>
            <h2>How to make it</h2>
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
        </section>

        <section className='tags-section'>
          <h3>Tags</h3>
          <div className='tags'>
            {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
          </div>
        </section>

        <section className='reviews'>
          <div className='reviews-header'>
            <h2>What people are saying</h2>
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
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipePolishedSoft
