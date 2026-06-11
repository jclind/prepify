import React, { FC } from 'react'
import Modal from 'react-modal'
import { FiX } from 'react-icons/fi'
import './AchievementsModal.scss'
import { Achievement } from 'types'

type AchievementsModalProps = {
  isOpen: boolean
  onClose: () => void
  achievements: Achievement[]
}

// react-modal positions the overlay; the visual card is styled via the
// .achievements-modal class (see AchievementsModal.scss) so the content frame
// stays transparent.
const customStyles = {
  content: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: 0,
    border: 'none',
    background: 'transparent',
    overflow: 'visible',
  },
  overlay: {
    zIndex: '1000',
    background: 'rgba(0, 0, 0, 0.5)',
  },
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
      style={customStyles}
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
