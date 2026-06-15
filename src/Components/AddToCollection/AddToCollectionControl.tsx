import React, {
  FC,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiFolderPlus } from 'react-icons/fi'
import AuthAPI from 'src/api/auth'
import CollectionsAPI from 'src/api/collections'
import { RecipeCollection } from 'types'
import AddToCollectionPopover from './AddToCollectionPopover'

import './AddToCollection.scss'

const POPOVER_WIDTH = 230 // keep in sync with .add-to-collection-popover width

type Props = {
  recipeId: string
  // Extra class on the outer wrapper so each surface can position the control
  // (e.g. absolutely over a card) without the control knowing where it sits.
  className?: string
  // Class on the trigger button, for per-surface styling.
  triggerClassName?: string
  // Trigger contents; defaults to a folder icon. Pass a label for the
  // recipe-page action row.
  label?: ReactNode
  triggerAriaLabel?: string
  // Side the popover aligns to under the trigger (default right-aligned).
  align?: 'left' | 'right'
  // Optional extra refresh after a membership/collection change (the Saved tab
  // passes this to reset its paged grid). Counts always refetch regardless.
  onMutated?: () => void
}

/**
 * Self-contained "add this recipe to a collection" affordance: a trigger button
 * that opens a checkbox popover. Used over browse cards, the saved-grid cards,
 * and the single-recipe action row. Logged-out users see nothing.
 *
 * The popover is rendered in a portal, fixed-positioned under the trigger, so it
 * can never be clipped by a card's `overflow: hidden` (or a hover `transform`).
 * Close-on-outside-click checks BOTH the trigger and the portaled popover, and
 * the trigger lives inside that region so clicking it can toggle the menu shut
 * — an earlier version closed on outside-click then immediately reopened on the
 * trigger's own click, so it could never be dismissed by its own button.
 */
const AddToCollectionControl: FC<Props> = ({
  recipeId,
  className,
  triggerClassName,
  label,
  triggerAriaLabel = 'Add to collection',
  align = 'right',
  onMutated,
}) => {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Only fetch the collection list once the menu is opened — browse grids render
  // many of these and shouldn't each fire a request on mount. Shares the
  // ['collections'] cache with the Saved tab, so it's usually already warm.
  const { data: collections = [] } = useQuery<RecipeCollection[]>({
    queryKey: ['collections'],
    queryFn: CollectionsAPI.list,
    enabled: !!uid && open,
  })

  // Anchor the portaled popover to the trigger, clamped into the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const left =
      align === 'left' ? rect.left : rect.right - POPOVER_WIDTH
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8)),
    })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        !triggerRef.current?.contains(t) &&
        !popoverRef.current?.contains(t)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // Page scroll/resize would drift the fixed popover off the trigger; close
    // rather than chase it. (Inner option-list scroll doesn't reach window.)
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

  // Filing a recipe touches three caches: collection counts+covers, and the
  // per-card saved-id list (so a bookmark elsewhere flips to "saved" after an
  // auto-save). Callers paging a saved grid pass onMutated for the extra reset.
  const handleMutated = () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
    queryClient.invalidateQueries({ queryKey: ['savedRecipeIds', uid] })
    onMutated?.()
  }

  // Logged-out users can't have collections; render nothing so cards stay clean.
  if (!uid) return null

  return (
    <div className={`add-to-collection ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type='button'
        className={`add-to-collection__trigger ${triggerClassName ?? ''}`}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-label={triggerAriaLabel}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(o => !o)
        }}
      >
        {label ?? <FiFolderPlus />}
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
              onMutated={handleMutated}
            />
          </div>,
          document.body
        )}
    </div>
  )
}

export default AddToCollectionControl
