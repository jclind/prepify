import React, { FC } from 'react'
import Modal from 'react-modal'
import { FiX } from 'react-icons/fi'
import './AchievementsModal.scss'
import { Achievement } from 'types'
import { bareModalStyles } from 'src/util/modalStyles'

type AchievementsModalProps = {
  isOpen: boolean
  onClose: () => void
  achievements: Achievement[]
}

const AchievementsModal: FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  const earnedCount = achievements.filter(a => a.earned).length

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={bareModalStyles}
      className='achievements-modal'
      contentLabel='Achievements'
    >
      <div className='am-card'>
        <div className='am-head'>
          <h2 className='am-title'>Achievements</h2>
          <span className='am-progress'>
            {earnedCount} / {achievements.length}
          </span>
          <button className='am-close' onClick={onClose} aria-label='Close'>
            <FiX />
          </button>
        </div>
        <ul className='am-list'>
          {achievements.map(a => (
            <li
              key={a.id}
              className={`am-item ${a.earned ? 'earned' : 'locked'}`}
            >
              <span className='am-icon' aria-hidden>
                {a.earned ? '🏅' : '🔒'}
              </span>
              <div className='am-text'>
                <span className='am-name'>{a.name}</span>
                <span className='am-desc'>{a.description}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

export default AchievementsModal
