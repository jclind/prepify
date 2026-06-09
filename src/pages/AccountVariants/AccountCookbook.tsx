import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, savedRecipes, userRecipes, ratedRecipes, MockRecipe } from './mockAccount'
import './AccountCookbook.scss'

const chapters = [
  {
    n: 'I',
    title: 'My Own Recipes',
    subtitle: 'The ones I dreamed up',
    recipes: userRecipes,
  },
  {
    n: 'II',
    title: 'My Favorites',
    subtitle: 'Saved for the right moment',
    recipes: savedRecipes.slice(0, 4),
  },
  {
    n: 'III',
    title: 'My Hall of Fame',
    subtitle: 'Rated four stars or higher',
    recipes: ratedRecipes.slice(0, 4),
  },
]

const ChapterRow: FC<{ recipes: MockRecipe[] }> = ({ recipes }) => (
  <div className='chapter-recipes'>
    {recipes.map((r, i) => (
      <Link to='/recipes' key={r.id} className='chapter-entry'>
        <div className='entry-num'>{(i + 1).toString().padStart(2, '0')}</div>
        <img src={r.image} alt='' />
        <div className='entry-body'>
          <h3>{r.title}</h3>
          <div className='dots' />
          <div className='entry-page'>p. {12 + i * 4}</div>
        </div>
      </Link>
    ))}
  </div>
)

const AccountCookbook: FC = () => {
  return (
    <>
      <Helmet><title>Prepify | {mockUser.displayName}'s Cookbook</title></Helmet>
      <div className='account-cookbook'>
        <div className='cookbook-frame'>
          <header className='cookbook-cover'>
            <span className='kicker'>A Personal Cookbook</span>
            <h1>{mockUser.displayName}'s Kitchen</h1>
            <p className='subtitle'>{mockUser.bio}</p>
            <div className='cover-meta'>
              <img src={mockUser.avatar} alt='' />
              <div>
                <div className='by'>by @{mockUser.username}</div>
                <div className='cover-pub'>
                  Volume I · {new Date(mockUser.joined).getFullYear()} — {new Date().getFullYear()}
                </div>
              </div>
            </div>
          </header>

          <div className='table-of-contents'>
            <div className='toc-title'>Table of Contents</div>
            {chapters.map((c, i) => (
              <a href={`#chapter-${i}`} key={c.n} className='toc-line'>
                <span className='toc-num'>Chapter {c.n}</span>
                <span className='toc-name'>{c.title}</span>
                <span className='toc-dots' />
                <span className='toc-page'>p. {3 + i * 16}</span>
              </a>
            ))}
          </div>

          {chapters.map((c, i) => (
            <section className='chapter' id={`chapter-${i}`} key={c.n}>
              <div className='chapter-head'>
                <span className='chapter-n'>Chapter {c.n}</span>
                <h2>{c.title}</h2>
                <p>{c.subtitle}</p>
              </div>
              <ChapterRow recipes={c.recipes} />
            </section>
          ))}

          <footer className='cookbook-footer'>
            <div className='footer-rule' />
            <p>Compiled with love in {mockUser.location} · A Prepify cookbook</p>
          </footer>
        </div>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountCookbook
