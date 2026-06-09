import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar, AiOutlineCalendar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiEdit, BiMap } from 'react-icons/bi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, savedRecipes, userRecipes, ratedRecipes, MockRecipe } from './mockAccount'
import './AccountCard.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const Card: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='card-card'>
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

const AccountCard: FC = () => {
  const [tab, setTab] = useState<Tab>('Saved')
  const data = tab === 'Saved' ? savedRecipes : tab === 'Ratings' ? ratedRecipes : userRecipes

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username}</title></Helmet>
      <div className='account-card'>
        <div className='profile-card'>
          <img src={mockUser.avatar} alt='' className='avatar' />
          <div className='card-body'>
            <h1>{mockUser.displayName}</h1>
            <div className='handle'>@{mockUser.username}</div>
            <p className='bio'>{mockUser.bio}</p>
            <div className='meta-row'>
              <span><BiMap /> {mockUser.location}</span>
              <span><AiOutlineCalendar /> Joined {new Date(mockUser.joined).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
            <button className='edit-btn'><BiEdit /> Edit profile</button>
          </div>
          <div className='card-stats'>
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
              <div className='lbl'>Made</div>
            </div>
          </div>
        </div>

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
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountCard
