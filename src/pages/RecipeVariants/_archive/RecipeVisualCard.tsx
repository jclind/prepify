import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineStar, AiOutlineHeart, AiOutlineEye } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiShare } from 'react-icons/bi'
import { GiCookingPot } from 'react-icons/gi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeVisualCard.scss'

const RecipeVisualCard: FC = () => {
  const r = mockRecipe
  const n = r.nutrition
  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-visual'>
        <div className='card-frame'>
          <div className='card-image'>
            <img src={r.image} alt={r.title} />
            <div className='card-image-overlay'>
              <div className='floating-actions'>
                <button className='float-btn primary' aria-label='Save'><BiBookmark /></button>
                <button className='float-btn' aria-label='Share'><BiShare /></button>
                <button className='float-btn' aria-label='Print'><BiPrinter /></button>
              </div>
              <div className='cuisine-stamp'>{r.cuisine}</div>
              <div className='image-bottom'>
                <h1>{r.title}</h1>
                <p>{r.description}</p>
              </div>
            </div>
          </div>

          <div className='block author-block'>
            <img src={r.authorAvatar} alt='' />
            <div className='auth-info'>
              <div className='auth-label'>Recipe by</div>
              <div className='auth-name'>@{r.author}</div>
            </div>
            <div className='auth-stats'>
              <div><AiOutlineEye /> {(r.views / 1000).toFixed(1)}k</div>
              <div><AiOutlineHeart /> {(r.saves / 1000).toFixed(1)}k</div>
              <div><GiCookingPot /> {r.madeIt}</div>
            </div>
          </div>

          <div className='block stats-block'>
            <div className='stat-tile primary'>
              <div className='stat-num'>{r.totalTime}</div>
              <div className='stat-lbl'>minutes</div>
            </div>
            <div className='stat-tile secondary'>
              <div className='stat-num'>{r.servings}</div>
              <div className='stat-lbl'>servings</div>
            </div>
            <div className='stat-tile gold'>
              <div className='stat-num'>{r.rating.rateValue}<span>★</span></div>
              <div className='stat-lbl'>{r.rating.rateCount} reviews</div>
            </div>
            <div className='stat-tile dark'>
              <div className='stat-num'>{formatPrice(r.servingPrice)}</div>
              <div className='stat-lbl'>per serving</div>
            </div>
          </div>

          <div className='block badges-block'>
            <div className='badges-label'>Diet badges</div>
            <div className='badges'>
              {r.nutritionLabels.map(l => (
                <span className='badge' key={l}>{l}</span>
              ))}
              {r.tags.slice(0, 3).map(t => (
                <span className='badge alt' key={t}>{t}</span>
              ))}
            </div>
          </div>

          <div className='block nutrition-block'>
            <div className='block-label'>Nutrition · per serving</div>
            <div className='nutri-grid'>
              <div className='nutri'><div className='val'>{n.calories}</div><div className='lbl'>cal</div></div>
              <div className='nutri'><div className='val'>{n.protein}<span>g</span></div><div className='lbl'>protein</div></div>
              <div className='nutri'><div className='val'>{n.fat}<span>g</span></div><div className='lbl'>fat</div></div>
              <div className='nutri'><div className='val'>{n.carbs}<span>g</span></div><div className='lbl'>carbs</div></div>
            </div>
          </div>

          <div className='block ingredients-block'>
            <div className='block-label'>Ingredients · {r.ingredients.length}</div>
            <div className='ing-chips'>
              {r.ingredients.map(i => (
                <div className='ing-chip' key={i.id}>
                  <img src={i.image} alt='' />
                  <span><strong>{i.qty}</strong> {i.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className='block steps-block'>
            <div className='block-label'>Instructions · {r.steps.length} steps</div>
            <div className='step-stack'>
              {r.steps.map(s => (
                <div className={`step-tile ${s.phase}`} key={s.id}>
                  <div className='step-tile-head'>
                    <div className='step-num'>#{s.index}</div>
                    <div className='step-tags'>
                      <span className={`phase ${s.phase}`}>{s.phase}</span>
                      <span className='dur'>{s.minutes}m</span>
                    </div>
                  </div>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className='block reviews-block'>
            <div className='block-label'>What people are saying</div>
            <div className='review-stack'>
              {r.reviews.slice(0, 2).map(rev => (
                <div className='mini-review' key={rev.id}>
                  <div className='rev-head'>
                    <strong>@{rev.username}</strong>
                    <span className='stars'>{'★'.repeat(rev.rating)}</span>
                  </div>
                  <p>"{rev.text}"</p>
                </div>
              ))}
            </div>
          </div>

          <div className='cta-block'>
            <button><AiOutlineStar /> Rate this recipe</button>
            <button className='primary'><BiBookmark /> Save to library</button>
          </div>
        </div>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeVisualCard
