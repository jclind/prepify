import React, { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import RecipeAPI from 'src/api/recipes'
import { useAuth } from 'src/context/AuthContext'
import { RecipeType } from 'types'
import { HomeRecipeCard, HomeRecipeCardSkeleton } from './HomeRecipeCard'

// Personalized "For You" row. "Hide until personalized": only renders for a
// logged-in user, and only once the server returns picks (it returns [] until
// the user has enough saves/makes/ratings to infer taste). The component owns
// its whole <section> — header included — so an empty/anonymous state collapses
// cleanly with no orphaned heading. Silent on error: it's a bonus row, not core.
const HomeForYou: FC = () => {
  const user = useAuth()?.user ?? null

  const { data, isLoading, isError } = useQuery<RecipeType[]>({
    queryKey: ['for-you-recipes', user?.uid],
    // Match the Trending row's count (4) so the desktop grid stays even.
    queryFn: () => RecipeAPI.getForYouRecipes(4),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Logged out → the row doesn't exist.
  if (!user) return null

  if (isLoading) {
    return (
      <section className='home-section'>
        <div className='home-section-header'>
          <h2>For you</h2>
          <p>Picked from recipes you’ve saved and cooked</p>
        </div>
        <div className='home-trending-grid'>
          {Array.from({ length: 4 }).map((_, i) => <HomeRecipeCardSkeleton key={i} />)}
        </div>
      </section>
    )
  }

  const recipes = data ?? []
  // Not enough signal, or a failed fetch → hide the whole row.
  if (isError || recipes.length === 0) return null

  return (
    <section className='home-section'>
      <div className='home-section-header'>
        <h2>For you</h2>
        <p>Picked from recipes you’ve saved and cooked</p>
      </div>
      <div className='home-trending-grid'>
        {recipes.map(r => <HomeRecipeCard recipe={r} key={r._id} />)}
      </div>
    </section>
  )
}

export default HomeForYou
