import React, { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineEdit, AiOutlineDelete } from 'react-icons/ai'
import { RecipeDraftType } from 'types'

const formatUpdated = (updatedAt: string) => {
  const ms = Number(updatedAt)
  if (!ms || Number.isNaN(ms)) return null
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type DraftCardProps = {
  draft: RecipeDraftType
  onDelete: (id: string) => Promise<void> | void
}

const DraftCard: FC<DraftCardProps> = ({ draft, onDelete }) => {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const updated = formatUpdated(draft.updatedAt)
  const ingredientCount = draft.ingredients?.length ?? 0
  const instructionCount = draft.instructions?.length ?? 0
  const summaryParts = [
    `${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'}`,
    `${instructionCount} ${instructionCount === 1 ? 'step' : 'steps'}`,
  ]

  const handleResume = () => navigate(`/add-recipe?draftId=${draft._id}`)

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await onDelete(draft._id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className='draft-card'>
      <div className='draft-card-main'>
        <h3 className='title'>
          {draft.title?.trim() ? draft.title : 'Untitled draft'}
        </h3>
        <div className='meta'>
          <span className='summary'>{summaryParts.join(' · ')}</span>
          {updated && <span className='updated'>Last edited {updated}</span>}
        </div>
      </div>
      <div className='draft-card-actions'>
        <button type='button' className='resume-btn' onClick={handleResume}>
          <AiOutlineEdit className='icon' />
          Continue editing
        </button>
        <button
          type='button'
          className='delete-btn'
          onClick={handleDelete}
          disabled={deleting}
          aria-label='Delete draft'
          title='Delete draft'
        >
          <AiOutlineDelete className='icon' />
        </button>
      </div>
    </div>
  )
}

export default DraftCard
