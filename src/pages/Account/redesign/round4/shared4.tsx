import React, { FC } from 'react'
import toast from 'react-hot-toast'
import { FiEdit3, FiSettings, FiShare2, FiMoreHorizontal } from 'react-icons/fi'
import { BsTrophy } from 'react-icons/bs'
import { LevelChip, XpBar } from '../round3/shared3'
import './shared4.scss'

// Round 4 — refines T2 (Level + XP bar). Adds an action cluster (subtle Edit +
// Settings + Share) and pairs the XP bar with a Rewards affordance. The five
// variants differ only in how those buttons are arranged/styled.

// Share actually does something so the interaction reads as real in preview.
export const onShare = () => toast.success('Profile link copied to clipboard')
export const onSettings = () => toast('Opening account settings…')
export const onRewards = () => toast('Rewards & badges')

export const EditButton: FC<{ onClick: () => void; iconOnly?: boolean }> = ({ onClick, iconOnly }) => (
  <button
    className={`r4-btn r4-edit ${iconOnly ? 'r4-iconbtn' : ''}`}
    onClick={onClick}
    aria-label='Edit profile'
    title='Edit profile'
  >
    <FiEdit3 />{!iconOnly && <span>Edit profile</span>}
  </button>
)

export const SettingsButton: FC = () => (
  <button className='r4-btn r4-iconbtn' onClick={onSettings} aria-label='Account settings' title='Settings'>
    <FiSettings />
  </button>
)

export const ShareButton: FC<{ label?: boolean }> = ({ label }) => (
  <button
    className={`r4-btn ${label ? 'r4-share-labeled' : 'r4-iconbtn'}`}
    onClick={onShare}
    aria-label='Share profile'
    title='Share'
  >
    <FiShare2 />{label && <span>Share</span>}
  </button>
)

export const MoreButton: FC = () => (
  <button className='r4-btn r4-iconbtn' onClick={() => toast('More options')} aria-label='More options' title='More'>
    <FiMoreHorizontal />
  </button>
)

// Q4's tappable level/XP/rewards card, extracted so round-5 layouts can reuse it.
export const XpCard: FC<{ className?: string }> = ({ className }) => (
  <button className={`r4-xpcard ${className || ''}`} onClick={onRewards}>
    <LevelChip />
    <XpBar />
    <span className='r4-xpcard-cta'>Rewards <span aria-hidden>›</span></span>
  </button>
)

// "Rewards" affordance paired with the XP bar — pill, link, or icon flavours.
export const RewardsButton: FC<{ flavour?: 'pill' | 'link' | 'icon' }> = ({ flavour = 'pill' }) => {
  if (flavour === 'icon') {
    return (
      <button className='r4-rewards-icon' onClick={onRewards} aria-label='View rewards' title='Rewards'>
        <BsTrophy />
      </button>
    )
  }
  if (flavour === 'link') {
    return (
      <button className='r4-rewards-link' onClick={onRewards}>
        View rewards <span aria-hidden>›</span>
      </button>
    )
  }
  return (
    <button className='r4-rewards-pill' onClick={onRewards}>
      <BsTrophy /> Rewards
    </button>
  )
}
