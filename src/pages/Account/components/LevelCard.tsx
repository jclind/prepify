import React, { FC } from 'react'
import toast from 'react-hot-toast'
import { levelPlaceholder } from 'src/pages/Account/accountPlaceholders'

// LevelCard — the right-column level/XP card from the P2 header. A tappable card
// that shows the cook's level + rank, a "Rewards" affordance, and an XP bar with
// a one-line label beneath it.
//
// TODO(Phase 4): the level data is a placeholder (see accountPlaceholders.ts) and
// the click currently just toasts. Wire to the real rewards/achievements screen
// + XP engine when that lands.
const lvl = levelPlaceholder

const onRewards = () => toast('Rewards & badges coming soon')

const LevelCard: FC = () => (
  <button className='acct-levelcard' onClick={onRewards}>
    <div className='acct-levelcard-top'>
      <span className='acct-lvl-chip'>
        <span className='acct-lvl-chip-num'>Lv {lvl.level}</span>
        {lvl.rank}
      </span>
      <span className='acct-rewards-cta'>
        Rewards <span aria-hidden>›</span>
      </span>
    </div>
    <div className='acct-xpbar'>
      <div className='acct-xpbar-track'>
        <div className='acct-xpbar-fill' style={{ width: `${lvl.pct}%` }} />
      </div>
      <span className='acct-xpbar-label'>
        {lvl.xp.toLocaleString()} / {lvl.xpNext.toLocaleString()} XP to Level{' '}
        {lvl.level + 1}
      </span>
    </div>
  </button>
)

export default LevelCard
