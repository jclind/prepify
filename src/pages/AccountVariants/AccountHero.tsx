import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar, AiOutlineCalendar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiEdit, BiMap, BiShare } from 'react-icons/bi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, savedRecipes, userRecipes, ratedRecipes, MockRecipe } from './mockAccount'
import './AccountHero.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const Card: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='hero-card'>
    <img src={recipe.image} alt={recipe.title} />
    <div className='body'>
      <h3>{recipe.title}</h3>
      <div className='meta'>
        <span><CgTimer /> {recipe.totalTime}m</span>
        <span><AiOutlineStar /> {recipe.rating.rateValue}</span>
        <span className='price'>{formatPrice(recipe.servingPrice)}/serv</span>
      </div>
    </div>
  </Link>
)

const tabs = ['Saved', 'Ratings', 'Your Recipes'] as const
type Tab = (typeof tabs)[number]

const AccountHero: FC = () => {
  const [tab, setTab] = useState<Tab>('Saved')
  const data = tab === 'Saved' ? savedRecipes : tab === 'Ratings' ? ratedRecipes : userRecipes

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username}</title></Helmet>
      <div className='account-hero'>
        <header className='account-hero-banner'>
          <div className='hero-inner'>
            <img src={mockUser.avatar} alt='' className='avatar' />
            <div className='hero-info'>
              <h1>{mockUser.displayName}</h1>
              <div className='handle'>@{mockUser.username}</div>
              <p className='bio'>{mockUser.bio}</p>
              <div className='meta-row'>
                <span><BiMap /> {mockUser.location}</span>
                <span><AiOutlineCalendar /> Joined {new Date(mockUser.joined).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <div className='hero-actions'>
              <button className='primary'><BiEdit /> Edit profile</button>
              <button className='ghost'><BiShare /> Share</button>
            </div>
          </div>
          <div className='hero-stats'>
            <div className='stat'>
              <div className='num'>{mockUser.stats.saved}</div>
              <div className='lbl'>Saved</div>
            </div>
            <div className='stat'>
              <div className='num'>{mockUser.stats.recipes}</div>
              <div className='lbl'>Recipes</div>
            </div>
            <div className='stat'>
              <div className='num'>{mockUser.stats.ratings}</div>
              <div className='lbl'>Ratings</div>
            </div>
            <div className='stat'>
              <div className='num'>{mockUser.stats.made}</div>
              <div className='lbl'>Made it</div>
            </div>
            <div className='stat'>
              <div className='num'>{mockUser.stats.streak}<span>d</span></div>
              <div className='lbl'>Streak</div>
            </div>
          </div>
        </header>

        <div className='content-area'>
          <nav className='tab-bar'>
            {tabs.map(t => (
              <button
                key={t}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >{t}</button>
            ))}
          </nav>
          <div className='recipe-grid'>
            {data.map(r => <Card recipe={r} key={r.id} />)}
          </div>
        </div>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountHero
