import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { BiEdit, BiPlusCircle, BiBookmark } from 'react-icons/bi'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, collections } from './mockAccount'
import './AccountCollections.scss'

const AccountCollections: FC = () => {
  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username}'s Collections</title></Helmet>
      <div className='account-collections'>
        <header className='coll-header'>
          <img src={mockUser.avatar} alt='' className='avatar' />
          <div className='id'>
            <div className='handle'>@{mockUser.username}</div>
            <h1>My Collections</h1>
            <p>{collections.length} collections · {collections.reduce((s, c) => s + c.count, 0)} recipes saved</p>
          </div>
          <button className='edit-btn'><BiEdit /> Edit profile</button>
        </header>

        <div className='collections-grid'>
          {collections.map(c => (
            <Link to='/recipes' key={c.id} className='collection-card'>
              <div className='cover-grid'>
                {c.cover.map((src, i) => (
                  <img key={i} src={src} alt='' />
                ))}
                <div className='cover-overlay'>
                  <BiBookmark /> {c.count}
                </div>
              </div>
              <div className='coll-body' style={{ borderTopColor: c.color }}>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <div className='coll-foot'>
                  <span>{c.count} recipes</span>
                  <span className='arrow'>Open →</span>
                </div>
              </div>
            </Link>
          ))}

          <button className='new-collection'>
            <BiPlusCircle className='plus' />
            <span className='new-label'>New collection</span>
            <span className='new-sub'>Group recipes by mood, occasion, or anything else</span>
          </button>
        </div>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountCollections
