import React, { FC } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RecipeType } from 'types'
import { useAuth } from 'src/context/AuthContext'
import AdminAPI from 'src/api/admin'
import ReportAPI from 'src/api/reports'
import { formatClassifier } from 'src/util/formatClassifier'
import './AdminRecipeControls.scss'

interface AdminRecipeControlsProps {
  recipe: RecipeType
}

// Admin-only action strip on the recipe page. Self-gating like ReportControl:
// renders nothing for non-admins. Consolidates recipe-level moderation/curation
// (feature, publish, takedown) where admins actually browse, so there's no need
// for a separate admin recipe-search screen. Reads the recipe's current state to
// label each toggle, and invalidates the recipe query so the page reflects the
// change immediately.
const AdminRecipeControls: FC<AdminRecipeControlsProps> = ({ recipe }) => {
  const authRes = useAuth()
  const isAdmin = authRes?.isAdmin === true
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recipe', recipe._id] })
    // The automod note keys off the OPEN report; approving dismisses it, so drop
    // the stale classifier snapshot too.
    queryClient.invalidateQueries({ queryKey: ['recipe-automod', recipe._id] })
  }

  const isPendingReview = recipe.status === 'pending_review'

  // For an auto-held recipe, fetch WHY (the open automod report's classifier) so
  // the admin sees the reason inline. Only runs for an admin viewing a held
  // recipe — never on the public path.
  const { data: automod } = useQuery({
    queryKey: ['recipe-automod', recipe._id],
    queryFn: () => AdminAPI.getRecipeAutomod(recipe._id),
    enabled: isAdmin && isPendingReview,
  })

  const featureMutation = useMutation({
    mutationFn: (featured: boolean) =>
      AdminAPI.setRecipeFeatured(recipe._id, featured),
    onSuccess: (_d, featured) => {
      toast.success(featured ? 'Recipe featured.' : 'Recipe unfeatured.')
      invalidate()
    },
    onError: () => toast.error('Could not update featured state.'),
  })

  const publishMutation = useMutation({
    mutationFn: (published: boolean) =>
      AdminAPI.setRecipePublished(recipe._id, published),
    onSuccess: (_d, published) => {
      toast.success(published ? 'Recipe published.' : 'Recipe unpublished.')
      invalidate()
    },
    onError: () => toast.error('Could not update publish state.'),
  })

  const takedownMutation = useMutation({
    mutationFn: (hide: boolean) =>
      ReportAPI.setRecipeModeration(recipe._id, hide ? 'hidden' : 'active'),
    onSuccess: (_d, hide) => {
      toast.success(hide ? 'Recipe taken down.' : 'Recipe restored.')
      invalidate()
    },
    onError: () => toast.error('Could not update moderation state.'),
  })

  // Clear an automated hold: publish the recipe and dismiss its automod report in
  // one call. Only meaningful (and only shown) while the recipe is pending_review.
  const approveMutation = useMutation({
    mutationFn: () => AdminAPI.approveRecipe(recipe._id),
    onSuccess: () => {
      toast.success('Recipe approved and published.')
      invalidate()
    },
    onError: () => toast.error('Could not approve the recipe.'),
  })

  if (!isAdmin) return null

  const isHidden = recipe.status === 'hidden'
  const isUnpublished = recipe.status === 'unpublished'
  const isFeatured = recipe.featured === true
  const busy =
    featureMutation.isPending ||
    publishMutation.isPending ||
    takedownMutation.isPending ||
    approveMutation.isPending

  return (
    <div className='admin-recipe-controls' role='group' aria-label='Admin recipe controls'>
      <span className='arc-label'>Admin</span>

      {isHidden && <span className='arc-pill hidden'>Hidden</span>}
      {isUnpublished && <span className='arc-pill unpublished'>Unpublished</span>}
      {isPendingReview && <span className='arc-pill pending'>Pending review</span>}
      {isFeatured && <span className='arc-pill featured'>Featured</span>}

      {isPendingReview && (
        <p className='arc-automod-note'>
          Auto-held for moderation review
          {automod?.classifier ? ` — ${formatClassifier(automod.classifier)}` : ''}.
        </p>
      )}

      {isPendingReview && (
        <button
          type='button'
          className='arc-btn approve'
          disabled={busy}
          onClick={() => approveMutation.mutate()}
        >
          Approve &amp; publish
        </button>
      )}

      <button
        type='button'
        className='arc-btn feature'
        disabled={busy}
        onClick={() => featureMutation.mutate(!isFeatured)}
      >
        {isFeatured ? 'Unfeature' : 'Feature'}
      </button>

      <button
        type='button'
        className='arc-btn publish'
        // `status` is a single field shared with the moderation/hold states, so
        // unpublishing a taken-down OR auto-held recipe would silently clear that
        // state (and orphan its open automod report). Force the admin to resolve
        // the hold (Approve/Take down) or Restore first.
        disabled={busy || isHidden || isPendingReview}
        title={
          isHidden
            ? 'Restore this recipe before changing its publish state'
            : isPendingReview
            ? 'Approve or take down this held recipe before changing its publish state'
            : undefined
        }
        onClick={() => publishMutation.mutate(isUnpublished)}
      >
        {isUnpublished ? 'Publish' : 'Unpublish'}
      </button>

      <button
        type='button'
        className='arc-btn takedown'
        // Mirror of the guard above: taking down an unpublished recipe would
        // clobber the `unpublished` state. Force a Publish back to active first.
        disabled={busy || isUnpublished}
        title={isUnpublished ? 'Publish this recipe before taking it down' : undefined}
        onClick={() => takedownMutation.mutate(!isHidden)}
      >
        {isHidden ? 'Restore' : 'Take down'}
      </button>
    </div>
  )
}

export default AdminRecipeControls
