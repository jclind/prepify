import { AlertCircleIcon, EditIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import 'react-loading-skeleton/dist/skeleton.css'

import './Drafts.scss'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import DraftAPI from 'src/api/drafts'
import DraftCard from './DraftCard'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'

const Drafts: FC = () => {
  const queryClient = useQueryClient()

  const { data: drafts, isLoading, isError, refetch } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => DraftAPI.listDrafts(),
  })

  const handleDelete = async (id: string) => {
    await DraftAPI.deleteDraft(id)
    queryClient.invalidateQueries({ queryKey: ['drafts'] })
  }

  const showSkeleton = useDelayedLoading(isLoading)
  const hasDrafts = !!drafts && drafts.length > 0
  const showList = hasDrafts || isLoading

  return (
    <div className='drafts'>
      {showList ? (
        // Render the skeleton cards whenever loading so the grid reserves its
        // height from frame 1; the flash-guard delay only hides them (sk-hold)
        // until it's worth drawing — no blank-then-grow jump.
        <div
          className={`drafts-list ${
            isLoading && !showSkeleton ? 'sk-hold' : ''
          }`}
        >
          {isLoading ? (
            <>
              <DraftCard loading />
              <DraftCard loading />
              <DraftCard loading />
            </>
          ) : (
            drafts!.map(draft => (
              <DraftCard
                key={draft._id}
                draft={draft}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      ) : isError ? (
        // Error is not empty: a failed fetch must never read as "no drafts" to a
        // user who has them. See docs/design/loading-states.md.
        <EmptyState
          icon={<AlertCircleIcon />}
          title='Couldn’t load your drafts'
          description='Something went wrong. Please try again.'
          action={{ label: 'Try again', onClick: () => refetch() }}
        />
      ) : (
        <EmptyState
          icon={<EditIcon />}
          title='No Drafts Yet'
          description='Recipes you start are saved here automatically until you publish them.'
          action={{ label: 'Start a Recipe', to: '/add-recipe' }}
        />
      )}
    </div>
  )
}

export default Drafts
