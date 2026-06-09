import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar, AiOutlineFire } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiBookmark, BiTrendingUp, BiTime } from 'react-icons/bi'
import { GiCookingPot } from 'react-icons/gi'
import { FiDollarSign } from 'react-icons/fi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, activity, savedRecipes, streakDays } from './mockAccount'
import './AccountDashboard.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const AccountDashboard: FC = () => {
  const lastMade = activity.find(e => e.kind === 'made')!

  return (
    <>
      <Helmet><title>Prepify | Dashboard</title></Helmet>
      <div className='account-dashboard'>
        <header className='dash-header'>
          <img src={mockUser.avatar} alt='' className='avatar' />
          <div className='greeting'>
            <div className='hi'>Welcome back, {mockUser.displayName.split(' ')[0]}</div>
            <h1>Your kitchen this month</h1>
          </div>
          <button className='settings'>Edit profile</button>
        </header>

        <div className='widget-grid'>
          <div className='widget hero-widget'>
            <div className='widget-label'><AiOutlineFire /> Current streak</div>
            <div className='widget-value'>{mockUser.stats.streak}<span>days</span></div>
            <div className='streak-heatmap'>
              {streakDays.map((d, i) => (
                <span key={i} className={`heat-cell ${d === 1 ? 'full' : d === 0.5 ? 'half' : 'empty'}`} />
              ))}
            </div>
            <div className='widget-foot'>Cook 1 more day to hit your record</div>
          </div>

          <div className='widget'>
            <div className='widget-label'><FiDollarSign /> Money saved vs takeout</div>
            <div className='widget-value'>${mockUser.stats.moneySaved}</div>
            <div className='widget-foot'>this month</div>
          </div>

          <div className='widget'>
            <div className='widget-label'><BiTime /> Time saved planning</div>
            <div className='widget-value'>{mockUser.stats.timeSaved}<span>h</span></div>
            <div className='widget-foot'>vs unplanned weeks</div>
          </div>

          <div className='widget'>
            <div className='widget-label'><GiCookingPot /> Recipes made</div>
            <div className='widget-value'>{mockUser.stats.made}</div>
            <div className='widget-foot'>all time · {Math.round(mockUser.stats.made / 4)} this month</div>
          </div>

          <div className='widget'>
            <div className='widget-label'><BiBookmark /> Saved recipes</div>
            <div className='widget-value'>{mockUser.stats.saved}</div>
            <div className='widget-foot'><Link to='/account/saved-recipes'>Browse library →</Link></div>
          </div>

          <div className='widget'>
            <div className='widget-label'><AiOutlineStar /> Average rating given</div>
            <div className='widget-value'>4.5<span>★</span></div>
            <div className='widget-foot'>from {mockUser.stats.ratings} ratings</div>
          </div>

          <div className='widget wide last-made'>
            <div className='widget-label'><BiTrendingUp /> Last cooked</div>
            <div className='last-content'>
              <img src={lastMade.recipe.image} alt='' />
              <div>
                <h3>{lastMade.recipe.title}</h3>
                <div className='last-meta'>
                  <span><CgTimer /> {lastMade.recipe.totalTime} min</span>
                  <span><AiOutlineStar /> {lastMade.recipe.rating.rateValue}</span>
                  <span className='price'>{formatPrice(lastMade.recipe.servingPrice)}/serv</span>
                </div>
                <div className='last-note'>"{lastMade.note}"</div>
                <div className='last-when'>{lastMade.when}</div>
              </div>
            </div>
          </div>

          <div className='widget wide recent-saved'>
            <div className='widget-label'><BiBookmark /> Recently saved</div>
            <div className='saved-row'>
              {savedRecipes.slice(0, 4).map(r => (
                <Link to='/recipes' key={r.id} className='saved-mini'>
                  <img src={r.image} alt='' />
                  <div className='mini-title'>{r.title}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountDashboard
