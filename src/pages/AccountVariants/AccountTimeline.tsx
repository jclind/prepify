import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiBookmark, BiStar, BiPlusCircle } from 'react-icons/bi'
import { GiCookingPot } from 'react-icons/gi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, activity, ActivityEvent } from './mockAccount'
import './AccountTimeline.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const kindMeta: Record<ActivityEvent['kind'], { icon: React.ReactElement; verb: string; tone: string }> = {
  saved: { icon: <BiBookmark />, verb: 'saved', tone: 'saved' },
  rated: { icon: <BiStar />, verb: 'rated', tone: 'rated' },
  made: { icon: <GiCookingPot />, verb: 'made', tone: 'made' },
  created: { icon: <BiPlusCircle />, verb: 'published', tone: 'created' },
}

const filters: { id: 'all' | ActivityEvent['kind']; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'made', label: 'Cooked' },
  { id: 'rated', label: 'Rated' },
  { id: 'saved', label: 'Saved' },
  { id: 'created', label: 'Published' },
]

const AccountTimeline: FC = () => {
  const [filter, setFilter] = useState<'all' | ActivityEvent['kind']>('all')
  const events = filter === 'all' ? activity : activity.filter(e => e.kind === filter)

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username} activity</title></Helmet>
      <div className='account-timeline'>
        <header className='tl-header'>
          <img src={mockUser.avatar} alt='' className='avatar' />
          <div>
            <h1>@{mockUser.username}'s kitchen activity</h1>
            <p>{mockUser.stats.made} dishes cooked, {mockUser.stats.saved} saved, {mockUser.stats.ratings} rated.</p>
          </div>
        </header>

        <div className='filter-row'>
          {filters.map(f => (
            <button
              key={f.id}
              className={`filter ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>

        <div className='timeline'>
          {events.map((e, i) => {
            const meta = kindMeta[e.kind]
            return (
              <div className='tl-item' key={e.id}>
                <div className='tl-rail'>
                  <div className={`tl-dot ${meta.tone}`}>{meta.icon}</div>
                  {i < events.length - 1 && <div className='tl-line' />}
                </div>
                <div className='tl-content'>
                  <div className='tl-meta'>
                    <strong>You</strong> {meta.verb}{' '}
                    {e.kind === 'rated' && e.rating ? `${e.rating}★` : ''}
                    <span className='tl-when'>· {e.when}</span>
                  </div>
                  <Link to='/recipes' className='tl-card'>
                    <img src={e.recipe.image} alt='' />
                    <div className='tl-card-body'>
                      <h3>{e.recipe.title}</h3>
                      <div className='tl-card-meta'>
                        <span><CgTimer /> {e.recipe.totalTime}m</span>
                        <span><AiOutlineStar /> {e.recipe.rating.rateValue}</span>
                        <span className='price'>{formatPrice(e.recipe.servingPrice)}/serv</span>
                      </div>
                    </div>
                  </Link>
                  {e.note && <div className='tl-note'>"{e.note}"</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountTimeline
