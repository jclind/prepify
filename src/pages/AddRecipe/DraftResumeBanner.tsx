import React, { FC, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AiOutlineClose } from 'react-icons/ai'
import DraftAPI from 'src/api/drafts'
import './DraftResumeBanner.scss'

// Shown at the top of the create-recipe page when the user already has saved
// drafts and isn't currently editing one. Offers a one-click resume of the most
// recent draft plus a link to the full Drafts list. Hidden in edit mode and
// once the current session has an active draft (see AddRecipe).
const DraftResumeBanner: FC = () => {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const { data: drafts } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => DraftAPI.listDrafts(),
  })

  if (dismissed || !drafts || drafts.length === 0) return null

  // listDrafts returns newest-updated first.
  const mostRecent = drafts[0]
  const title = mostRecent.title?.trim() ? mostRecent.title : 'Untitled draft'

  return (
    <div className='draft-resume-banner'>
      <div className='banner-text'>
        <span className='banner-title'>
          {drafts.length === 1
            ? 'You have a saved draft'
            : `You have ${drafts.length} saved drafts`}
        </span>
        <span className='banner-sub'>
          Pick up where you left off on “{title}”.
        </span>
      </div>
      <div className='banner-actions'>
        <button
          type='button'
          className='resume-btn'
          onClick={() => navigate(`/add-recipe?draftId=${mostRecent._id}`)}
        >
          Resume
        </button>
        <Link to='/account/drafts' className='view-all'>
          View all drafts
        </Link>
        <button
          type='button'
          className='dismiss-btn'
          aria-label='Dismiss'
          onClick={() => setDismissed(true)}
        >
          <AiOutlineClose />
        </button>
      </div>
    </div>
  )
}

export default DraftResumeBanner
