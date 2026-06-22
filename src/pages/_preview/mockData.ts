// TEMP — preview mock data (throwaway; removed before the polish PR). Feeds the
// REAL page components rich data + deliberate edge cases so the designs can be
// eyeballed in action without a populated account.
import {
  PublicProfile,
  RecipeType,
  OptionalReviewType,
  RecipeDraftType,
} from 'types'

const msAgo = (days: number) =>
  String(Date.now() - days * 24 * 60 * 60 * 1000)
const isoAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

const LONG_TITLE =
  'The Ultimate Slow-Roasted Garlic-Butter Herb Prime Rib with Red-Wine Reduction, Crispy Shallots & Horseradish Cream'

// Real catalog image URLs (so cards show true food photos without a runtime fetch).
const DEFAULT_IMAGES = [
  'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2FCinnamon-Raisin-Granola-4.jpg?alt=media&token=9fa71bb6-04ef-4923-9015-73d90abce7e9',
  'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2F1537973085542.jpeg?alt=media&token=02b0588b-89f4-4512-bb09-e0ed53647377',
  'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2FGemini_Generated_Image_tyyob1tyyob1tyyo.png?alt=media&token=c3cb14be-3ee6-4eba-8128-02fe88cbdd39',
  'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2Fscrambled-eggs.webp?alt=media&token=c8d734be-3708-4def-9f15-4d0c32192535',
  'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2Fone-pot-cheesy-broccoli-sausage-pasta2.jpg?alt=media&token=0ac50ad0-8b3c-4149-85cc-6eef77e30003',
]

// Pull image URLs in round-robin so cards show real food photos.
const img = (images: string[], i: number) =>
  images.length ? images[i % images.length] : ''

// Fields the cards actually read; cast to satisfy the full RecipeType.
const mkRecipe = (
  images: string[],
  i: number,
  over: Partial<RecipeType>
): RecipeType =>
  ({
    _id: `mock-${i}`,
    title: `Recipe ${i}`,
    recipeImage: img(images, i),
    servingPrice: 250,
    servings: 4,
    totalTime: 35,
    rating: { rateCount: 12, rateValue: 4.3 },
    views: 240,
    numTimesSaved: 30,
    numTimesMade: 11,
    createdAt: msAgo(i * 7 + 3),
    cuisine: 'American',
    mealTypes: ['dinner'],
    ...over,
  } as unknown as RecipeType)

export type PreviewData = {
  recipes: RecipeType[]
  reviews: OptionalReviewType[]
  drafts: RecipeDraftType[]
  profile: PublicProfile
}

export function buildPreviewData(imagesArg?: string[]): PreviewData {
  const images = imagesArg && imagesArg.length ? imagesArg : DEFAULT_IMAGES
  const recipes: RecipeType[] = [
    // edge: enormous metrics + a viral hit
    mkRecipe(images, 0, {
      title: 'Viral Tan­ghulu (Candied Fruit)',
      views: 1284000,
      numTimesSaved: 98300,
      numTimesMade: 4521,
      rating: { rateCount: 3120, rateValue: 4.9 },
      servingPrice: 95,
    }),
    // edge: super long title (ellipsis)
    mkRecipe(images, 1, {
      title: LONG_TITLE,
      views: 842,
      numTimesSaved: 56,
      numTimesMade: 7,
      rating: { rateCount: 41, rateValue: 4.6 },
      servingPrice: 1299,
    }),
    // edge: brand new, no ratings, no price
    mkRecipe(images, 2, {
      title: 'Untested 2am Fridge Surprise',
      views: 3,
      numTimesSaved: 0,
      numTimesMade: 0,
      rating: { rateCount: 0, rateValue: 0 },
      servingPrice: null,
    }),
    mkRecipe(images, 3, {
      title: 'Weeknight Lemon Garlic Chicken',
      views: 1820,
      numTimesSaved: 410,
      numTimesMade: 96,
      rating: { rateCount: 88, rateValue: 4.2 },
      servingPrice: 181,
    }),
    mkRecipe(images, 4, {
      title: 'One-Pan Mediterranean Orzo',
      views: 560,
      numTimesSaved: 73,
      numTimesMade: 22,
      rating: { rateCount: 19, rateValue: 3.8 },
      servingPrice: 247,
    }),
    mkRecipe(images, 5, {
      title: 'Brown-Butter Chocolate Chip Cookies',
      views: 9240,
      numTimesSaved: 2110,
      numTimesMade: 540,
      rating: { rateCount: 301, rateValue: 4.8 },
      servingPrice: 64,
    }),
  ]

  const reviews: OptionalReviewType[] = [
    {
      _id: 'rev-1',
      username: 'mock',
      recipeId: 'mock-1',
      rating: '5',
      ratingLastUpdated: isoAgo(2),
      reviewText:
        'Absolutely unreal. I made this for a dinner party of ten and every single person asked for the recipe — even the friend who claims he "doesn\'t do fancy food." I subbed half the butter for olive oil and it still came out rich and glossy. Will be in my rotation forever.',
      recipeTitle: LONG_TITLE,
      recipeImage: img(images, 1),
    },
    {
      _id: 'rev-2',
      username: 'mock',
      recipeId: 'mock-3',
      rating: '4',
      ratingLastUpdated: isoAgo(9),
      // edge: no written review (rated only)
      recipeTitle: 'Weeknight Lemon Garlic Chicken',
      recipeImage: img(images, 3),
    },
    {
      _id: 'rev-3',
      username: 'mock',
      recipeId: 'mock-4',
      rating: '2',
      ratingLastUpdated: isoAgo(40),
      reviewText: 'A bit bland for me — needed way more salt and acid.',
      recipeTitle: 'One-Pan Mediterranean Orzo',
      recipeImage: img(images, 4),
    },
    {
      _id: 'rev-4',
      username: 'mock',
      recipeId: 'mock-5',
      rating: '5',
      ratingLastUpdated: isoAgo(120),
      reviewText: 'Best cookies ever. 🍪',
      recipeTitle: 'Brown-Butter Chocolate Chip Cookies',
      recipeImage: img(images, 5),
    },
    {
      _id: 'rev-5',
      username: 'mock',
      recipeId: 'mock-0',
      rating: '3',
      ratingLastUpdated: isoAgo(1),
      // edge: very long title in a compact row
      recipeTitle: LONG_TITLE,
      recipeImage: img(images, 0),
    },
  ]

  const drafts: RecipeDraftType[] = [
    // edge: super long title
    {
      _id: 'd-1',
      userId: 'mock',
      createdAt: msAgo(10),
      updatedAt: msAgo(0),
      title: LONG_TITLE,
      ingredients: Array.from({ length: 28 }) as any,
      instructions: Array.from({ length: 15 }) as any,
    },
    // edge: untitled
    {
      _id: 'd-2',
      userId: 'mock',
      createdAt: msAgo(4),
      updatedAt: msAgo(4),
      title: '',
      ingredients: Array.from({ length: 3 }) as any,
      instructions: Array.from({ length: 1 }) as any,
    },
    // edge: empty draft (0/0)
    {
      _id: 'd-3',
      userId: 'mock',
      createdAt: msAgo(1),
      updatedAt: msAgo(1),
      title: 'Just an idea',
      ingredients: [] as any,
      instructions: [] as any,
    },
    // edge: singular (1 ingredient · 1 step)
    {
      _id: 'd-4',
      userId: 'mock',
      createdAt: msAgo(31),
      updatedAt: msAgo(31),
      title: 'Single-ingredient experiment',
      ingredients: Array.from({ length: 1 }) as any,
      instructions: Array.from({ length: 1 }) as any,
    },
  ]

  const profile: PublicProfile = {
    username: 'alexandra_weeknight_dinner_champion',
    displayName: 'Alexandra Christopherson-Wellington',
    photoURL: null, // edge: initial-avatar fallback
    bio: 'Recovering takeout addict turned weeknight-dinner obsessive. I cook mostly one-pan meals on a budget and document every win (and the occasional kitchen fire). Big believer that dessert counts as self-care.',
    location: 'San Francisco, California',
    level: 7,
    rank: 'Seasoned Cook',
    xp: 140,
    xpNext: 250,
    pct: 56,
    // edge: many badges → wrap test, incl. a long one
    achievements: [
      { id: 'a1', name: 'First Recipe', description: 'Published a first recipe', earned: true },
      { id: 'a2', name: 'First Save', description: 'Saved a recipe', earned: true },
      { id: 'a3', name: 'Crowd Pleaser', description: '100 saves on one recipe', earned: true },
      { id: 'a4', name: 'Prolific Author', description: 'Published 25 recipes', earned: true },
      { id: 'a5', name: 'Five-Star Streak', description: 'Five 5-star recipes in a row', earned: true },
      { id: 'a6', name: 'Community Favorite of the Month', description: 'Top creator this month', earned: true },
    ],
    recipes,
    recipesTotalCount: 47, // edge: more than shown → "Showing N of 47"
    recipesSavesTotal: 100949, // cross-recipe totals (server aggregate)
    recipesMadeTotal: 5186,
  }

  return { recipes, reviews, drafts, profile }
}
