import { ClockIcon, EditIcon, FileTextIcon, TrashIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const isUntitled = !draft.title?.trim()
  const ingredientCount = draft.ingredients?.length ?? 0
  const instructionCount = draft.instructions?.length ?? 0
  const summary = `${ingredientCount} ${
    ingredientCount === 1 ? 'ingredient' : 'ingredients'
  } · ${instructionCount} ${instructionCount === 1 ? 'step' : 'steps'}`

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
    <article className='draft-card'>
      <div className='head'>
        <div className='glyph'>
          <FileTextIcon />
        </div>
        <h3 className={`title${isUntitled ? ' untitled' : ''}`}>
          {isUntitled ? 'Untitled draft' : draft.title}
        </h3>
      </div>
      <div className='meta'>
        <span className='summary'>{summary}</span>
        {updated && (
          <span className='edited'>
            <ClockIcon /> Last edited {updated}
          </span>
        )}
      </div>
      <div className='actions'>
        <button type='button' className='btn resume' onClick={handleResume}>
          <EditIcon /> Continue editing
        </button>
        <button
          type='button'
          className='btn del'
          onClick={handleDelete}
          disabled={deleting}
          aria-label='Delete draft'
          title='Delete draft'
        >
          <TrashIcon /> Delete
        </button>
      </div>
    </article>
  )
}

export default DraftCard
