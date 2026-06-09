import React, { FC, useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiRevision } from 'react-icons/bi'
import DesignSwitcher from './DesignSwitcher'
import { mockRecipes } from './mockData'
import './HomeChat.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

type Answer = { meal?: string; time?: string; budget?: string; diet?: string }

type Question = {
  id: keyof Answer
  prompt: (a: Answer) => string
  options: { label: string; value: string; emoji?: string }[]
}

const questions: Question[] = [
  {
    id: 'meal',
    prompt: () => "Hi! 👋 What meal are we sorting out?",
    options: [
      { label: 'Breakfast', value: 'breakfast', emoji: '☕' },
      { label: 'Lunch', value: 'lunch', emoji: '🥗' },
      { label: 'Dinner', value: 'dinner', emoji: '🍽️' },
      { label: 'A snack', value: 'snack', emoji: '🍿' },
    ],
  },
  {
    id: 'time',
    prompt: a => `Got it — ${a.meal}. How much time do you have?`,
    options: [
      { label: 'Under 15 min', value: '15' },
      { label: 'Under 30 min', value: '30' },
      { label: 'Under 1 hour', value: '60' },
      { label: 'Time is no issue', value: 'any' },
    ],
  },
  {
    id: 'budget',
    prompt: () => "What's the budget per serving?",
    options: [
      { label: 'Under $2', value: '2' },
      { label: 'Under $5', value: '5' },
      { label: "I'm splurging", value: 'splurge' },
      { label: "No preference", value: 'any' },
    ],
  },
  {
    id: 'diet',
    prompt: () => "Any dietary preferences?",
    options: [
      { label: 'Anything goes', value: 'any' },
      { label: 'Vegetarian', value: 'veg', emoji: '🌱' },
      { label: 'High-protein', value: 'protein', emoji: '💪' },
      { label: 'Gluten-free', value: 'gf' },
    ],
  },
]

const HomeChat: FC = () => {
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [showResults, setShowResults] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [stepIdx, showResults])

  const answer = (val: string, label: string) => {
    const q = questions[stepIdx]
    setAnswers(a => ({ ...a, [q.id]: label }))
    if (stepIdx === questions.length - 1) {
      setTimeout(() => setShowResults(true), 500)
    } else {
      setTimeout(() => setStepIdx(stepIdx + 1), 350)
    }
  }

  const reset = () => {
    setStepIdx(0)
    setAnswers({})
    setShowResults(false)
  }

  const visibleQuestions = questions.slice(0, stepIdx + 1)
  const suggestions = mockRecipes.slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return (
    <>
      <Helmet><title>Prepify | What's for dinner?</title></Helmet>
      <div className='home-chat'>
        <header className='chat-header'>
          <div className='avatar'>P</div>
          <div>
            <div className='name'>Prepify</div>
            <div className='status'>{greeting} · here to help</div>
          </div>
          <button className='reset-btn' onClick={reset}><BiRevision /> Start over</button>
        </header>

        <div className='chat-stream' ref={scrollRef}>
          {visibleQuestions.map((q, i) => {
            const answered = (i < stepIdx) || showResults
            return (
              <React.Fragment key={q.id}>
                <div className='bubble bot'>
                  <div className='avatar small'>P</div>
                  <div className='bubble-body'>{q.prompt(answers)}</div>
                </div>
                {answered && answers[q.id] && (
                  <div className='bubble user'>
                    <div className='bubble-body'>{answers[q.id]}</div>
                  </div>
                )}
                {!answered && i === stepIdx && (
                  <div className='options-row'>
                    {q.options.map(opt => (
                      <button
                        key={opt.value}
                        className='option-chip'
                        onClick={() => answer(opt.value, opt.label)}
                      >
                        {opt.emoji && <span className='emoji'>{opt.emoji}</span>}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            )
          })}

          {showResults && (
            <>
              <div className='bubble bot'>
                <div className='avatar small'>P</div>
                <div className='bubble-body'>
                  Perfect. Here are three recipes that fit your {answers.meal?.toLowerCase()} mood:
                </div>
              </div>
              <div className='suggestions'>
                {suggestions.map(r => (
                  <Link to='/recipes' key={r.id} className='suggestion-card'>
                    <img src={r.image} alt={r.title} />
                    <div className='sg-body'>
                      <h3>{r.title}</h3>
                      <div className='sg-meta'>
                        <span><CgTimer /> {r.totalTime}m</span>
                        <span><AiOutlineStar /> {r.rating.rateValue}</span>
                        <span className='price'>{formatPrice(r.servingPrice)}/serv</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className='bubble bot'>
                <div className='avatar small'>P</div>
                <div className='bubble-body'>
                  Want me to suggest different ones, or save these to your plan?
                </div>
              </div>
              <div className='options-row'>
                <button className='option-chip'>Show me more</button>
                <button className='option-chip primary'>Save to plan</button>
                <button className='option-chip' onClick={reset}>Start over</button>
              </div>
            </>
          )}
        </div>
      </div>
      <DesignSwitcher />
    </>
  )
}

export default HomeChat
