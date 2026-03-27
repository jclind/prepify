import React, { useContext } from 'react'

// Placeholder context — RecipeAPI is called directly from pages/components.
// This file exists as the designated home for any shared recipe state added in future.

type RecipeContextValueType = Record<string, never>

const RecipeContext = React.createContext<RecipeContextValueType | null>(null)

export function useRecipeContext() {
  return useContext(RecipeContext)
}

type RecipeProviderProps = {
  children: React.ReactNode
}

const RecipeProvider = ({ children }: RecipeProviderProps) => {
  return (
    <RecipeContext.Provider value={{}}>
      {children}
    </RecipeContext.Provider>
  )
}

export default RecipeProvider
