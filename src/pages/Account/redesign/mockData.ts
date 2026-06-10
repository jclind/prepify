// Shared mock data for the account-page redesign playground.
//
// The redesign variants are design explorations: they render fully populated
// regardless of auth/network so we can compare look-and-feel side by side.
// Real data wiring happens after a design is chosen. Anything here that does
// not yet have a backend (bio, member-since, streaks, collections, badges) is
// intentionally invented so the visual concept reads at full fidelity.

export type MockRecipe = {
  id: string
  title: string
  image: string
  totalTime: number
  rating: number
  ratingCount: number
  servingPrice: number // cents per serving
  servings: number
  cuisine: string
  mealTypes: string[]
  dietLabels: string[]
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`

export const mockRecipes: MockRecipe[] = [
  {
    id: 'r1',
    title: 'Charred lemon garlic salmon bowls',
    image: img('1546069901-ba9599a7e63c'),
    totalTime: 25,
    rating: 4.8,
    ratingCount: 124,
    servingPrice: 312,
    servings: 4,
    cuisine: 'American',
    mealTypes: ['Dinner'],
    dietLabels: ['High-Protein', 'Gluten-Free'],
  },
  {
    id: 'r2',
    title: 'Weeknight margherita skillet pizza',
    image: img('1565299624946-b28f40a0ae38'),
    totalTime: 35,
    rating: 4.6,
    ratingCount: 88,
    servingPrice: 198,
    servings: 2,
    cuisine: 'Italian',
    mealTypes: ['Dinner'],
    dietLabels: ['Vegetarian'],
  },
  {
    id: 'r3',
    title: 'Fluffy buttermilk pancakes',
    image: img('1567620905732-2d1ec7ab7445'),
    totalTime: 20,
    rating: 4.9,
    ratingCount: 203,
    servingPrice: 84,
    servings: 4,
    cuisine: 'American',
    mealTypes: ['Breakfast'],
    dietLabels: ['Vegetarian'],
  },
  {
    id: 'r4',
    title: 'Crunchy rainbow crunch salad',
    image: img('1512621776951-a57141f2eefd'),
    totalTime: 15,
    rating: 4.4,
    ratingCount: 51,
    servingPrice: 142,
    servings: 3,
    cuisine: 'Mediterranean',
    mealTypes: ['Lunch'],
    dietLabels: ['Vegan', 'Low-Carb'],
  },
  {
    id: 'r5',
    title: 'Smash burgers with secret sauce',
    image: img('1568901346375-23c9450c58cd'),
    totalTime: 30,
    rating: 4.7,
    ratingCount: 167,
    servingPrice: 276,
    servings: 4,
    cuisine: 'American',
    mealTypes: ['Dinner'],
    dietLabels: ['High-Protein'],
  },
  {
    id: 'r6',
    title: 'Coconut chickpea curry',
    image: img('1455619452474-d2be8b1e70cd'),
    totalTime: 40,
    rating: 4.5,
    ratingCount: 92,
    servingPrice: 121,
    servings: 5,
    cuisine: 'Indian',
    mealTypes: ['Dinner'],
    dietLabels: ['Vegan', 'Gluten-Free'],
  },
  {
    id: 'r7',
    title: 'Honey sesame chicken stir-fry',
    image: img('1603133872878-684f208fb84b'),
    totalTime: 28,
    rating: 4.6,
    ratingCount: 140,
    servingPrice: 233,
    servings: 4,
    cuisine: 'Asian',
    mealTypes: ['Dinner'],
    dietLabels: ['High-Protein'],
  },
  {
    id: 'r8',
    title: 'Roasted tomato basil soup',
    image: img('1547592180-85f173990554'),
    totalTime: 45,
    rating: 4.8,
    ratingCount: 76,
    servingPrice: 96,
    servings: 6,
    cuisine: 'Italian',
    mealTypes: ['Lunch'],
    dietLabels: ['Vegetarian', 'Low-Carb'],
  },
  {
    id: 'r9',
    title: 'Maple pecan overnight oats',
    image: img('1517673400267-0251440c45dc'),
    totalTime: 10,
    rating: 4.3,
    ratingCount: 44,
    servingPrice: 73,
    servings: 2,
    cuisine: 'American',
    mealTypes: ['Breakfast'],
    dietLabels: ['Vegetarian'],
  },
  {
    id: 'r10',
    title: 'Spicy peanut noodles',
    image: img('1612929633738-8fe44f7ec841'),
    totalTime: 22,
    rating: 4.7,
    ratingCount: 118,
    servingPrice: 154,
    servings: 3,
    cuisine: 'Thai',
    mealTypes: ['Dinner'],
    dietLabels: ['Vegan'],
  },
  {
    id: 'r11',
    title: 'Sheet-pan harissa chicken',
    image: img('1598103442097-8b74394b95c6'),
    totalTime: 38,
    rating: 4.6,
    ratingCount: 63,
    servingPrice: 247,
    servings: 4,
    cuisine: 'Mediterranean',
    mealTypes: ['Dinner'],
    dietLabels: ['High-Protein', 'Gluten-Free'],
  },
  {
    id: 'r12',
    title: 'Dark chocolate banana bread',
    image: img('1578985545062-69928b1d9587'),
    totalTime: 60,
    rating: 4.9,
    ratingCount: 211,
    servingPrice: 67,
    servings: 8,
    cuisine: 'American',
    mealTypes: ['Dessert'],
    dietLabels: ['Vegetarian'],
  },
]

export type MockReview = {
  id: string
  recipeTitle: string
  recipeImage: string
  rating: number
  date: string
  text: string
}

export const mockReviews: MockReview[] = [
  {
    id: 'rv1',
    recipeTitle: 'Charred lemon garlic salmon bowls',
    recipeImage: mockRecipes[0].image,
    rating: 5,
    date: '3 days ago',
    text: 'Made this twice this week. The char on the salmon is unreal and it comes together faster than takeout.',
  },
  {
    id: 'rv2',
    recipeTitle: 'Smash burgers with secret sauce',
    recipeImage: mockRecipes[4].image,
    rating: 5,
    date: '1 week ago',
    text: 'The secret sauce is the move. Whole family approved, even the picky one.',
  },
  {
    id: 'rv3',
    recipeTitle: 'Coconut chickpea curry',
    recipeImage: mockRecipes[5].image,
    rating: 4,
    date: '2 weeks ago',
    text: 'Great base recipe. I added a little extra chili and some spinach at the end.',
  },
  {
    id: 'rv4',
    recipeTitle: 'Fluffy buttermilk pancakes',
    recipeImage: mockRecipes[2].image,
    rating: 5,
    date: '3 weeks ago',
    text: 'Officially our Sunday tradition now. Cheap, easy, and the kids love flipping them.',
  },
]

export type MockCollection = {
  id: string
  name: string
  count: number
  covers: string[]
  accent: string
}

export const mockCollections: MockCollection[] = [
  {
    id: 'c1',
    name: 'Weeknight wins',
    count: 18,
    covers: [mockRecipes[0].image, mockRecipes[4].image, mockRecipes[6].image, mockRecipes[1].image],
    accent: '#ff5722',
  },
  {
    id: 'c2',
    name: 'Meatless Mondays',
    count: 11,
    covers: [mockRecipes[5].image, mockRecipes[3].image, mockRecipes[9].image, mockRecipes[7].image],
    accent: '#00adb5',
  },
  {
    id: 'c3',
    name: 'Lazy weekend brunch',
    count: 7,
    covers: [mockRecipes[2].image, mockRecipes[8].image, mockRecipes[11].image, mockRecipes[0].image],
    accent: '#f5a623',
  },
  {
    id: 'c4',
    name: 'To-try someday',
    count: 23,
    covers: [mockRecipes[10].image, mockRecipes[6].image, mockRecipes[5].image, mockRecipes[3].image],
    accent: '#7b61ff',
  },
]

export type MockAchievement = {
  id: string
  name: string
  desc: string
  icon: string // emoji for the mock
  earned: boolean
  progress?: number // 0-100 for in-progress badges
}

export const mockAchievements: MockAchievement[] = [
  { id: 'a1', name: 'First cook', desc: 'Saved your first recipe', icon: '🍳', earned: true },
  { id: 'a2', name: 'Reviewer', desc: 'Left 10 reviews', icon: '✍️', earned: true },
  { id: 'a3', name: 'Recipe author', desc: 'Published a recipe', icon: '📖', earned: true },
  { id: 'a4', name: 'Globe-trotter', desc: 'Cooked 5 cuisines', icon: '🌍', earned: true },
  { id: 'a5', name: 'On a roll', desc: '7-day cooking streak', icon: '🔥', earned: false, progress: 71 },
  { id: 'a6', name: 'Big saver', desc: 'Save $500 vs takeout', icon: '💰', earned: false, progress: 82 },
  { id: 'a7', name: 'Centurion', desc: 'Cook 100 meals', icon: '🏅', earned: false, progress: 86 },
  { id: 'a8', name: 'Tastemaker', desc: 'Get 50 recipe saves', icon: '⭐', earned: false, progress: 40 },
]

export type MockTaste = { label: string; pct: number; accent: string }

export const mockTasteCuisines: MockTaste[] = [
  { label: 'Italian', pct: 32, accent: '#ff5722' },
  { label: 'American', pct: 24, accent: '#00adb5' },
  { label: 'Asian', pct: 18, accent: '#f5a623' },
  { label: 'Mediterranean', pct: 15, accent: '#7b61ff' },
  { label: 'Indian', pct: 11, accent: '#28a745' },
]

export const mockTasteDiets: MockTaste[] = [
  { label: 'High-Protein', pct: 38, accent: '#ff5722' },
  { label: 'Vegetarian', pct: 29, accent: '#28a745' },
  { label: 'Gluten-Free', pct: 19, accent: '#00adb5' },
  { label: 'Vegan', pct: 14, accent: '#7b61ff' },
]

export type MockActivity = {
  id: string
  type: 'saved' | 'reviewed' | 'published' | 'made' | 'badge'
  text: string
  detail: string
  date: string
  image?: string
}

export const mockActivity: MockActivity[] = [
  { id: 'ac1', type: 'made', text: 'Cooked', detail: 'Charred lemon garlic salmon bowls', date: 'Today', image: mockRecipes[0].image },
  { id: 'ac2', type: 'reviewed', text: 'Reviewed', detail: 'Smash burgers with secret sauce', date: 'Yesterday', image: mockRecipes[4].image },
  { id: 'ac3', type: 'badge', text: 'Earned a badge', detail: 'Globe-trotter — cooked 5 cuisines', date: '2 days ago' },
  { id: 'ac4', type: 'saved', text: 'Saved', detail: 'Spicy peanut noodles', date: '4 days ago', image: mockRecipes[9].image },
  { id: 'ac5', type: 'published', text: 'Published', detail: 'Roasted tomato basil soup', date: '1 week ago', image: mockRecipes[7].image },
  { id: 'ac6', type: 'made', text: 'Cooked', detail: 'Coconut chickpea curry', date: '1 week ago', image: mockRecipes[5].image },
]

export const mockProfile = {
  username: 'jesselind',
  displayName: 'Jesse Lind',
  // UI-avatars renders a clean initial-based avatar with no external photo dep.
  avatar: 'https://ui-avatars.com/api/?name=Jesse+Lind&background=ff5722&color=fff&size=256&bold=true',
  coverImage: img('1504674900247-0877df9cc836'),
  memberSince: 'March 2023',
  location: 'Portland, OR',
  bio: 'Home cook chasing weeknight dinners that don’t break the bank. Big on one-pan meals, bold sauces, and anything with too much garlic.',
  stats: {
    saved: 48,
    reviews: 23,
    recipes: 12,
    drafts: 3,
    made: 86,
    moneySaved: 412, // dollars vs takeout
    streak: 5, // days
    followers: 184,
    following: 96,
  },
  // Lightweight gamification used by the round-3 explorations. Kept small/tasteful
  // by design — a level + rank + XP-to-next, plus a couple of earned badges.
  level: {
    level: 7,
    rank: 'Seasoned Cook',
    xp: 1280,
    xpNext: 2000,
    pct: 64, // progress to next level
  },
}

export type StatTab = {
  key: 'saved' | 'ratings' | 'recipes' | 'drafts'
  label: string
  count: number
}

export const accountTabs: StatTab[] = [
  { key: 'saved', label: 'Saved', count: mockProfile.stats.saved },
  { key: 'ratings', label: 'Ratings', count: mockProfile.stats.reviews },
  { key: 'recipes', label: 'Your Recipes', count: mockProfile.stats.recipes },
  { key: 'drafts', label: 'Drafts', count: mockProfile.stats.drafts },
]
