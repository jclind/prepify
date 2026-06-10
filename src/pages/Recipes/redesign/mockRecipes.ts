import { RecipeType } from 'types'

/**
 * Bundled fixture so every redesign take renders instantly without the Express
 * server / Mongo. These are realistic `RecipeType` shapes — enough fields to
 * drive cards, filters, sorting, and meta rows. Swap to the live
 * `RecipeAPI.getAllRecipes` feed once a winning take is picked.
 *
 * Temporary scaffolding for the /recipes redesign exploration.
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=640&q=70&auto=format&fit=crop`

type Seed = {
  title: string
  image: string
  cuisine: string
  meals: string[]
  diets: string[]
  prep: number
  cook: number | null
  servings: number
  /** serving price in cents */
  price: number
  rateValue: number
  rateCount: number
  calories: number
  /** days since "now", for date sorting */
  ageDays: number
  saves: number
  views: number
}

const seeds: Seed[] = [
  {
    title: 'creamy tuscan chicken',
    image: img('photo-1476224203421-9ac39bcb3327'),
    cuisine: 'Italian',
    meals: ['Dinner'],
    diets: ['High-Protein', 'Low-Carb'],
    prep: 10,
    cook: 25,
    servings: 4,
    price: 312,
    rateValue: 4.8,
    rateCount: 214,
    calories: 540,
    ageDays: 3,
    saves: 1820,
    views: 24100,
  },
  {
    title: 'sheet-pan honey garlic salmon',
    image: img('photo-1467003909585-2f8a72700288'),
    cuisine: 'American',
    meals: ['Dinner'],
    diets: ['High-Protein', 'GLUTEN_FREE'],
    prep: 8,
    cook: 18,
    servings: 2,
    price: 489,
    rateValue: 4.9,
    rateCount: 98,
    calories: 410,
    ageDays: 1,
    saves: 940,
    views: 11200,
  },
  {
    title: 'rainbow veggie buddha bowl',
    image: img('photo-1512621776951-a57141f2eefd'),
    cuisine: 'Mediterranean',
    meals: ['Lunch', 'Salad'],
    diets: ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Fiber'],
    prep: 20,
    cook: null,
    servings: 2,
    price: 268,
    rateValue: 4.6,
    rateCount: 142,
    calories: 380,
    ageDays: 7,
    saves: 2110,
    views: 30500,
  },
  {
    title: 'classic margherita pizza',
    image: img('photo-1565299624946-b28f40a0ae38'),
    cuisine: 'Italian',
    meals: ['Dinner'],
    diets: ['VEGETARIAN'],
    prep: 25,
    cook: 12,
    servings: 4,
    price: 195,
    rateValue: 4.7,
    rateCount: 320,
    calories: 620,
    ageDays: 21,
    saves: 3400,
    views: 51200,
  },
  {
    title: 'fluffy buttermilk pancakes',
    image: img('photo-1567620905732-2d1ec7ab7445'),
    cuisine: 'American',
    meals: ['Breakfast'],
    diets: ['VEGETARIAN'],
    prep: 10,
    cook: 15,
    servings: 4,
    price: 142,
    rateValue: 4.9,
    rateCount: 510,
    calories: 350,
    ageDays: 14,
    saves: 4200,
    views: 68000,
  },
  {
    title: 'thai red curry with tofu',
    image: img('photo-1455619452474-d2be8b1e70cd'),
    cuisine: 'Thai',
    meals: ['Dinner'],
    diets: ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE'],
    prep: 15,
    cook: 20,
    servings: 4,
    price: 287,
    rateValue: 4.8,
    rateCount: 176,
    calories: 460,
    ageDays: 5,
    saves: 1560,
    views: 19800,
  },
  {
    title: 'smashed avocado toast',
    image: img('photo-1588137378633-dea1336ce1e2'),
    cuisine: 'American',
    meals: ['Breakfast', 'Snack', 'Quick'],
    diets: ['VEGETARIAN', 'VEGAN'],
    prep: 7,
    cook: null,
    servings: 1,
    price: 178,
    rateValue: 4.4,
    rateCount: 64,
    calories: 290,
    ageDays: 2,
    saves: 720,
    views: 9400,
  },
  {
    title: 'korean beef bulgogi bowl',
    image: img('photo-1583224944844-5b268c057b72'),
    cuisine: 'Korean',
    meals: ['Dinner'],
    diets: ['High-Protein'],
    prep: 20,
    cook: 10,
    servings: 3,
    price: 421,
    rateValue: 4.9,
    rateCount: 203,
    calories: 580,
    ageDays: 9,
    saves: 2680,
    views: 38900,
  },
  {
    title: 'hearty minestrone soup',
    image: img('photo-1547592180-85f173990554'),
    cuisine: 'Italian',
    meals: ['Lunch', 'Soup or Stew'],
    diets: ['VEGETARIAN', 'VEGAN', 'High-Fiber', 'Low-Fat'],
    prep: 15,
    cook: 35,
    servings: 6,
    price: 156,
    rateValue: 4.5,
    rateCount: 88,
    calories: 240,
    ageDays: 30,
    saves: 1140,
    views: 14600,
  },
  {
    title: 'crispy chicken tacos',
    image: img('photo-1551504734-5ee1c4a1479b'),
    cuisine: 'Mexican',
    meals: ['Dinner', 'Lunch'],
    diets: ['High-Protein'],
    prep: 15,
    cook: 15,
    servings: 4,
    price: 234,
    rateValue: 4.7,
    rateCount: 268,
    calories: 480,
    ageDays: 4,
    saves: 2950,
    views: 42300,
  },
  {
    title: 'lemon herb roasted veggies',
    image: img('photo-1546069901-ba9599a7e63c'),
    cuisine: 'Mediterranean',
    meals: ['Side Dish', 'Salad'],
    diets: ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'Low-Fat', 'Low-Sodium'],
    prep: 12,
    cook: 30,
    servings: 4,
    price: 121,
    rateValue: 4.3,
    rateCount: 52,
    calories: 180,
    ageDays: 11,
    saves: 640,
    views: 8200,
  },
  {
    title: 'double smash burger',
    image: img('photo-1551782450-a2132b4ba21d'),
    cuisine: 'American',
    meals: ['Dinner'],
    diets: ['High-Protein'],
    prep: 10,
    cook: 8,
    servings: 2,
    price: 365,
    rateValue: 4.9,
    rateCount: 412,
    calories: 720,
    ageDays: 6,
    saves: 5100,
    views: 79400,
  },
]

