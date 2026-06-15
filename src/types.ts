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
  // 'pending_review' = an automated-moderation hold: owner-visible, withheld from
  // public reads until an admin clears it.
  status?: 'active' | 'hidden' | 'unpublished' | 'pending_review'
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

// ─── Bug reports (user-submitted product feedback) ─────────────────────────
export type BugReportCategory = 'bug' | 'confusing' | 'idea' | 'other'

// Status reuses the moderation lifecycle values.
export type BugReportStatus = ReportStatus

// What the client sends. Context (url, appVersion) is auto-captured by the form;
// email is only collected from logged-out users for follow-up.
export interface NewBugReportType {
  category: BugReportCategory
  description: string
  url?: string
  appVersion?: string
  email?: string
}

export interface BugReportType {
  _id: string
  reporterUid: string | null
  reporterEmail: string | null
  category: BugReportCategory
  description: string
  url: string
  userAgent: string
  appVersion: string
  status: BugReportStatus
  createdAt: string
  resolvedBy?: string
  resolvedAt?: string
}

// Bug report enriched with the reporter's username, as returned by the admin
// GET /admin/bug-reports queue. Null username = anonymous or no username on file.
export interface AdminBugReportType extends BugReportType {
  reporterUsername: string | null
}

export interface AdminBugReportsResponse {
  reports: AdminBugReportType[]
  totalCount: number
  openCount: number
}

// ─── User moderation (P2) ──────────────────────────────────────────────────
export type UserStatus = 'active' | 'suspended' | 'banned'


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

// Admin audit trail (P3). Mirrors server/util/auditLog.js.
export type AuditAction =
  | 'recipe.hide'
  | 'recipe.unhide'
  | 'recipe.publish'
  | 'recipe.unpublish'
  | 'recipe.feature'
  | 'recipe.unfeature'
  | 'review.takedown'
  | 'review.restore'
  | 'user.suspend'
  | 'user.ban'
  | 'user.activate'
  | 'user.delete'
  | 'report.resolve'
  | 'report.dismiss'
  | 'bugReport.resolve'
  | 'bugReport.dismiss'

export type AuditTargetType =
  | 'recipe'
  | 'review'
  | 'user'
  | 'report'
  | 'bugReport'

export interface AuditEntryType {
  _id: string
  action: AuditAction
  actorUid: string
  actorUsername: string | null
  targetType: AuditTargetType
  targetId: string | null
  targetLabel: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditResponse {
  entries: AuditEntryType[]
  totalCount: number
}

// Admin analytics dashboard (P3b). Mirrors GET /admin/analytics in
// server/routes/admin.js.
export interface AnalyticsTotals {
  users: number
  recipes: {
    total: number
    active: number
    hidden: number
    unpublished: number
    featured: number
  }
  reviews: number
  reports: {
    open: number
    resolved: number
    dismissed: number
  }
}

// One day of a zero-filled daily series (oldest first). `date` is 'YYYY-MM-DD'.
export interface TimeBucket {
  date: string
  count: number
}

export interface AnalyticsResponse {
  days: number
  totals: AnalyticsTotals
  reportsOverTime: TimeBucket[]
  recipesOverTime: TimeBucket[]
  usersOverTime: TimeBucket[]
  recentActions: AuditEntryType[]
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

// Aggregate item counts for the account-page tabs, returned by
// GET /getAccountCounts. All fields are real counts (0 when the user has none).
export type AccountTabCounts = {
  saved: number
  ratings: number
  recipes: number
  drafts: number
}

// Gamification state for the account header, returned by GET /getGamification.
// Everything is derived server-side from the account counts; `newlyUnlocked`
// lists earned-but-unacknowledged achievement ids (drives the unlock toast).
export type Achievement = {
  id: string
  name: string
  description: string
  earned: boolean
}
export type Gamification = {
  level: number
  rank: string
  xp: number // progress within the current level
  xpNext: number // XP needed to clear the current level
  pct: number // 0–100
  totalXp: number
  achievements: Achievement[]
  earned: string[]
  newlyUnlocked: string[]
}

// Public, read-only profile returned by GET /getPublicProfile. Identity comes
// from Firebase Auth (displayName/photoURL); `achievements` are earned-only.
export type PublicProfile = {
  username: string
  displayName: string
  photoURL: string | null
  bio: string
  location: string
  level: number
  rank: string
  xp: number
  xpNext: number
  pct: number
  achievements: Achievement[]
  recipes: RecipeType[]
  recipesTotalCount: number
}
