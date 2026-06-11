import { IngredientData, ParsedIngredient } from '@jclind/ingredient-parser'

export type RecipeType = {
  _id: string
  // Firebase uid of the author. Stamped server-side and returned by GET
  // /getRecipe; the source of truth for ownership checks (authorUsername is a
  // display snapshot that goes stale if the user renames).
  userId?: string
  title: string
  prepTime: number
  cookTime: number | null
  servings: number
  fridgeLife: number | null
  freezerLife: number | null
  description: string
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  recipeImage: string
  nutritionData: NutritionDataType | null
  totalTime: number
  authorUsername: string
  rating: {
    rateCount: number
    rateValue: number
  }
  createdAt: string
  editedAt: null | string
  servingPrice: number | null
  cuisine: string
  mealTypes: string[]
  nutritionLabels: string[] | null
  views: number
  numTimesSaved: number
  numTimesMade: number
  // Moderation/curation state (P1/P2). Absent on legacy recipes = public/active.
  status?: 'active' | 'hidden' | 'unpublished'
  featured?: boolean
}
export type RecipeFormType = {
  title: string
  prepTime: number
  cookTime: number | null
  servings: number
  fridgeLife: number | null
  freezerLife: number | null
  description: string
  ingredients: IngredientsType[]
  instructions: InstructionsType[]
  recipeImage: File
  cuisine: string
  mealTypes: string[]
}

// Same shape as RecipeFormType, but the image is optional: when editing, an
// unchanged recipe keeps its existing stored image URL and no new File is set.
export type RecipeEditFormType = Omit<RecipeFormType, 'recipeImage'> & {
  recipeImage?: File
}

// An in-progress recipe autosaved during the create flow. Every content field
// is optional — a draft is intentionally incomplete — and the image is *not*
// persisted (it's re-picked when the user resumes; publishing still requires
// one). `RecipeDraftContent` is what the client sends on autosave;
// `RecipeDraftType` is the stored document the server returns.
//
// Clearable numeric fields are `number | null` (not just optional): autosave
// sends an explicit `null` when the user empties them so the clear is
// persisted. Omitting the key (sending `undefined`) would be dropped by
// JSON.stringify, and the server's field-present `$set` whitelist would then
// leave the stale value in place — a cleared field would silently resurrect on
// resume.
export type RecipeDraftContent = {
  title?: string
  description?: string
  servings?: number | null
  prepTime?: number | null
  cookTime?: number | null
  fridgeLife?: number | null
  freezerLife?: number | null
  ingredients?: IngredientsType[]
  instructions?: InstructionsType[]
  cuisine?: string
  mealTypes?: string[]
}

export type RecipeDraftType = RecipeDraftContent & {
  _id: string
  userId: string
  createdAt: string
  updatedAt: string
}

export type LabelType = { label: string; id: string }
export type IngredientsType =
  | {
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData
      id: string
    }
  | {
      error?: {
        message: string
      }
      parsedIngredient: ParsedIngredient
      ingredientData: IngredientData | null
      id: string
    }
  | LabelType
export type InstructionsType =
  | { content: string; index: number; id: string }
  | LabelType

interface NutrientInfo {
  label: string
  quantity: number
  unit: string
}

export interface NutritionDataType {
  uri: string
  yield: number
  calories: number
  totalWeight: number
  dietLabels: string[]
  healthLabels: string[]
  cautions: string[]
  totalNutrients: Record<string, NutrientInfo>
  totalDaily: Record<string, NutrientInfo>
  ingredients: unknown[] // TODO: Edamam parsed-ingredient shape — not accessed directly in this codebase
  totalNutrientsKCal: Record<string, NutrientInfo>
}

export interface RecipeDBResponseType {
  recipeList: RecipeType[]
  page: number
  filters: {}
  entries_per_page: number
  total_results: number
}
export interface RecipeSearchResponseType {
  _id: string
  title: string
  recipeImage: string
  totalTime: number
  rating: {
    rateCount: number
    rateValue: number
  }
  servingPrice: number
  nutritionLabels: string[]
  servings: number
}
export type OptionalReviewType = {
  _id: string
  username: string
  recipeId: string
  rating: string
  ratingLastUpdated: string
  reviewCreatedAt?: string
  reviewLastUpdated?: string
  reviewText?: string
  recipeTitle?: string
  recipeImage?: string
}
export type ReviewType = {
  _id: string
  username: string
  recipeId: string
  rating: string
  ratingLastUpdated: string
  reviewCreatedAt: string
  reviewLastUpdated: string
  reviewText: string
}

export interface NewReviewType {
  recipeId: string
  reviewText: string
}

// ─── Moderation / reports ──────────────────────────────────────────────────
export type ReportTargetType = 'recipe' | 'review'
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'offensive'
  | 'copyright'
  | 'dangerous'
  | 'other'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface NewReportType {
  targetType: ReportTargetType
  recipeId: string
  reportedUsername?: string // required when targetType === 'review'
  reason: ReportReason
  details?: string
}

export interface ReportType {
  _id: string
  targetType: ReportTargetType
  recipeId: string
  reportedUsername?: string
  reporterUid: string
  reason: ReportReason
  details: string
  status: ReportStatus
  createdAt: string
  resolvedBy?: string
  resolvedAt?: string
}

// Report enriched with a snapshot of the reported content, as returned by the
// admin GET /reports queue.
export interface AdminReportType extends ReportType {
  target: {
    recipe: {
      _id: string
      title?: string
      recipeImage?: string
      status?: string
      userId?: string
    } | null
    review: {
      reviewText?: string
      rating?: number
      moderationHidden?: boolean
    } | null
  }
}

export interface AdminReportsResponse {
  reports: AdminReportType[]
  totalCount: number
  openCount: number
}

// ─── User moderation (P2) ──────────────────────────────────────────────────
export type UserStatus = 'active' | 'suspended' | 'banned'

// Server 403 `code` values when a suspended/banned user attempts a write
// (server/middleware/auth.js requireActive). Surfaced as a toast by http-common.
export type AccountBlockedCode = 'ACCOUNT_SUSPENDED' | 'ACCOUNT_BANNED'

export interface AdminUserType {
  uid: string
  username: string | null
  email?: string | null
  status: UserStatus
  statusReason: string | null
  statusUpdatedAt: string | null
  statusUpdatedBy: string | null
  counts: {
    recipes: number
    reviews: number
    openReports: number
  }
}

export interface AdminUserDetailType extends AdminUserType {
  recentRecipes: { _id: string; title?: string; recipeImage?: string; status?: string }[]
  recentReviews: { recipeId: string; rating?: number; reviewText?: string }[]
}

export interface AdminUsersResponse {
  users: AdminUserType[]
  totalCount: number
}

export interface AddRecipeErrorType {
  title: string
  image: string
  description: string
  servings: string
  prepTime: string
  cookTime: string
  ingredients: string
  instructions: string
  cuisine: string
  mealType: string
}
