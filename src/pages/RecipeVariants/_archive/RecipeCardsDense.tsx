import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { BiBookmark, BiPrinter, BiDish } from 'react-icons/bi'
import { GiCookingPot } from 'react-icons/gi'
import { TbSalad } from 'react-icons/tb'
import { MdOutlineLocalGroceryStore } from 'react-icons/md'
import { BsChatQuote } from 'react-icons/bs'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeCardsDense.scss'

const RecipeCardsDense: FC = () => {
  const r = mockRecipe
  const n = r.nutrition
  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-cards-dense'>
        <header className='hero'>
          <img src={r.image} alt={r.title} />
          <div className='hero-content'>
            <div className='cuisine-pill'>{r.cuisine}</div>
            <h1>{r.title}</h1>
            <p>{r.description}</p>
            <div className='stat-strip'>
              <div><AiOutlineClockCircle /> {r.totalTime} min</div>
              <div><AiOutlineUser /> {r.servings}</div>
              <div><AiOutlineStar /> {r.rating.rateValue} ({r.rating.rateCount})</div>
              <div className='price'>{formatPrice(r.servingPrice)}/serv</div>
            </div>
            <div className='actions'>
              <button className='primary'><BiBookmark /> Save</button>
              <button><AiOutlineStar /> Rate</button>
              <button><BiPrinter /> Print</button>
            </div>
          </div>
        </header>

        <div className='grid two-col'>
          <div className='card ingredients-card'>
            <div className='card-header'>
              <div className='card-icon ingredients'><MdOutlineLocalGroceryStore /></div>
              <h2>Ingredients</h2>
              <span className='count'>{r.ingredients.length}</span>
            </div>
            <div className='card-body'>
              <ul className='ing-list'>
                {r.ingredients.map(i => (
                  <li key={i.id}>
                    <img src={i.image} alt='' />
                    <span><strong>{i.qty}</strong> {i.name}{i.note ? `, ${i.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className='card instructions-card'>
            <div className='card-header'>
              <div className='card-icon instructions'><GiCookingPot /></div>
              <h2>Instructions</h2>
              <span className='count'>{r.steps.length}</span>
            </div>
            <div className='card-body'>
              <ol className='steps'>
                {r.steps.map(s => (
                  <li key={s.id}>
                    <div className='step-num'>{s.index}</div>
                    <div>
                      <p>{s.text}</p>
                      <span className={`step-time ${s.phase}`}>{s.minutes}m · {s.phase}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className='grid two-col'>
          <div className='card nutrition-card'>
            <div className='card-header'>
              <div className='card-icon nutrition'><TbSalad /></div>
              <h2>Nutrition</h2>
              <span className='count-text'>per serving</span>
            </div>
            <div className='card-body'>
              <div className='nutrition-grid'>
                <div className='nutrient calories'><div className='val'>{n.calories}</div><div className='lbl'>cal</div></div>
                <div className='nutrient'><div className='val'>{n.protein}g</div><div className='lbl'>protein</div></div>
                <div className='nutrient'><div className='val'>{n.carbs}g</div><div className='lbl'>carbs</div></div>
                <div className='nutrient'><div className='val'>{n.fat}g</div><div className='lbl'>fat</div></div>
                <div className='nutrient'><div className='val'>{n.fiber}g</div><div className='lbl'>fiber</div></div>
                <div className='nutrient'><div className='val'>{n.sugar}g</div><div className='lbl'>sugar</div></div>
              </div>
            </div>
          </div>

          <div className='card tags-card'>
            <div className='card-header'>
              <div className='card-icon tags'><BiDish /></div>
              <h2>Tags</h2>
            </div>
            <div className='card-body'>
              <div className='tag-row'>
                {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className='card reviews-card'>
          <div className='card-header'>
            <div className='card-icon reviews'><BsChatQuote /></div>
            <h2>Ratings & Reviews</h2>
            <span className='rating-aside'>{r.rating.rateValue}<span className='star'>★</span> · {r.rating.rateCount}</span>
          </div>
          <div className='card-body'>
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
          </div>
        </div>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeCardsDense
