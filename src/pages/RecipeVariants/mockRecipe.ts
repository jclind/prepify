export type MockIngredient = {
  id: string
  qty: string
  name: string
  note?: string
  image: string
}

export type MockStep = {
  id: string
  index: number
  text: string
  minutes: number
  phase: 'prep' | 'cook'
}

export type MockReview = {
  id: string
  username: string
  rating: number
  date: string
  text: string
}

export type RecipeData = {
  id: string
  title: string
  description: string
  cuisine: string
  image: string
  author: string
  authorAvatar: string
  prepTime: number
  cookTime: number
  totalTime: number
  servings: number
  servingPrice: number
  rating: { rateValue: number; rateCount: number }
  views: number
  saves: number
  madeIt: number
  nutritionLabels: string[]
  tags: string[]
  ingredients: MockIngredient[]
  steps: MockStep[]
  reviews: MockReview[]
  nutrition: {
    calories: number
    protein: number
    fat: number
    carbs: number
    fiber: number
    sugar: number
    sodium: number
  }
  createdAt: string
}

const ingImg = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=120&h=120&q=70`

export const mockRecipe: RecipeData = {
  id: 'sample-recipe',
  title: 'Creamy Tuscan Garlic Pasta',
  description:
    'Silky parmesan cream sauce loaded with sun-dried tomatoes, garlic, and spinach, tossed with fettuccine. The kind of weeknight dinner that tastes like Sunday.',
  cuisine: 'Italian',
  image:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1600&q=75',
  author: 'mariekitchen',
  authorAvatar:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=70',
  prepTime: 10,
  cookTime: 20,
  totalTime: 30,
  servings: 4,
  servingPrice: 245,
  rating: { rateValue: 4.8, rateCount: 412 },
  views: 8451,
  saves: 1240,
  madeIt: 312,
  nutritionLabels: ['Vegetarian', 'High Protein'],
  tags: ['Comfort Food', 'Italian', 'Pasta', 'Quick Dinner', '30 minute'],
  ingredients: [
    {
      id: 'i1',
      qty: '1 lb',
      name: 'fettuccine',
      image: ingImg('photo-1551462147-37885acc36f1'),
    },
    {
      id: 'i2',
      qty: '4 tbsp',
      name: 'butter',
      image: ingImg('photo-1589985270826-4b7bb135bc9d'),
    },
    {
      id: 'i3',
      qty: '4 cloves',
      name: 'garlic',
      note: 'minced',
      image: ingImg('photo-1615477550927-6ec8444ada23'),
    },
    {
      id: 'i4',
      qty: '1 cup',
      name: 'sun-dried tomatoes',
      note: 'chopped',
      image: ingImg('photo-1592924357228-91a4daadcfea'),
    },
    {
      id: 'i5',
      qty: '2 cups',
      name: 'heavy cream',
      image: ingImg('photo-1563636619-e9143da7973b'),
    },
    {
      id: 'i6',
      qty: '1 cup',
      name: 'parmesan',
      note: 'freshly grated',
      image: ingImg('photo-1452195100486-9cc805987862'),
    },
    {
      id: 'i7',
      qty: '3 cups',
      name: 'baby spinach',
      image: ingImg('photo-1576045057995-568f588f82fb'),
    },
    {
      id: 'i8',
      qty: '1 tsp',
      name: 'Italian seasoning',
      image: ingImg('photo-1532336414038-cf19250c5757'),
    },
    {
      id: 'i9',
      qty: 'to taste',
      name: 'salt and black pepper',
      image: ingImg('photo-1599909533730-30af1bc35e7e'),
    },
    {
      id: 'i10',
      qty: '2 tbsp',
      name: 'fresh basil',
      note: 'for garnish',
      image: ingImg('photo-1600326145552-327c4df2c246'),
    },
  ],
  steps: [
    {
      id: 's1',
      index: 1,
      text: 'Bring a large pot of generously salted water to a boil. Cook fettuccine to al dente, about 9 minutes. Reserve 1 cup of the starchy pasta water before draining.',
      minutes: 10,
      phase: 'prep',
    },
    {
      id: 's2',
      index: 2,
      text: 'Meanwhile, melt butter in a wide, deep skillet over medium heat. Once foaming, add the minced garlic and stir constantly for about 30 seconds — until fragrant but not browned.',
      minutes: 2,
      phase: 'cook',
    },
    {
      id: 's3',
      index: 3,
      text: 'Add the chopped sun-dried tomatoes and cook for 2 minutes, letting their oils mingle with the butter.',
      minutes: 2,
      phase: 'cook',
    },
    {
      id: 's4',
      index: 4,
      text: 'Pour in the heavy cream, raise heat slightly, and bring to a gentle simmer. Once bubbling at the edges, reduce heat to low.',
      minutes: 3,
      phase: 'cook',
    },
    {
      id: 's5',
      index: 5,
      text: 'Whisk in the parmesan in three additions, letting each batch melt smoothly before adding the next. The sauce should turn glossy and coat the back of a spoon.',
      minutes: 3,
      phase: 'cook',
    },
    {
      id: 's6',
      index: 6,
      text: 'Stir in spinach and Italian seasoning. Cook until the spinach wilts down, about 2 minutes.',
      minutes: 2,
      phase: 'cook',
    },
    {
      id: 's7',
      index: 7,
      text: 'Add the drained pasta to the skillet and toss to coat. Loosen with reserved pasta water, a splash at a time, until the sauce clings to every strand.',
      minutes: 2,
      phase: 'cook',
    },
    {
      id: 's8',
      index: 8,
      text: 'Taste and adjust salt and pepper. Tear fresh basil over the top and serve immediately, with extra parmesan at the table.',
      minutes: 1,
      phase: 'cook',
    },
  ],
  reviews: [
    {
      id: 'r1',
      username: 'pastagirl_42',
      rating: 5,
      date: '3 weeks ago',
      text:
        'This has become our Friday night ritual. I add a splash of white wine before the cream — total upgrade. The sun-dried tomatoes make it.',
    },
    {
      id: 'r2',
      username: 'tonyfoods',
      rating: 5,
      date: '1 month ago',
      text:
        'Best creamy pasta recipe on the site, no contest. I bumped the garlic to 6 cloves and threw in some red pepper flakes.',
    },
    {
      id: 'r3',
      username: 'newcook',
      rating: 4,
      date: '2 months ago',
      text:
        'Solid weeknight dinner. Mine came out a little thick — next time I will hold back some of the parmesan and add more pasta water.',
    },
  ],
  nutrition: {
    calories: 642,
    protein: 22,
    fat: 38,
    carbs: 56,
    fiber: 4,
    sugar: 6,
    sodium: 410,
  },
  createdAt: '2024-08-12',
}

export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`
