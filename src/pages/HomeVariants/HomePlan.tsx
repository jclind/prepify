import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineStar, AiOutlinePlus, AiOutlineCheck } from 'react-icons/ai'
import { BiBookmark, BiChevronRight } from 'react-icons/bi'
import { FiShoppingCart, FiDollarSign, FiCalendar } from 'react-icons/fi'
import DesignSwitcher from './DesignSwitcher'
import {
  weeklyPlan,
  byMeal,
  shoppingPreview,
  mockRecipes,
  MockRecipe,
} from './mockData'
import './HomePlan.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const PlanCard: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='plan-card'>
    <img src={recipe.image} alt={recipe.title} />
    <div className='body'>
      <h4>{recipe.title}</h4>
      <div className='meta'>
        <span><CgTimer /> {recipe.totalTime}m</span>
        <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}</span>
      </div>
    </div>
  </Link>
)

const HomePlan: FC = () => {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const toggleItem = (name: string) => {
    const next = new Set(completed)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setCompleted(next)
  }

  const totalMeals = weeklyPlan.reduce(
    (sum, day) => sum + (day.breakfast ? 1 : 0) + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0),
    0
  )
  const totalCost = weeklyPlan.reduce((sum, day) => {
    return sum +
      (day.breakfast?.servingPrice ?? 0) +
      (day.lunch?.servingPrice ?? 0) +
      (day.dinner?.servingPrice ?? 0)
  }, 0)

  return (
    <>
      <Helmet>
        <title>Prepify | Plan Your Week</title>
      </Helmet>
      <div className='home-plan'>
        {/* WELCOME HEADER */}
        <header className='plan-header'>
          <div className='greeting'>
            <span className='eyebrow'>Your week at a glance</span>
            <h1>Plan your week, lose the stress</h1>
          </div>
          <div className='summary-stats'>
            <div className='stat'>
              <FiCalendar className='icon' />
              <div>
                <div className='num'>{totalMeals}</div>
                <div className='label'>meals planned</div>
              </div>
            </div>
            <div className='stat'>
              <FiDollarSign className='icon' />
              <div>
                <div className='num'>{formatPrice(totalCost)}</div>
                <div className='label'>estimated cost</div>
              </div>
            </div>
            <div className='stat'>
              <FiShoppingCart className='icon' />
              <div>
                <div className='num'>{shoppingPreview.length}</div>
                <div className='label'>shopping items</div>
              </div>
            </div>
          </div>
        </header>

        {/* WEEKLY PLAN GRID */}
        <section className='week-section'>
          <div className='section-header'>
            <h2>This week's plan</h2>
            <button className='action-link'>Reset week</button>
          </div>

          <div className='week-grid'>
            {weeklyPlan.map(day => (
              <div className='day-col' key={day.day}>
                <div className='day-header'>{day.day}</div>

                {(['breakfast', 'lunch', 'dinner'] as const).map(slot => {
                  const recipe = day[slot]
                  return (
                    <div className='slot' key={slot}>
                      <div className='slot-label'>
                        {slot === 'breakfast' ? 'B' : slot === 'lunch' ? 'L' : 'D'}
                      </div>
                      {recipe ? (
                        <Link to='/recipes' className='slot-card filled'>
                          <img src={recipe.image} alt={recipe.title} />
                          <div className='slot-title'>{recipe.title}</div>
                          <div className='slot-meta'>
                            <span><CgTimer /> {recipe.totalTime}m</span>
                            <span>{formatPrice(recipe.servingPrice)}</span>
                          </div>
                        </Link>
                      ) : (
                        <button className='slot-card empty'>
                          <AiOutlinePlus />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* INSPIRATION ROWS */}
        <section className='inspiration'>
          <div className='section-header'>
            <h2>Inspiration for next week</h2>
            <Link to='/recipes' className='see-all'>Browse all <BiChevronRight /></Link>
          </div>

          <div className='inspiration-row'>
            <div className='row-label'>
              <span className='emoji' aria-hidden>☕</span>
              <span>Breakfasts</span>
            </div>
            <div className='row-cards'>
              {byMeal.breakfast.slice(0, 4).map(r => <PlanCard recipe={r} key={r.id} />)}
            </div>
          </div>

          <div className='inspiration-row'>
            <div className='row-label'>
              <span className='emoji' aria-hidden>🥗</span>
              <span>Lunches</span>
            </div>
            <div className='row-cards'>
              {byMeal.lunch.slice(0, 4).map(r => <PlanCard recipe={r} key={r.id} />)}
            </div>
          </div>

          <div className='inspiration-row'>
            <div className='row-label'>
              <span className='emoji' aria-hidden>🍽️</span>
              <span>Dinners</span>
            </div>
            <div className='row-cards'>
              {byMeal.dinner.slice(0, 4).map(r => <PlanCard recipe={r} key={r.id} />)}
            </div>
          </div>
        </section>

        {/* BOTTOM ROW: SHOPPING + SAVED */}
        <section className='bottom-row'>
          <div className='shopping-card'>
            <div className='shopping-header'>
              <div>
                <span className='eyebrow'><FiShoppingCart /> Shopping list preview</span>
                <h3>Built from your week</h3>
              </div>
              <button className='primary-btn'>Generate full list</button>
            </div>
            <ul className='shopping-list'>
              {shoppingPreview.map(item => (
                <li
                  key={item.name}
                  className={completed.has(item.name) ? 'checked' : ''}
                  onClick={() => toggleItem(item.name)}
                >
                  <span className='check'>
                    {completed.has(item.name) ? <AiOutlineCheck /> : null}
                  </span>
                  <span className='name'>{item.name}</span>
                  <span className='qty'>{item.qty}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className='saved-card'>
            <div className='section-header inner'>
              <div>
                <span className='eyebrow'><BiBookmark /> Your saved</span>
                <h3>Drop in from your library</h3>
              </div>
              <Link to='/account/saved-recipes' className='see-all'>All saved <BiChevronRight /></Link>
            </div>
            <div className='saved-list'>
              {mockRecipes.slice(0, 4).map(r => (
                <div className='saved-row' key={r.id}>
                  <img src={r.image} alt={r.title} />
                  <div className='info'>
                    <div className='title'>{r.title}</div>
                    <div className='sub'>{r.cuisine} · {r.totalTime} min · {formatPrice(r.servingPrice)}/serv</div>
                  </div>
                  <button className='add-btn' aria-label='Add to plan'>
                    <AiOutlinePlus />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomePlan
