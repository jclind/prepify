/**
 * UserRecipeThumbnail's created-date formatting used to be a local hand-rolled
 * `toLocaleDateString` call; it now delegates valid-date formatting to the
 * shared `src/util/formatDate` util (short form) while keeping a local
 * null/NaN guard so a missing/garbage `createdAt` hides the date instead of
 * rendering the shared util's un-guarded epoch-zero fallback.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UserRecipeThumbnail from 'src/pages/Account/UserRecipes/UserRecipeThumbnail'
import { CreatedRecipeCardType } from 'types'

const baseRecipe: CreatedRecipeCardType = {
  _id: 'recipe-1',
  title: 'Test Recipe',
  recipeImage: '',
  totalTime: 20,
  servingPrice: null,
  rating: { rateValue: 0, rateCount: 0 },
  createdAt: '',
  views: 0,
  numTimesSaved: 0,
  numTimesMade: 0,
}

describe('UserRecipeThumbnail created-date formatting', () => {
  it('renders the pinned "Mon D, YYYY" short-form date for a valid epoch-ms createdAt', () => {
    // 2026-07-11T14:30:00 local -> shared formatDate(short=true) contract.
    const ms = new Date(2026, 6, 11, 14, 30, 0).getTime()
    const recipe = { ...baseRecipe, createdAt: String(ms) }

    render(
      <MemoryRouter>
        <UserRecipeThumbnail recipe={recipe} />
      </MemoryRouter>
    )

    expect(screen.getByText('Jul 11, 2026')).toBeInTheDocument()
  })

  it('hides the date (null guard preserved) for a garbage/zero createdAt', () => {
    for (const createdAt of ['0', '', 'not-a-date']) {
      const recipe = { ...baseRecipe, createdAt }
      const { unmount, container } = render(
        <MemoryRouter>
          <UserRecipeThumbnail recipe={recipe} />
        </MemoryRouter>
      )

      expect(container.querySelector('.date')).toBeNull()
      unmount()
    }
  })
})
