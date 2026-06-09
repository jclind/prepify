import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiFillStar } from 'react-icons/ai'
import { BsBookmarkFill, BsFire } from 'react-icons/bs'
import DesignSwitcher from '../DesignSwitcher'
import { mockRecipes } from '../mockData'
import { Hero, RecipeCard, SectionHeader } from './_shared'
import './HomeCommunity.scss'

const feed = [
  { who: 'tonyfoods', icon: 'cook', text: 'cooked', recipe: mockRecipes[2], when: '2m ago' },
  { who: 'rosacooks', icon: 'star', text: 'left a 5★ review on', recipe: mockRecipes[1], when: '8m ago' },
  { who: 'plantedlina', icon: 'save', text: 'saved', recipe: mockRecipes[3], when: '14m ago' },
  { who: 'grilldad', icon: 'cook', text: 'cooked', recipe: mockRecipes[7], when: '22m ago' },
  { who: 'olivegrove', icon: 'star', text: 'left a 4★ review on', recipe: mockRecipes[6], when: '31m ago' },
]

const Icon: FC<{ kind: string }> = ({ kind }) =>
  kind === 'cook' ? <BsFire /> : kind === 'star' ? <AiFillStar /> : <BsBookmarkFill />

const HomeCommunity: FC = () => (
  <>
    <Helmet><title>Prepify | Community</title></Helmet>
    <div className='v2-page home-community'>
      <Hero heading='Cook along with thousands of home cooks.' sub='See what the community is making right now and join in.' />

      <section className='community-layout'>
        <div className='feed'>
          <h2><span className='live-dot' /> Happening now</h2>
          <ul>
            {feed.map((f, i) => (
              <li key={i}>
                <span className={`badge ${f.icon}`}><Icon kind={f.icon} /></span>
                <span className='text'>
                  <strong>@{f.who}</strong> {f.text} <a href='#!'>{f.recipe.title}</a>
                </span>
                <span className='when'>{f.when}</span>
              </li>
            ))}
          </ul>
        </div>

        <aside className='leaderboard'>
          <h3>Top cooks this week</h3>
          {['mariekitchen', 'castiron', 'noodlehouse'].map((name, i) => (
            <div className='leader' key={name}>
              <span className='rank'>{i + 1}</span>
              <span className='avatar'>{name[0].toUpperCase()}</span>
              <span className='name'>@{name}</span>
              <span className='cooks'>{42 - i * 7} cooked</span>
            </div>
          ))}
        </aside>
      </section>

      <section>
        <SectionHeader title='Trending in the community' />
        <div className='grid-4'>
          {mockRecipes.slice(0, 4).map(r => <RecipeCard recipe={r} key={r.id} />)}
        </div>
      </section>
    </div>
    <DesignSwitcher />
  </>
)

export default HomeCommunity
