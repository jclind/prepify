import React, { FC, useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineArrowLeft, AiOutlineArrowRight, AiOutlineCheck } from 'react-icons/ai'
import { BiTimer, BiPlay, BiPause } from 'react-icons/bi'
import { BsCheckCircleFill } from 'react-icons/bs'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe } from '../mockRecipe'
import './RecipeCookMode.scss'

const RecipeCookMode: FC = () => {
  const r = mockRecipe
  const [stepIdx, setStepIdx] = useState(0)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // timer
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            setRunning(false)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [running, secondsLeft])

  const step = r.steps[stepIdx]
  const isDone = stepIdx >= r.steps.length

  const next = () => {
    setCompletedSteps(p => new Set(p).add(stepIdx))
    setStepIdx(i => Math.min(i + 1, r.steps.length))
    setRunning(false)
    setSecondsLeft(0)
  }
  const prev = () => {
    setStepIdx(i => Math.max(0, i - 1))
    setRunning(false)
    setSecondsLeft(0)
  }

  const toggleIng = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  const startTimer = () => {
    if (secondsLeft === 0 && step) setSecondsLeft(step.minutes * 60)
    setRunning(r => !r)
  }

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <>
      <Helmet><title>Prepify | Cooking: {r.title}</title></Helmet>
      <div className='cook-mode'>
        <aside className='sidebar'>
          <img src={r.image} alt={r.title} className='thumb' />
          <h2>{r.title}</h2>
          <div className='cuisine'>{r.cuisine}</div>

          <div className='ing-section'>
            <div className='ing-head'>Ingredients</div>
            <ul>
              {r.ingredients.map(i => (
                <li
                  key={i.id}
                  className={checked.has(i.id) ? 'checked' : ''}
                  onClick={() => toggleIng(i.id)}
                >
                  <span className='check'>{checked.has(i.id) ? <AiOutlineCheck /> : null}</span>
                  <div>
                    <div className='qty'>{i.qty}</div>
                    <div className='name'>{i.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className='cook-main'>
          <div className='progress'>
            <div className='progress-bar'>
              <div className='progress-fill' style={{ width: `${(Math.min(stepIdx, r.steps.length) / r.steps.length) * 100}%` }} />
            </div>
            <div className='progress-text'>
              {isDone ? 'Done!' : `Step ${stepIdx + 1} of ${r.steps.length}`}
            </div>
          </div>

          {!isDone ? (
            <>
              <div className='step-card'>
                <div className='step-meta'>
                  <span className={`phase ${step.phase}`}>{step.phase}</span>
                  <span className='time-est'><BiTimer /> About {step.minutes} min</span>
                </div>
                <div className='step-text'>{step.text}</div>

                <div className='timer'>
                  <div className='timer-display'>{fmtTime(secondsLeft || step.minutes * 60)}</div>
                  <button className={`timer-btn ${running ? 'running' : ''}`} onClick={startTimer}>
                    {running ? <><BiPause /> Pause</> : <><BiPlay /> Start {step.minutes}m timer</>}
                  </button>
                </div>
              </div>

              <div className='nav'>
                <button className='nav-btn back' onClick={prev} disabled={stepIdx === 0}>
                  <AiOutlineArrowLeft /> Back
                </button>
                <button className='nav-btn next' onClick={next}>
                  {stepIdx === r.steps.length - 1 ? "Finish" : <>Next step <AiOutlineArrowRight /></>}
                </button>
              </div>
            </>
          ) : (
            <div className='done-card'>
              <BsCheckCircleFill className='done-icon' />
              <h2>Dinner is served!</h2>
              <p>You made {r.title}. How did it go?</p>
              <div className='done-actions'>
                <button className='primary'>Rate this recipe</button>
                <button onClick={() => { setStepIdx(0); setCompletedSteps(new Set()) }}>Cook again</button>
              </div>
            </div>
          )}

          <div className='step-rail'>
            {r.steps.map((s, i) => (
              <button
                key={s.id}
                className={`rail-step ${i === stepIdx ? 'active' : ''} ${completedSteps.has(i) ? 'done' : ''}`}
                onClick={() => setStepIdx(i)}
              >
                {completedSteps.has(i) ? <AiOutlineCheck /> : i + 1}
              </button>
            ))}
          </div>
        </main>
      </div>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeCookMode
