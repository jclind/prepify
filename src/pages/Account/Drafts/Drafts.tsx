import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import './Drafts.scss'
import DraftAPI from 'src/api/drafts'
import DraftCard from './DraftCard'

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

  const hasDrafts = !!drafts && drafts.length > 0
  const showList = hasDrafts || isLoading

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
        <div className='no-data-saved'>
          <h2>No Drafts Yet</h2>
          <p>
            Recipes you start are saved here automatically until you publish
            them.
          </p>
          <Link to='/add-recipe' className='btn add-recipe-btn'>
            Start a Recipe
          </Link>
        </div>
      )}
    </div>
  )
}

export default Drafts
