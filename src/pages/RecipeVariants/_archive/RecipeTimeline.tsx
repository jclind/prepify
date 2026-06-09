import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser } from 'react-icons/ai'
import { BiBookmark, BiPrinter } from 'react-icons/bi'
import { GiCookingPot, GiKnifeFork } from 'react-icons/gi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeTimeline.scss'

const RecipeTimeline: FC = () => {
  const r = mockRecipe

  // Build cumulative time
  let cum = 0
  const stepsWithTime = r.steps.map(s => {
    const start = cum
    cum += s.minutes
    return { ...s, start, end: cum }
  })

  const fmt = (m: number) => {
    if (m < 60) return `${m}m`
    return `${Math.floor(m / 60)}h ${m % 60}m`
  }

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-timeline'>
        <header className='hero'>
          <div className='hero-bg'>
            <img src={r.image} alt={r.title} />
          </div>
          <div className='hero-content'>
            <div className='cuisine'>{r.cuisine}</div>
            <h1>{r.title}</h1>
            <p>{r.description}</p>
            <div className='stats-bar'>
              <div className='stat'>
                <AiOutlineClockCircle /> <strong>{r.totalTime} min</strong>
              </div>
              <div className='stat'>
                <AiOutlineUser /> <strong>{r.servings} servings</strong>
              </div>
              <div className='stat'>
                <AiOutlineStar /> <strong>{r.rating.rateValue}</strong> ({r.rating.rateCount})
              </div>
              <div className='stat price'>{formatPrice(r.servingPrice)}/serv</div>
            </div>
            <div className='actions'>
              <button className='primary'><BiBookmark /> Save</button>
              <button><AiOutlineStar /> Rate</button>
              <button><BiPrinter /> Print</button>
            </div>
          </div>
        </header>

        <section className='ingredients-strip'>
          <div className='strip-label'><GiKnifeFork /> Ingredients</div>
          <div className='strip-list'>
            {r.ingredients.map(i => (
              <div className='strip-ing' key={i.id}>
                <img src={i.image} alt='' />
                <div>
                  <div className='qty'>{i.qty}</div>
                  <div className='name'>{i.name}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className='timeline-section'>
          <div className='timeline-head'>
            <div className='timeline-title'>
              <GiCookingPot /> Cooking Timeline
            </div>
            <div className='timeline-legend'>
              <span><span className='dot prep' /> Prep</span>
              <span><span className='dot cook' /> Cook</span>
            </div>
          </div>

          <div className='timeline'>
            {stepsWithTime.map((s, i) => (
              <div className={`tline-step ${s.phase}`} key={s.id}>
                <div className='time-col'>
                  <div className='time-start'>{fmt(s.start)}</div>
                  <div className='time-dot'>
                    <span className='dot-inner'>{s.index}</span>
                  </div>
                  {i < stepsWithTime.length - 1 && <div className='time-line' />}
                </div>
                <div className='step-col'>
                  <div className='step-card'>
                    <div className='step-head'>
                      <span className={`phase-tag ${s.phase}`}>{s.phase}</span>
                      <span className='duration'>{s.minutes} min</span>
                      <span className='range'>{fmt(s.start)} – {fmt(s.end)}</span>
                    </div>
                    <p>{s.text}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className='tline-end'>
              <div className='time-col'>
                <div className='time-start finish'>{fmt(cum)}</div>
                <div className='time-dot finish'>
                  <span>✓</span>
                </div>
              </div>
              <div className='step-col'>
                <div className='end-card'>
                  <strong>Serve immediately</strong>
                  <span>{r.totalTime} min total — enjoy with extra parmesan</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='tag-footer'>
          {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
        </section>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeTimeline
