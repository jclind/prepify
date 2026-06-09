export type MockRecipe = {
  id: string
  title: string
  image: string
  totalTime: number
  servings: number
  servingPrice: number
  rating: { rateValue: number; rateCount: number }
  cuisine: string
  mealTypes: string[]
  tags: string[]
  author: string
  description?: string
}

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`

export const featuredRecipe: MockRecipe = {
  id: 'r-feature',
  title: 'Crispy Sheet-Pan Gnocchi with Roasted Tomatoes',
  image: img('photo-1473093295043-cdd812d0e601'),
  totalTime: 30,
  servings: 4,
  servingPrice: 245,
  rating: { rateValue: 4.8, rateCount: 412 },
  cuisine: 'Italian',
  mealTypes: ['dinner'],
  tags: ['One-Pan', 'Vegetarian', 'Under 30 min'],
  author: 'mariekitchen',
  description:
    'Pillowy gnocchi turned crispy on a sheet pan, tossed with blistered tomatoes, garlic, and torn basil. Dinner in less time than it takes to order takeout.',
}

export const mockRecipes: MockRecipe[] = [
  {
    id: 'r1',
    title: 'Lemon Herb Salmon Bowls',
    image: img('photo-1551183053-bf91a1d81141'),
    totalTime: 25,
    servings: 2,
    servingPrice: 410,
    rating: { rateValue: 4.7, rateCount: 218 },
    cuisine: 'Mediterranean',
    mealTypes: ['dinner', 'lunch'],
    tags: ['High Protein', 'Gluten-Free'],
    author: 'kchen',
  },
  {
    id: 'r2',
    title: 'Creamy Garlic Tuscan Pasta',
    image: img('photo-1473093295043-cdd812d0e601'),
    totalTime: 20,
    servings: 4,
    servingPrice: 195,
    rating: { rateValue: 4.9, rateCount: 1042 },
    cuisine: 'Italian',
    mealTypes: ['dinner'],
    tags: ['Comfort Food', 'Vegetarian'],
    author: 'rosacooks',
  },
  {
    id: 'r3',
    title: 'Sheet Pan Chicken Fajitas',
    image: img('photo-1565299624946-b28f40a0ae38'),
    totalTime: 30,
    servings: 4,
    servingPrice: 285,
    rating: { rateValue: 4.6, rateCount: 558 },
    cuisine: 'Mexican',
    mealTypes: ['dinner'],
    tags: ['One-Pan', 'High Protein'],
    author: 'tonyfoods',
  },
  {
    id: 'r4',
    title: 'Honey Sesame Tofu Stir-Fry',
    image: img('photo-1546069901-ba9599a7e63c'),
    totalTime: 25,
    servings: 3,
    servingPrice: 220,
    rating: { rateValue: 4.5, rateCount: 304 },
    cuisine: 'Asian',
    mealTypes: ['dinner', 'lunch'],
    tags: ['Vegan', 'Quick'],
    author: 'plantedlina',
  },
  {
    id: 'r5',
    title: 'Avocado Toast with Soft Eggs',
    image: img('photo-1565958011703-44f9829ba187'),
    totalTime: 10,
    servings: 1,
    servingPrice: 175,
    rating: { rateValue: 4.4, rateCount: 89 },
    cuisine: 'American',
    mealTypes: ['breakfast'],
    tags: ['Vegetarian', '10 min'],
    author: 'sunbreakfast',
  },
  {
    id: 'r6',
    title: 'Fluffy Buttermilk Pancakes',
    image: img('photo-1567620905732-2d1ec7ab7445'),
    totalTime: 20,
    servings: 4,
    servingPrice: 95,
    rating: { rateValue: 4.9, rateCount: 1822 },
    cuisine: 'American',
    mealTypes: ['breakfast'],
    tags: ['Family Favorite'],
    author: 'pancakeking',
  },
  {
    id: 'r7',
    title: 'Mediterranean Chickpea Salad',
    image: img('photo-1540189549336-e6e99c3679fe'),
    totalTime: 15,
    servings: 2,
    servingPrice: 145,
    rating: { rateValue: 4.6, rateCount: 421 },
    cuisine: 'Mediterranean',
    mealTypes: ['lunch'],
    tags: ['Vegan', 'No-Cook'],
    author: 'olivegrove',
  },
  {
    id: 'r8',
    title: 'Classic Smashburger',
    image: img('photo-1551782450-a2132b4ba21d'),
    totalTime: 20,
    servings: 2,
    servingPrice: 480,
    rating: { rateValue: 4.8, rateCount: 712 },
    cuisine: 'American',
    mealTypes: ['dinner', 'lunch'],
    tags: ['Crowd-Pleaser'],
    author: 'grilldad',
  },
  {
    id: 'r9',
    title: 'Berry Yogurt Parfait',
    image: img('photo-1490645935967-10de6ba17061'),
    totalTime: 5,
    servings: 1,
    servingPrice: 215,
    rating: { rateValue: 4.5, rateCount: 134 },
    cuisine: 'American',
    mealTypes: ['breakfast'],
    tags: ['No-Cook', 'High Protein'],
    author: 'morningmade',
  },
  {
    id: 'r10',
    title: 'Spicy Miso Ramen',
    image: img('photo-1414235077428-338989a2e8c0'),
    totalTime: 35,
    servings: 2,
    servingPrice: 325,
    rating: { rateValue: 4.7, rateCount: 489 },
    cuisine: 'Japanese',
    mealTypes: ['dinner'],
    tags: ['Cozy', 'Comfort Food'],
    author: 'noodlehouse',
  },
  {
    id: 'r11',
    title: 'Quick Chicken Caesar Wrap',
    image: img('photo-1540189549336-e6e99c3679fe'),
    totalTime: 15,
    servings: 1,
    servingPrice: 285,
    rating: { rateValue: 4.4, rateCount: 87 },
    cuisine: 'American',
    mealTypes: ['lunch'],
    tags: ['High Protein', 'Quick'],
    author: 'lunchbox',
  },
  {
    id: 'r12',
    title: 'Garlic Butter Steak Bites',
    image: img('photo-1504674900247-0877df9cc836'),
    totalTime: 20,
    servings: 2,
    servingPrice: 525,
    rating: { rateValue: 4.9, rateCount: 956 },
    cuisine: 'American',
    mealTypes: ['dinner'],
    tags: ['High Protein', '20 min'],
    author: 'castiron',
  },
]

export const byMeal = {
  breakfast: mockRecipes.filter(r => r.mealTypes.includes('breakfast')),
  lunch: mockRecipes.filter(r => r.mealTypes.includes('lunch')),
  dinner: mockRecipes.filter(r => r.mealTypes.includes('dinner')),
}

export const moods = [
  {
    id: 'quick',
    label: 'Quick & Easy',
    blurb: 'Under 30 minutes, weeknight heroes',
    color: '#ff5722',
    image: img('photo-1473093295043-cdd812d0e601'),
  },
  {
    id: 'cozy',
    label: 'Cozy Comfort',
    blurb: 'For when you need a hug from a bowl',
    color: '#8b5a3c',
    image: img('photo-1414235077428-338989a2e8c0'),
  },
  {
    id: 'healthy',
    label: 'Light & Healthy',
    blurb: 'Fresh, bright, feel-good food',
    color: '#00adb5',
    image: img('photo-1540189549336-e6e99c3679fe'),
  },
  {
    id: 'crowd',
    label: 'Crowd-Pleasers',
    blurb: 'Recipes that disappear fast',
    color: '#c44536',
    image: img('photo-1551782450-a2132b4ba21d'),
  },
]

export const weeklyPlan = [
  {
    day: 'Mon',
    breakfast: mockRecipes[4],
    lunch: mockRecipes[10],
    dinner: mockRecipes[1],
  },
  {
    day: 'Tue',
    breakfast: mockRecipes[8],
    lunch: mockRecipes[6],
    dinner: mockRecipes[2],
  },
  {
    day: 'Wed',
    breakfast: mockRecipes[5],
    lunch: null,
    dinner: mockRecipes[3],
  },
  {
    day: 'Thu',
    breakfast: mockRecipes[4],
    lunch: mockRecipes[10],
    dinner: mockRecipes[9],
  },
  {
    day: 'Fri',
    breakfast: null,
    lunch: mockRecipes[6],
    dinner: mockRecipes[7],
  },
  {
    day: 'Sat',
    breakfast: mockRecipes[5],
    lunch: null,
    dinner: mockRecipes[0],
  },
  {
    day: 'Sun',
    breakfast: mockRecipes[8],
    lunch: mockRecipes[10],
    dinner: mockRecipes[11],
  },
]

export const shoppingPreview = [
  { name: 'Chicken thighs', qty: '2 lbs' },
  { name: 'Bell peppers', qty: '3' },
  { name: 'Yellow onions', qty: '2' },
  { name: 'Gnocchi', qty: '1 lb' },
  { name: 'Cherry tomatoes', qty: '1 pint' },
  { name: 'Greek yogurt', qty: '32 oz' },
  { name: 'Mixed berries', qty: '12 oz' },
]
