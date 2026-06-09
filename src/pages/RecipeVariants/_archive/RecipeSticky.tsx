import React, { FC, useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiShare } from 'react-icons/bi'
import { FiCheck } from 'react-icons/fi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeSticky.scss'

const RecipeSticky: FC = () => {
  const r = mockRecipe
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 380)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>

      <div className={`sticky-toolbar ${showSticky ? 'visible' : ''}`}>
        <div className='inner'>
          <img src={r.image} alt='' />
          <div className='info'>
            <div className='title'>{r.title}</div>
            <div className='meta'>
              <span><AiOutlineClockCircle /> {r.totalTime}m</span>
              <span><AiOutlineStar /> {r.rating.rateValue}</span>
              <span className='price'>{formatPrice(r.servingPrice)}/serv</span>
            </div>
          </div>
          <div className='sticky-actions'>
            <button className='primary'><BiBookmark /> Save</button>
            <button className='icon-btn'><BiShare /></button>
            <button className='icon-btn'><BiPrinter /></button>
          </div>
        </div>
      </div>

      <div className='recipe-sticky'>
        <div className='hero'>
          <img src={r.image} alt={r.title} />
          <div className='hero-info'>
            <div className='breadcrumb'>Recipes · {r.cuisine}</div>
            <h1>{r.title}</h1>
            <p>{r.description}</p>
            <div className='author'>
              <img src={r.authorAvatar} alt='' />
              <span>by <strong>@{r.author}</strong> · {r.views.toLocaleString()} views</span>
            </div>
            <div className='stats'>
              <div><AiOutlineClockCircle /> <strong>{r.totalTime}</strong> min</div>
              <div><AiOutlineUser /> <strong>{r.servings}</strong> servings</div>
              <div><AiOutlineStar /> <strong>{r.rating.rateValue}</strong> ({r.rating.rateCount})</div>
              <div className='price'>{formatPrice(r.servingPrice)}/serv</div>
            </div>
            <div className='actions'>
              <button className='primary'><BiBookmark /> Save</button>
              <button><AiOutlineStar /> Rate</button>
              <button><BiShare /> Share</button>
              <button><BiPrinter /> Print</button>
            </div>
          </div>
        </div>

        <div className='body'>
          <div className='ingredients'>
            <h2>Ingredients</h2>
            <div className='cost-banner'>
              <div>
                <span className='label'>Total for {r.servings} servings</span>
                <span className='value'>{formatPrice(r.servingPrice * r.servings)}</span>
              </div>
              <div>
                <span className='label'>Per serving</span>
                <span className='value alt'>{formatPrice(r.servingPrice)}</span>
              </div>
            </div>
            <ul>
              {r.ingredients.map(i => (
                <li key={i.id}>
                  <span className='check'><FiCheck /></span>
                  <img src={i.image} alt='' />
                  <div>
                    <div className='qty'>{i.qty}</div>
                    <div className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className='instructions'>
            <h2>Instructions</h2>
            <ol>
              {r.steps.map(s => (
                <li key={s.id}>
                  <div className='step-num'>{s.index}</div>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
            <div className='tags'>
              {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
            </div>
          </div>
        </div>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeSticky
