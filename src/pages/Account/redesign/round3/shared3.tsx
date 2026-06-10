import React, { FC } from 'react'
import { mockAchievements, mockProfile } from '../mockData'
import './shared3.scss'

// Round 3 — quiet gamification. Small, tasteful level/XP treatments that add a
// sense of progress + achievements without grabbing visual attention. All five
// round-3 variants share the R1 "Soft Segmented" base (soft identity → segmented
// → search → V19 cards) and only differ in how the level/XP element is shown.

const lvl = mockProfile.level

// Avatar wrapped in a thin XP progress ring with a small level chip. The ring
// doubles as both the decorative avatar frame AND the progress indicator, so it
// adds meaning without adding a separate block.
export const XpRingAvatar: FC<{ size?: number }> = ({ size = 88 }) => (
  <div
    className='xp-ring'
    style={{ ['--pct' as string]: lvl.pct, ['--avatar' as string]: `${size}px` }}
    title={`Level ${lvl.level} · ${lvl.rank} — ${lvl.xp}/${lvl.xpNext} XP`}
  >
    <div className='xp-ring-inner'>
      <img src={mockProfile.avatar} alt='' />
    </div>
    <span className='xp-ring-badge'>Lv {lvl.level}</span>
  </div>
)

// A subtle one-line level chip: "Lv 7 · Seasoned Cook".
export const LevelChip: FC = () => (
  <span className='lvl-chip'>
    <span className='lvl-chip-num'>Lv {lvl.level}</span>
    {lvl.rank}
  </span>
)

// Slim XP bar with a quiet label. Thin enough to read as a divider.
export const XpBar: FC = () => (
  <div className='xp-bar'>
    <div className='xp-bar-track'><div className='xp-bar-fill' style={{ width: `${lvl.pct}%` }} /></div>
    <span className='xp-bar-label'>{lvl.xp.toLocaleString()} / {lvl.xpNext.toLocaleString()} XP to Level {lvl.level + 1}</span>
  </div>
)

// A compact inline row of earned badge glyphs (no labels) + a "+N" overflow.
export const BadgesInline: FC<{ max?: number }> = ({ max = 4 }) => {
  const earned = mockAchievements.filter(a => a.earned)
  const shown = earned.slice(0, max)
  const more = earned.length + 1 // +1 for the in-progress one teased as locked
  return (
    <span className='badges-inline'>
      {shown.map(a => (
        <span key={a.id} className='badge-dot' title={`${a.name} — ${a.desc}`}>{a.icon}</span>
      ))}
      <span className='badge-more'>+{more - shown.length}</span>
    </span>
  )
}

// "Next: 🔥 7-day streak · 71%" — teases the next achievement, very quiet.
export const NextHint: FC = () => {
  const next = mockAchievements.find(a => !a.earned && a.progress != null)
  if (!next) return null
  return (
    <span className='next-hint' title={`${next.name} — ${next.desc}`}>
      <span className='next-hint-ico'>{next.icon}</span>
      Next: {next.name}
      <span className='next-hint-track'><span style={{ width: `${next.progress}%` }} /></span>
      <span className='next-hint-pct'>{next.progress}%</span>
    </span>
  )
}
