import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiEye, FiShare2, FiUserPlus } from 'react-icons/fi'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { mockProfile, mockRecipes, mockReviews } from '../mockData'
import { Stars, dollars, useEditProfile } from '../shared'
import './variant13.scss'

// V13 — Public Profile (creative). A viewer-facing chef profile: follow button,
// stats, a recipe portfolio and review showcase. A toggle flips between how the
// public sees you and your own edit view.
const Variant13: FC = () => {
  const [publicView, setPublicView] = useState(true)
  const [following, setFollowing] = useState(false)
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av13'>
      <div className='av13-toggle'>
        <FiEye />
        <span>{publicView ? 'Viewing as public' : 'Your private view'}</span>
        <button className='av13-toggle-btn' onClick={() => setPublicView(v => !v)}>
          Switch to {publicView ? 'edit view' : 'public view'}
        </button>
      </div>

      <div className='av13-banner' style={{ backgroundImage: `url(${p.coverImage})` }} />

      <div className='av13-wrap'>
        <header className='av13-head'>
          <img src={p.avatar} alt='' className='av13-avatar' />
          <div className='av13-id'>
            <h1>{p.displayName}</h1>
            <p className='av13-handle'><HiOutlineLocationMarker /> {p.location} · Home cook since {p.memberSince}</p>
            <p className='av13-bio'>{p.bio}</p>
          </div>
          <div className='av13-actions'>
            {publicView ? (
              <>
                <button className={`av13-follow ${following ? 'on' : ''}`} onClick={() => setFollowing(f => !f)}>
                  <FiUserPlus /> {following ? 'Following' : 'Follow'}
                </button>
                <button className='av13-share'><FiShare2 /></button>
              </>
            ) : (
              <button className='av13-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
            )}
          </div>
        </header>

        <div className='av13-stats'>
          <div><strong>{p.stats.recipes}</strong><span>Recipes</span></div>
          <div><strong>{p.stats.followers}</strong><span>Followers</span></div>
          <div><strong>{p.stats.following}</strong><span>Following</span></div>
          <div><strong>{p.stats.made}</strong><span>Cooked</span></div>
        </div>

        <section className='av13-section'>
          <div className='av13-sec-head'><h2>{publicView ? 'Published recipes' : 'Your recipes'}</h2><a href='#all'>See all</a></div>
          <div className='av13-grid'>
            {mockRecipes.slice(0, 8).map(r => (
              <a key={r.id} className='av13-card' href='#recipe'>
                <div className='av13-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}/serv</span></div>
                <div className='av13-body'>
                  <h3>{r.title}</h3>
                  <div className='av13-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating} ({r.ratingCount})</span></div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className='av13-section'>
          <div className='av13-sec-head'><h2>Recent reviews</h2></div>
          <div className='av13-reviews'>
            {mockReviews.map(rv => (
              <article key={rv.id} className='av13-review'>
                <img src={rv.recipeImage} alt='' />
                <div>
                  <div className='av13-rv-top'><h4>{rv.recipeTitle}</h4><Stars rating={rv.rating} size={13} /></div>
                  <p>{rv.text}</p>
                  <span className='av13-rv-date'>{rv.date}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant13
