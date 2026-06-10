import React, { FC, useState } from 'react'
import { AiOutlineStar, AiFillStar } from 'react-icons/ai'
import { IoClose } from 'react-icons/io5'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, mockRecipes, mockReviews } from './mockData'
import './editProfile.scss'
import './otherTab.scss'

// Small shared atoms + helpers used across the account redesign variants.
// Anything visual that should look identical everywhere (a star row, a price
// string) lives here; distinctive layout/styling stays inside each variant.

export const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`

export const recipeTotal = (servingPrice: number, servings: number) =>
  dollars(servingPrice * servings)

type StarsProps = { rating: number; size?: number; color?: string }

export const Stars: FC<StarsProps> = ({ rating, size = 14, color = '#ffb300' }) => {
  const rounded = Math.round(rating)
  return (
    <span
      className='av-stars'
      style={{ display: 'inline-flex', gap: 1, color }}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(i =>
        i <= rounded ? (
          <AiFillStar key={i} size={size} />
        ) : (
          <AiOutlineStar key={i} size={size} />
        )
      )}
    </span>
  )
}

// Reusable edit-profile experience. Most variants surface profile editing
// inline via this modal-panel (state is local/non-persisting — these are design
// previews). Returns the open setter plus the panel element to drop into the
// variant. A couple of variants implement truly in-layout editing instead.
export const useEditProfile = () => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(mockProfile.displayName)
  const [bio, setBio] = useState(mockProfile.bio)
  const [location, setLocation] = useState(mockProfile.location)

  const panel = !open ? null : (
    <div className='ep-overlay' role='dialog' aria-modal='true' aria-label='Edit profile'>
      <div className='ep-backdrop' onClick={() => setOpen(false)} />
      <div className='ep-card'>
        <div className='ep-head'>
          <h2>Edit profile</h2>
          <button className='ep-x' onClick={() => setOpen(false)} aria-label='Close'>
            <IoClose />
          </button>
        </div>
        <div className='ep-avatar-row'>
          <img src={mockProfile.avatar} alt='' className='ep-avatar' />
          <button className='ep-change'>Change photo</button>
        </div>
        <label className='ep-field'>
          <span>Display name</span>
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className='ep-field'>
          <span>Location</span>
          <input value={location} onChange={e => setLocation(e.target.value)} />
        </label>
        <label className='ep-field'>
          <span>Bio</span>
          <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} />
        </label>
        <div className='ep-actions'>
          <button className='ep-cancel' onClick={() => setOpen(false)}>Cancel</button>
          <button className='ep-save' onClick={() => setOpen(false)}>Save changes</button>
        </div>
      </div>
    </div>
  )

  return { open, setOpen, panel, name, bio, location }
}

// Neutral content for the non-representative tabs (ratings / your recipes /
// drafts). The Saved grid is the sub-page each variant designs custom; these
// keep a clean, consistent look so the comparison stays focused on the shell.
export const OtherTab: FC<{ tab: 'ratings' | 'recipes' | 'drafts' }> = ({ tab }) => {
  if (tab === 'ratings') {
    return (
      <div className='ot-reviews'>
        {mockReviews.map(r => (
          <article key={r.id} className='ot-review'>
            <img src={r.recipeImage} alt='' />
            <div className='ot-review-body'>
              <div className='ot-review-top'>
                <h4>{r.recipeTitle}</h4>
                <span className='ot-date'>{r.date}</span>
              </div>
              <Stars rating={r.rating} size={15} />
              <p>{r.text}</p>
            </div>
          </article>
        ))}
      </div>
    )
  }
  if (tab === 'drafts') {
    return (
      <div className='ot-drafts'>
        {mockRecipes.slice(0, 3).map((r, i) => (
          <article key={r.id} className='ot-draft'>
            <img src={r.image} alt='' />
            <div className='ot-draft-body'>
              <span className='ot-draft-tag'>Draft</span>
              <h4>{r.title}</h4>
              <div className='ot-progress'>
                <div className='ot-progress-bar' style={{ width: `${[60, 35, 85][i]}%` }} />
              </div>
              <span className='ot-draft-meta'>{[60, 35, 85][i]}% complete · edited {['2d', '1w', '3w'][i]} ago</span>
            </div>
            <button className='ot-continue'>
              <FiEdit3 /> Continue
            </button>
          </article>
        ))}
      </div>
    )
  }
  // recipes
  return (
    <div className='ot-grid'>
      {mockRecipes.slice(0, 6).map(r => (
        <article key={r.id} className='ot-card'>
          <img src={r.image} alt='' />
          <div className='ot-card-body'>
            <h4>{r.title}</h4>
            <div className='ot-card-meta'>
              <span><CgTimer /> {r.totalTime}m</span>
              <Stars rating={r.rating} size={13} />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
