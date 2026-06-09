import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { AiOutlineStar, AiOutlineCalendar } from 'react-icons/ai'
import { CgTimer } from 'react-icons/cg'
import { BiEdit, BiMap, BiBookmark, BiStar, BiUser } from 'react-icons/bi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, savedRecipes, userRecipes, ratedRecipes, MockRecipe } from './mockAccount'
import './AccountSidebar.scss'

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

const Card: FC<{ recipe: MockRecipe }> = ({ recipe }) => (
  <Link to='/recipes' className='sidebar-card'>
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

const tabs = [
  { id: 'saved', label: 'Saved', icon: <BiBookmark />, data: savedRecipes },
  { id: 'ratings', label: 'Ratings', icon: <BiStar />, data: ratedRecipes },
  { id: 'yours', label: 'Your Recipes', icon: <BiUser />, data: userRecipes },
] as const

const AccountSidebar: FC = () => {
  const [tab, setTab] = useState<typeof tabs[number]['id']>('saved')
  const current = tabs.find(t => t.id === tab)!

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username}</title></Helmet>
      <div className='account-sidebar'>
        <aside className='side-rail'>
          <img src={mockUser.avatar} alt='' className='avatar' />
          <h1>{mockUser.displayName}</h1>
          <div className='handle'>@{mockUser.username}</div>
          <p className='bio'>{mockUser.bio}</p>
          <div className='meta-list'>
            <div><BiMap /> {mockUser.location}</div>
            <div><AiOutlineCalendar /> Joined {new Date(mockUser.joined).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</div>
          </div>
          <button className='edit-btn'><BiEdit /> Edit profile</button>
          <div className='stat-list'>
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
        </aside>

        <main className='main-pane'>
          <nav className='tab-bar'>
            {tabs.map(t => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon} {t.label}
                <span className='count'>{t.data.length}</span>
              </button>
            ))}
          </nav>
          <div className='recipe-grid'>
            {current.data.map(r => <Card recipe={r} key={r.id} />)}
          </div>
        </main>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountSidebar
