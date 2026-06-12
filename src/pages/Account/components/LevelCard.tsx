import React, { FC } from 'react'

// LevelCard — the right-column level/XP card from the P2 header. A tappable card
// that shows the cook's level + rank, a "Rewards" affordance, and an XP bar with
// a one-line label beneath it. Level/XP are real (GET /getGamification, derived
// from the user's activity); clicking opens the achievements gallery.

type LevelCardProps = {
  level: number
  rank: string
  xp: number // progress within the current level
  xpNext: number // XP needed to clear the current level
  pct: number
  onRewards: () => void
}

const LevelCard: FC<LevelCardProps> = ({
  level,
  rank,
  xp,
  xpNext,
  pct,
  onRewards,
}) => (
  <button className='acct-levelcard' onClick={onRewards}>
    <div className='acct-levelcard-top'>
      <span className='acct-lvl-chip'>
        <span className='acct-lvl-chip-num'>Lv {level}</span>
        {rank}
      </span>
      <span className='acct-rewards-cta'>
        Rewards <span aria-hidden>›</span>
      </span>
    </div>
    <div className='acct-xpbar'>
      <div className='acct-xpbar-track'>
        <div className='acct-xpbar-fill' style={{ width: `${pct}%` }} />
      </div>
      <span className='acct-xpbar-label'>
        {xp.toLocaleString()} / {xpNext.toLocaleString()} XP to Level {level + 1}
      </span>
    </div>
  </button>
)

export default LevelCard
