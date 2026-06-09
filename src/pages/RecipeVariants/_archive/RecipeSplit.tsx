import React, { FC, useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineStar, AiOutlineUser, AiOutlineCheck } from 'react-icons/ai'
import { BiBookmark, BiPrinter } from 'react-icons/bi'
import { FiMinus, FiPlus } from 'react-icons/fi'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeSplit.scss'

const RecipeSplit: FC = () => {
  const r = mockRecipe
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const steps = document.querySelectorAll<HTMLElement>('.split-step')
      let curr = 0
      steps.forEach((el, i) => {
        if (el.getBoundingClientRect().top < window.innerHeight / 2) curr = i
      })
      setActiveStep(curr)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggle = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className='recipe-split'>
        <aside className='split-left'>
          <div className='left-inner'>
            <img src={r.image} alt={r.title} />
            <div className='cuisine'>{r.cuisine}</div>
            <h1>{r.title}</h1>

            <div className='quick-stats'>
              <div><AiOutlineClockCircle /> {r.totalTime}m</div>
              <div><AiOutlineUser /> {servings}</div>
              <div><AiOutlineStar /> {r.rating.rateValue}</div>
              <div className='price'>{formatPrice(r.servingPrice)}</div>
            </div>

            <div className='actions'>
              <button className='primary'><BiBookmark /> Save</button>
              <button><BiPrinter /></button>
            </div>

            <div className='ing-header'>
              <h2>Ingredients</h2>
              <div className='serv-ctrl'>
                <button onClick={() => setServings(Math.max(1, servings - 1))}><FiMinus /></button>
                <span>{servings}</span>
                <button onClick={() => setServings(servings + 1)}><FiPlus /></button>
              </div>
            </div>
            <ul className='ing-list'>
              {r.ingredients.map(i => (
                <li
                  key={i.id}
                  className={checked.has(i.id) ? 'checked' : ''}
                  onClick={() => toggle(i.id)}
                >
                  <span className='check'>{checked.has(i.id) ? <AiOutlineCheck /> : null}</span>
                  <span className='qty'>{i.qty}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
            <div className='progress-mini'>
              <div className='fill' style={{ width: `${(checked.size / r.ingredients.length) * 100}%` }} />
              <div className='label'>{checked.size} of {r.ingredients.length} gathered</div>
            </div>
          </div>
        </aside>

        <main className='split-right'>
          <div className='right-header'>
            <p className='desc'>{r.description}</p>
            <div className='meta-row'>
              <img src={r.authorAvatar} alt='' />
              <span>by <strong>@{r.author}</strong></span>
              <span className='dot'>·</span>
              <span>{r.tags.slice(0, 3).join(' · ')}</span>
            </div>
          </div>

          <div className='steps-progress'>
            Step {activeStep + 1} of {r.steps.length}
            <div className='dots'>
              {r.steps.map((_, i) => (
                <span key={i} className={`dot ${i <= activeStep ? 'on' : ''}`} />
              ))}
            </div>
          </div>

          <ol className='steps'>
            {r.steps.map((s, i) => (
              <li
                key={s.id}
                className={`split-step ${i === activeStep ? 'active' : ''} ${i < activeStep ? 'past' : ''}`}
              >
                <div className='step-num'>{s.index}</div>
                <div className='step-content'>
                  <div className='step-meta'>
                    <span className={`phase ${s.phase}`}>{s.phase}</span>
                    <span className='time'>{s.minutes} min</span>
                  </div>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className='tags-foot'>
            {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
          </div>
        </main>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeSplit
