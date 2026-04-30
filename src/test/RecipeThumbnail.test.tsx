import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const recipe = {
  _id: 'r1',
  title: 'Test Recipe',
  recipeImage: 'https://example.com/img.jpg',
  servingPrice: 350,
  servings: 4,
  totalTime: 30,
  rating: { rateValue: 45, rateCount: 10 },
  prepTime: 15,
  cookTime: 15,
  fridgeLife: 5,
  freezerLife: 30,
  description: 'A test recipe',
  ingredients: [],
  instructions: [],
  nutritionData: null,
  authorUsername: 'user',
  createdAt: '2024-01-01',
  editedAt: null,
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  nutritionLabels: null,
  views: 0,
  numTimesSaved: 0,
  numTimesMade: 0,
}

describe('RecipeThumbnail', () => {
  beforeEach(() => mockNavigate.mockClear())

  it('shows no <img> for image when loading=true', () => {
    render(<RecipeThumbnail recipe={null} loading={true} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('shows no price or time text when loading=true', () => {
    render(<RecipeThumbnail recipe={null} loading={true} />)
    expect(screen.queryByText(/Serving:/)).toBeNull()
    expect(screen.queryByText(/\d+ min/)).toBeNull()
  })

  it('renders image, title, price, time, and rating when recipe data is present', () => {
    render(<RecipeThumbnail recipe={recipe} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', recipe.recipeImage)
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText(/Serving: \$3\.50/)).toBeInTheDocument()
    expect(screen.getByText(/30 mins/)).toBeInTheDocument()
    expect(screen.getByText(/4\.5/)).toBeInTheDocument()
  })

  it('shows image skeleton (no <img>) when recipe has no recipeImage', () => {
    render(<RecipeThumbnail recipe={{ ...recipe, recipeImage: '' }} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('displays "0" (not NaN) for rating when rateCount is 0', () => {
    render(<RecipeThumbnail recipe={{ ...recipe, rating: { rateValue: 0, rateCount: 0 } }} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows "1 min" (singular) when totalTime is exactly 1', () => {
    render(<RecipeThumbnail recipe={{ ...recipe, totalTime: 1 }} />)
    expect(screen.getByText('1 min')).toBeInTheDocument()
  })

  it('shows "X mins" (plural) when totalTime is greater than 1', () => {
    render(<RecipeThumbnail recipe={recipe} />)
    expect(screen.getByText('30 mins')).toBeInTheDocument()
  })

  it('clicking the card navigates to /recipes/:id', async () => {
    const user = userEvent.setup()
    render(<RecipeThumbnail recipe={recipe} />)
    await user.click(screen.getByRole('button'))
    expect(mockNavigate).toHaveBeenCalledWith('/recipes/r1')
  })

  it('does not navigate when loading=true', async () => {
    const user = userEvent.setup()
    render(<RecipeThumbnail recipe={null} loading={true} />)
    await user.click(screen.getByRole('button'))
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
