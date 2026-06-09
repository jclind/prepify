import { mockRecipes, MockRecipe } from '../HomeVariants/mockData'

export type ActivityEvent = {
  id: string
  kind: 'saved' | 'rated' | 'made' | 'created'
  when: string
  recipe: MockRecipe
  rating?: number
  note?: string
}

export type Collection = {
  id: string
  name: string
  description: string
  count: number
  cover: string[]
  color: string
}

export const mockUser = {
  username: 'kchen',
  displayName: 'Kasey Chen',
  bio: 'Home cook in Brooklyn. Pasta enthusiast, budget chef, occasional baker. Cooking my way through a 30-min-dinner challenge.',
  avatar:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&h=240&q=70',
  cover:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1600&q=70',
  joined: '2023-09-04',
  location: 'Brooklyn, NY',
  stats: {
    saved: 84,
    ratings: 32,
    recipes: 12,
    made: 47,
    streak: 18,
    moneySaved: 1240,
    timeSaved: 28, // hours
  },
}

export { mockRecipes }
export type { MockRecipe }

export const userRecipes = mockRecipes.slice(0, 4)
export const savedRecipes = mockRecipes.slice(2, 10)
export const ratedRecipes = mockRecipes.slice(4, 9)

export const activity: ActivityEvent[] = [
  { id: 'e1', kind: 'made', when: '2 hours ago', recipe: mockRecipes[1], note: 'Doubled the garlic, family loved it.' },
  { id: 'e2', kind: 'saved', when: 'yesterday', recipe: mockRecipes[3] },
  { id: 'e3', kind: 'rated', when: '2 days ago', recipe: mockRecipes[0], rating: 5, note: 'Best salmon recipe I have tried.' },
  { id: 'e4', kind: 'made', when: '3 days ago', recipe: mockRecipes[5] },
  { id: 'e5', kind: 'created', when: '5 days ago', recipe: mockRecipes[6] },
  { id: 'e6', kind: 'saved', when: '1 week ago', recipe: mockRecipes[7] },
  { id: 'e7', kind: 'rated', when: '1 week ago', recipe: mockRecipes[2], rating: 4 },
  { id: 'e8', kind: 'made', when: '2 weeks ago', recipe: mockRecipes[4] },
]

export const collections: Collection[] = [
  {
    id: 'c1',
    name: 'Weeknight Dinners',
    description: 'Under 30 minutes, no leftover fights',
    count: 24,
    cover: [mockRecipes[1].image, mockRecipes[2].image, mockRecipes[3].image, mockRecipes[7].image],
    color: '#ff5722',
  },
  {
    id: 'c2',
    name: 'Date Night',
    description: 'Worth the extra effort',
    count: 11,
    cover: [mockRecipes[0].image, mockRecipes[11].image, mockRecipes[9].image, mockRecipes[1].image],
    color: '#c44536',
  },
  {
    id: 'c3',
    name: 'Lazy Mornings',
    description: 'Slow weekend breakfasts',
    count: 9,
    cover: [mockRecipes[5].image, mockRecipes[4].image, mockRecipes[8].image, mockRecipes[5].image],
    color: '#e07a3f',
  },
  {
    id: 'c4',
    name: 'Budget Stretchers',
    description: 'Under $3 a serving',
    count: 18,
    cover: [mockRecipes[6].image, mockRecipes[5].image, mockRecipes[3].image, mockRecipes[4].image],
    color: '#28a745',
  },
  {
    id: 'c5',
    name: 'When My Mom Visits',
    description: 'Recipes she actually likes',
    count: 7,
    cover: [mockRecipes[9].image, mockRecipes[1].image, mockRecipes[0].image, mockRecipes[2].image],
    color: '#8b5a3c',
  },
  {
    id: 'c6',
    name: 'Office Lunches',
    description: 'Travels well, reheats well',
    count: 14,
    cover: [mockRecipes[6].image, mockRecipes[10].image, mockRecipes[3].image, mockRecipes[7].image],
    color: '#00adb5',
  },
]

// Streak heatmap (last 30 days, 1 = cooked, 0 = skipped, 0.5 = partial)
export const streakDays: number[] = [
  1, 0, 1, 1, 0, 0.5, 1,
  1, 1, 0, 1, 1, 0, 0,
  0.5, 1, 1, 1, 0, 1, 1,
  1, 0, 1, 1, 0.5, 1, 1, 1, 1,
]

// Most-cooked cuisines (% of total)
export const cuisineBreakdown = [
  { name: 'Italian', pct: 32, color: '#c44536' },
  { name: 'American', pct: 21, color: '#2c5f9e' },
  { name: 'Asian', pct: 18, color: '#8b4a8c' },
  { name: 'Mediterranean', pct: 14, color: '#00adb5' },
  { name: 'Mexican', pct: 9, color: '#e07a3f' },
  { name: 'Other', pct: 6, color: '#979ba0' },
]