const makeRecipe = (s: Seed, i: number): RecipeType => ({
  _id: `mock-${i + 1}`,
  userId: `author-${(i % 4) + 1}`,
  title: s.title,
  prepTime: s.prep,
  cookTime: s.cook,
  servings: s.servings,
  fridgeLife: 4,
  freezerLife: 60,
  description:
    'A bundled preview recipe used to evaluate the /recipes redesign takes.',
  ingredients: [],
  instructions: [],
  recipeImage: s.image,
  nutritionData: null,
  totalTime: s.prep + (s.cook ?? 0),
  authorUsername: ['mealprepmaggie', 'chef_dan', 'thehungrycook', 'budgetbites'][
    i % 4
  ],
  rating: { rateCount: s.rateCount, rateValue: s.rateValue },
  createdAt: new Date(Date.now() - s.ageDays * 86400000).toISOString(),
  editedAt: null,
  servingPrice: s.price,
  cuisine: s.cuisine,
  mealTypes: s.meals,
  nutritionLabels: s.diets,
  views: s.views,
  numTimesSaved: s.saves,
  numTimesMade: Math.round(s.saves * 0.4),
  // calories isn't a top-level field; stash on nutritionData-free preview via a
  // cast so cards that want to show it can read recipe.__calories.
  ...({ __calories: s.calories } as object),
})

export const MOCK_RECIPES: RecipeType[] = seeds.map(makeRecipe)

/** Preview-only calorie accessor (kept off the real type). */
export const caloriesOf = (r: RecipeType): number =>
  (r as unknown as { __calories?: number }).__calories ?? 0
