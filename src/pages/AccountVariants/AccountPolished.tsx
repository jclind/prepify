import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiEdit } from 'react-icons/bi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, savedRecipes, userRecipes, ratedRecipes, MockRecipe } from './mockAccount'
import './AccountPolished.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const Card: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='polished-card'>
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

const AccountPolished: FC = () => {
  const [tab, setTab] = useState<Tab>('Saved')
  const data = tab === 'Saved' ? savedRecipes : tab === 'Ratings' ? ratedRecipes : userRecipes

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username}</title></Helmet>
      <div className='account-polished'>
        <header className='profile-header'>
          <img src={mockUser.avatar} alt='' className='avatar' />
          <div className='info'>
            <h1>@{mockUser.username}</h1>
            <p className='bio'>{mockUser.bio}</p>
            <div className='stat-row'>
              <span><strong>{mockUser.stats.saved}</strong> saved</span>
              <span><strong>{mockUser.stats.recipes}</strong> recipes</span>
              <span><strong>{mockUser.stats.ratings}</strong> ratings</span>
              <span><strong>{mockUser.stats.made}</strong> made</span>
            </div>
          </div>
          <button className='edit-btn'><BiEdit /> Edit profile</button>
        </header>

        <nav className='tab-bar'>
          {tabs.map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              <span className='count'>
                {t === 'Saved' ? savedRecipes.length : t === 'Ratings' ? ratedRecipes.length : userRecipes.length}
              </span>
            </button>
          ))}
        </nav>

        <div className='filter-bar'>
          <input className='filter-input' placeholder={`Search your ${tab.toLowerCase()}...`} />
          <button className='filter-chip'>All cuisines</button>
          <button className='filter-chip'>All meal types</button>
          <button className='filter-chip'>Recently added</button>
        </div>

        <div className='recipe-grid'>
          {data.map(r => <Card recipe={r} key={r.id} />)}
        </div>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountPolished
