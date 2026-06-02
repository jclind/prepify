import React from 'react'
import { render, screen } from '@testing-library/react'
import RecipeStats from 'src/pages/SingleRecipe/DataSections/RecipeStats/RecipeStats'
import { RecipeType } from 'types'

const baseRecipe = {
  _id: 'recipe-1',
  title: 'Chicken Tacos',
  views: 1234,
  numTimesSaved: 1,
  numTimesMade: 5,
  rating: { rateValue: 4.2, rateCount: 8 },
} as unknown as RecipeType

describe('RecipeStats', () => {
  it('renders nothing while loading', () => {
    const { container } = render(
      <RecipeStats currRecipe={baseRecipe} loading={true} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when there is no recipe', () => {
    const { container } = render(
      <RecipeStats currRecipe={null} loading={false} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('displays formatted views, saves, made and rating', () => {
    render(<RecipeStats currRecipe={baseRecipe} loading={false} />)

    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('views')).toBeInTheDocument()
    // numTimesSaved of 1 should be singular
    expect(screen.getByText('save')).toBeInTheDocument()
    expect(screen.getByText('made')).toBeInTheDocument()
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText(/\(8\)/)).toBeInTheDocument()
  })

  it('pluralizes saves when there is more than one', () => {
    const manySaves = { ...baseRecipe, numTimesSaved: 3 } as unknown as RecipeType
    render(<RecipeStats currRecipe={manySaves} loading={false} />)
    expect(screen.getByText('saves')).toBeInTheDocument()
  })

  it('shows "no ratings" with an em dash when there are no ratings', () => {
    const noRatings = {
      ...baseRecipe,
      rating: { rateValue: 0, rateCount: 0 },
    } as unknown as RecipeType
    render(<RecipeStats currRecipe={noRatings} loading={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('no ratings')).toBeInTheDocument()
  })

  it('defaults missing counts to zero', () => {
    const sparse = { _id: 'r2', title: 'x' } as unknown as RecipeType
    render(<RecipeStats currRecipe={sparse} loading={false} />)
    // views, saves, made all default to 0
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3)
  })
})
