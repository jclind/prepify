import { EditIcon } from 'src/Components/icons'
import React, { FC } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import './Drafts.scss'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import DraftAPI from 'src/api/drafts'
import DraftCard from './DraftCard'
import { useDelayedLoading } from 'src/pages/Account/useDelayedLoading'

const Drafts: FC = () => {
  const queryClient = useQueryClient()

  const { data: drafts, isLoading } = useQuery({
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

  // Hold an empty frame while a fast query settles, so the skeleton only shows
  // for genuinely slow loads — and the empty state never flashes before data.
  if (isLoading && !showSkeleton) {
    return <div className='drafts' />
  }

  return (
    <div className='drafts'>
      {showList ? (
        <div className='drafts-list'>
          {isLoading ? (
            <>
              <Skeleton height={92} borderRadius={12} />
              <Skeleton height={92} borderRadius={12} />
              <Skeleton height={92} borderRadius={12} />
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
