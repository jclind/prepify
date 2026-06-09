import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar, AiOutlineCalendar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiEdit, BiMap } from 'react-icons/bi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, savedRecipes, userRecipes, ratedRecipes, MockRecipe } from './mockAccount'
import './AccountCover.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const Card: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='cover-card'>
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

const AccountCover: FC = () => {
  const [tab, setTab] = useState<Tab>('Saved')
  const data = tab === 'Saved' ? savedRecipes : tab === 'Ratings' ? ratedRecipes : userRecipes

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username}</title></Helmet>
      <div className='account-cover'>
        <div className='cover-banner' style={{ backgroundImage: `url(${mockUser.cover})` }}>
          <button className='edit-cover-btn'><BiEdit /> Edit cover</button>
        </div>

        <div className='cover-content'>
          <div className='cover-header'>
            <img src={mockUser.avatar} alt='' className='avatar' />
            <div className='header-actions'>
              <button className='edit-btn'><BiEdit /> Edit profile</button>
            </div>
          </div>
          <div className='cover-info'>
            <h1>{mockUser.displayName}</h1>
            <div className='handle'>@{mockUser.username}</div>
            <p className='bio'>{mockUser.bio}</p>
            <div className='meta-row'>
              <span><BiMap /> {mockUser.location}</span>
              <span><AiOutlineCalendar /> Joined {new Date(mockUser.joined).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
            <div className='stat-row'>
              <span><strong>{mockUser.stats.saved}</strong> Saved</span>
              <span><strong>{mockUser.stats.recipes}</strong> Recipes</span>
              <span><strong>{mockUser.stats.ratings}</strong> Ratings</span>
              <span><strong>{mockUser.stats.made}</strong> Made</span>
            </div>
          </div>

          <nav className='tab-bar'>
            {tabs.map(t => (
              <button
                key={t}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
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

export default AccountCover
