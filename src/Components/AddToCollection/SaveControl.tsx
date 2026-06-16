import React, { FC, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BsBookmark, BsFillBookmarkCheckFill } from 'react-icons/bs'
import { BiBookmark, BiSolidBookmark, BiChevronDown } from 'react-icons/bi'
import AuthAPI from 'src/api/auth'
import CollectionsAPI from 'src/api/collections'
import { useSaveRecipe } from 'src/hooks/useSaveRecipe'
import { invalidateSavedCaches } from 'src/util/invalidateSavedCaches'
import { RecipeCollection } from 'types'
import AddToCollectionPopover from './AddToCollectionPopover'

import './AddToCollection.scss'

const POPOVER_WIDTH = 230 // keep in sync with .add-to-collection-popover width

type Props = {
  recipeId: string
  // 'button' = labeled pill for the recipe-page action row; 'icon' = bookmark
  // chip floated over a card.
  variant?: 'button' | 'icon'
  // Class on the outer wrapper so each surface can position the control.
  className?: string
  // Class on the trigger button, for per-surface chrome.
  triggerClassName?: string
  // Recipe title, for the icon variant's aria-label.
  title?: string
  // Side the popover aligns to under the trigger (default right-aligned).
  align?: 'left' | 'right'
  // Optional extra refresh after a save/membership change (the Saved tab passes
  // this to reset its paged grid). Caches always refetch regardless.
  onMutated?: () => void
}

/**
 * Unified save + collections control (Spotify-style). One tap saves the recipe
 * instantly to the master list; tapping an already-saved recipe opens a
 * checkbox popover to file it into collections (and "All saved" there unsaves).
 *
 * Replaces the old split Save button + folder Collection button. Used on browse
 * cards, the single-recipe action row, and the saved-grid cards.
 *
 * The popover is portaled to <body> and fixed-positioned under the trigger so a
 * card's `overflow: hidden`/hover `transform` can't clip it; outside-click
 * checks BOTH the trigger and the portaled popover.
 */
const SaveControl: FC<Props> = ({
  recipeId,
  variant = 'icon',
  className,
  triggerClassName,
  title = 'this recipe',
  align = 'right',
  onMutated,
}) => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()
  const { isSaved, toggle } = useSaveRecipe(recipeId)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Only fetch collections once the menu is open — browse grids render many of
  // these and shouldn't each fire a request on mount.
  const { data: collections = [] } = useQuery<RecipeCollection[]>({
    queryKey: ['collections'],
    queryFn: CollectionsAPI.list,
    enabled: !!uid && open,
  })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left = align === 'left' ? rect.left : rect.right - POPOVER_WIDTH
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8)),
    })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !popoverRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Filing/saving touches the collection counts+covers cache and the per-card
  // saved-id list (so a bookmark elsewhere flips state too).
  const handleMutated = () => {
    invalidateSavedCaches(queryClient, uid)
    onMutated?.()
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Logged out: toggle() surfaces the "please login" toast and no-ops.
    if (!uid) {
      toggle()
      return
    }
    if (isSaved) {
      setOpen(o => !o)
      return
    }
    // First save: instant + optimistic, with a nudge toward collections.
    toggle()
    toast(
      t => (
        <span className='save-toast'>
          Saved ·{' '}
          <button
            type='button'
            className='save-toast__action'
            onClick={() => {
              toast.dismiss(t.id)
              setOpen(true)
            }}
          >
            Add to a collection
          </button>
        </span>
      ),
      { duration: 5000 }
    )
  }

  // "All saved" master row inside the popover. Unsaving drops all memberships,
  // so there's nothing left to manage — close the menu. Await the save/unsave
  // before refetching collection counts + the saved grid so the refetch can't
  // race ahead of the write and resolve with stale data that never corrects;
  // skip the refetch entirely if the write failed (the hook rolled back).
  const handleToggleSaved = async () => {
    const wasSaved = isSaved
    const ok = await toggle()
    if (!ok) return
    invalidateSavedCaches(queryClient, uid)
    onMutated?.()
    if (wasSaved) setOpen(false)
  }

  const Filled = variant === 'button' ? BsFillBookmarkCheckFill : BiSolidBookmark
  const Outline = variant === 'button' ? BsBookmark : BiBookmark
  const Icon = isSaved ? Filled : Outline

  return (
    <div className={`save-control ${className ?? ''}`.trim()}>
      <button
        ref={triggerRef}
        type='button'
        className={`save-control__trigger ${isSaved ? 'is-saved' : ''} ${
          triggerClassName ?? ''
        }`.trim()}
        aria-haspopup={uid ? 'dialog' : undefined}
        aria-expanded={uid ? open : undefined}
        aria-label={
          variant === 'icon'
            ? isSaved
              ? `${title} saved — edit collections`
              : `Save ${title}`
            : undefined
        }
        onClick={handleClick}
      >
        <Icon className='icon' />
        {variant === 'button' && <span>{isSaved ? 'Saved' : 'Save'}</span>}
        {variant === 'button' && uid && (
          <BiChevronDown className='save-control__caret' />
        )}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={popoverRef}
            className='add-to-collection-portal'
            style={{ top: pos.top, left: pos.left }}
          >
            <AddToCollectionPopover
              recipeId={recipeId}
              collections={collections}
              saved={isSaved}
              onToggleSaved={handleToggleSaved}
              onMutated={handleMutated}
            />
          </div>,
          document.body
        )}
    </div>
  )
}

export default SaveControl
