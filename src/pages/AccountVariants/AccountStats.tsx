import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import AccountDesignSwitcher from './AccountDesignSwitcher'
import { mockUser, cuisineBreakdown, streakDays, savedRecipes } from './mockAccount'
import './AccountStats.scss'

const AccountStats: FC = () => {
  // Mock weekly activity bars (last 12 weeks)
  const weeks = [3, 5, 4, 6, 5, 7, 4, 5, 6, 5, 7, 6]
  const maxWeek = Math.max(...weeks)

  const topRecipe = savedRecipes[0]

  return (
    <>
      <Helmet><title>Prepify | @{mockUser.username} Stats</title></Helmet>
      <div className='account-stats'>
        <header className='stats-header'>
          <div className='id-block'>
            <img src={mockUser.avatar} alt='' className='avatar' />
            <div>
              <div className='kicker'>Your kitchen, in numbers</div>
              <h1>{mockUser.displayName}</h1>
              <div className='since'>Cooking on Prepify since {new Date(mockUser.joined).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </header>

        <section className='headline-row'>
          <div className='headline'>
            <div className='headline-num'>${mockUser.stats.moneySaved}</div>
            <div className='headline-lbl'>saved vs takeout</div>
            <div className='headline-sub'>This month</div>
          </div>
          <div className='headline'>
            <div className='headline-num'>{mockUser.stats.made}</div>
            <div className='headline-lbl'>meals cooked</div>
            <div className='headline-sub'>All time</div>
          </div>
          <div className='headline'>
            <div className='headline-num'>{mockUser.stats.streak}<span>d</span></div>
            <div className='headline-lbl'>current streak</div>
            <div className='headline-sub'>Personal record: 21d</div>
          </div>
          <div className='headline'>
            <div className='headline-num'>{mockUser.stats.timeSaved}<span>h</span></div>
            <div className='headline-lbl'>time saved</div>
            <div className='headline-sub'>Planning + shopping</div>
          </div>
        </section>

        <section className='charts'>
          <div className='chart-card'>
            <div className='chart-title'>Cooking activity</div>
            <div className='chart-sub'>Meals cooked per week, last 12 weeks</div>
            <div className='bar-chart'>
              {weeks.map((v, i) => (
                <div key={i} className='bar-col' title={`${v} meals`}>
                  <div className='bar' style={{ height: `${(v / maxWeek) * 100}%` }} />
                  <div className='bar-label'>W{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <div className='chart-card'>
            <div className='chart-title'>Most-cooked cuisines</div>
            <div className='chart-sub'>By share of your cooked recipes</div>
            <div className='donut-row'>
              <div className='donut-track'>
                {cuisineBreakdown.reduce((acc, c, i) => {
                  const prevOffset = acc.offset
                  acc.offset += c.pct
                  return {
                    offset: acc.offset,
                    segments: [
                      ...acc.segments,
                      <div
                        key={i}
                        className='donut-seg'
                        style={{
                          background: c.color,
                          left: `${prevOffset}%`,
                          width: `${c.pct}%`,
                        }}
                      />
                    ]
                  }
                }, { offset: 0, segments: [] as React.ReactNode[] }).segments}
              </div>
              <ul className='legend'>
                {cuisineBreakdown.map(c => (
                  <li key={c.name}>
                    <span className='swatch' style={{ background: c.color }} />
                    <span className='name'>{c.name}</span>
                    <span className='pct'>{c.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className='chart-card streak-card'>
            <div className='chart-title'>30-day cooking heatmap</div>
            <div className='chart-sub'>Squares filled the day you cooked</div>
            <div className='heat-grid'>
              {streakDays.map((d, i) => (
                <span key={i} className={`heat-cell ${d === 1 ? 'full' : d === 0.5 ? 'half' : 'empty'}`} />
              ))}
            </div>
            <div className='heat-legend'>
              <span><span className='swatch empty' /> Skipped</span>
              <span><span className='swatch half' /> Started</span>
              <span><span className='swatch full' /> Cooked</span>
            </div>
          </div>

          <div className='chart-card'>
            <div className='chart-title'>Your most-cooked recipe</div>
            <div className='chart-sub'>Made 7 times</div>
            <div className='top-recipe'>
              <img src={topRecipe.image} alt='' />
              <div className='top-info'>
                <h3>{topRecipe.title}</h3>
                <div className='top-stats'>
                  <span>{topRecipe.cuisine}</span>
                  <span>·</span>
                  <span>{topRecipe.totalTime} min</span>
                  <span>·</span>
                  <span>${(topRecipe.servingPrice / 100).toFixed(2)}/serv</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <AccountDesignSwitcher />
    </>
  )
}

export default AccountStats
