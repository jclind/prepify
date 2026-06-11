import React, { FC } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RecipeType } from 'types'
import { useAuth } from 'src/context/AuthContext'
import AdminAPI from 'src/api/admin'
import ReportAPI from 'src/api/reports'
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

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['recipe', recipe._id] })

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

  if (!isAdmin) return null

  const isHidden = recipe.status === 'hidden'
  const isUnpublished = recipe.status === 'unpublished'
  const isFeatured = recipe.featured === true
  const busy =
    featureMutation.isPending ||
    publishMutation.isPending ||
    takedownMutation.isPending

  return (
    <div className='admin-recipe-controls' role='group' aria-label='Admin recipe controls'>
      <span className='arc-label'>Admin</span>

      {isHidden && <span className='arc-pill hidden'>Hidden</span>}
      {isUnpublished && <span className='arc-pill unpublished'>Unpublished</span>}
      {isFeatured && <span className='arc-pill featured'>Featured</span>}

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
        // `status` is a single field shared with the moderation takedown, so
        // unpublishing a taken-down recipe would silently clear the `hidden`
        // state (and its moderation stamp). Force the admin to Restore first.
        disabled={busy || isHidden}
        title={isHidden ? 'Restore this recipe before changing its publish state' : undefined}
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
