// Prepify-owned ingredient types. These deliberately do NOT import from
// @jclind/ingredient-parser: v2 restructured its output (nested quantity/unit
// objects, `price`/`image` renames) and these names are the app's stable,
// persisted contract. The server projects the v2 result back onto this shape at
// the /api/ingredients/parse boundary (server/routes/ingredients.js), so both
// freshly-enriched ingredients and every already-saved recipe document stay
// valid. The flat ParsedIngredient below matches the package's `parseIngredient
// String` legacy adapter, which the add-recipe flow still calls locally.
export type ParsedIngredient = {
  quantity: number | null
  unit: string | null
  unitPlural: string | null
  symbol: string | null
  ingredient: string | null
  originalIngredientString: string
  minQty: number | null
  maxQty: number | null
  comment: string | null
}

// How a price was arrived at, straight from @jclind/ingredient-parser. 'gram'
// means the quantity was converted to grams and multiplied by a per-gram price;
// 'unit-estimate' means it was multiplied by a per-item price instead. 'free'
// (2.2.0) means the parser decided the ingredient genuinely costs nothing, so
// the 0 is an answer rather than a missing lookup: water and ice, and amounts
// left to the cook like "salt and pepper to taste".
export type PriceBasis = 'gram' | 'unit-estimate' | 'free'

// 'high' only for mass measures, where unit → grams is exact and
// density-independent. Volume conversions lean on an average density (a cup of
// flour genuinely varies ±20%) and per-item multiplication is a guess, so both
// are 'low' and the UI labels them as estimates.
export type PriceConfidence = 'high' | 'low'

export interface IngredientData {
  // Fields the app reads/persists today.
  name: string
  imagePath?: string
  totalPriceUSACents?: number
  // Absent on rows enriched before 2026-08, and absent whenever the price is.
  priceBasis?: PriceBasis
  priceConfidence?: PriceConfidence
  possibleUnits?: string[]
  category?: string
  // Tolerated extras: older recipe documents persisted the full v1 enrichment
  // blob. These stay optional so historical reads keep type-checking; new
  // enrichments only populate the fields above.
  _id?: string
  ingredientId?: number
  originalName?: string
  amount?: number
  consistency?: string
  shoppingListUnits?: string[]
  aisle?: string
  image?: string
  nutrition?: unknown
  estimatedPrices?: {
    estimatedGramPrice?: number
    estimatedSingleUnitPrice?: number
  }
  meta?: unknown
  categoryPath?: unknown
  unit?: string
  unitShort?: string
  unitLong?: string
  original?: unknown
  id?: number
}

export type RatingBreakdown = { '1': number; '2': number; '3': number; '4': number; '5': number }
export type RatingAggregate = {
  rateCount: number
  rateValue: number
  breakdown?: RatingBreakdown
}

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
  rating: RatingAggregate
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
  // Admin-only: the open automod report's classifier, attached by GET /getRecipe
  // for an admin viewing a 'pending_review' recipe so the admin strip can explain
  // the hold inline. null when held by a non-automod path; absent otherwise.
  automodClassifier?: ReportClassifier | null
}

// ---- Recipe CARD shapes ----
// The recipe LIST/read endpoints don't return the full `RecipeType` doc — the
// server projects a lean card shape (see `server/util/recipeFields.js`'s
// PUBLIC_RECIPE_CARD_FIELDS and the SAVED/CREATED projections in
// `server/routes/users.js`). Typing those methods as `RecipeType` over-promised:
// detail fields (`ingredients`/`instructions`/`nutritionData`/`description`/
// `userId`/`createdAt`/…) are absent at runtime, yet a component reaching for one
// would still compile. These three card types mirror the three server
// projections exactly, so a card consumer that reads a non-projected field now
// fails to compile instead.

// Fields present on every card projection (browse, saved, created, profile).
type RecipeCardBase = {
  _id: string
  title: string
  recipeImage: string
  totalTime: number
  servingPrice: number | null
  rating: RatingAggregate
}

// The public card — PUBLIC_RECIPE_CARD_FIELDS. Shared by browse (`GET /recipes`),
// the home trending / For-You / random rows, and the public-profile tiles.
export type RecipeCardType = RecipeCardBase & {
  cuisine: string
  mealTypes: string[]
  nutritionLabels: string[] | null
  numTimesSaved: number
}

// The Saved-grid card — SAVED_CARD_PROJECTION. base + cuisine (no meal/diet tags
// or save count: the saved grid's `RecipeCard` renders neither).
export type SavedRecipeCardType = RecipeCardBase & {
  cuisine: string
}

// The "My Recipes" thumbnail card — CREATED_CARD_PROJECTION. base + the created
// date and the views/saves/made performance strip.
export type CreatedRecipeCardType = RecipeCardBase & {
  createdAt: string
  views: number
  numTimesSaved: number
  numTimesMade: number
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
  // Diet/health tags the author selects manually (e.g. VEGAN, GLUTEN_FREE).
  // Drives the recipes-page diet filter. Empty array = no diet tags. Previously
  // derived from Edamam; now author-supplied so the values are accurate.
  nutritionLabels: string[]
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
  nutritionLabels?: string[]
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
        // Set only for a rate-limited lookup (server 429, code RATE_LIMITED):
        // 'code' lets the UI branch on it instead of string-matching the
        // message, 'retryAt' (epoch ms, from the server's Retry-After header)
        // is when a retry is likely to succeed.
        code?: string
        retryAt?: number
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

// GET /api/recipes (browse) returns only these two keys — the earlier
// `page`/`filters`/`entries_per_page` were never sent by the server.
export interface RecipeDBResponseType {
  recipeList: RecipeCardType[]
  total_results: number
}
export interface RecipeSearchResponseType {
  _id: string
  title: string
  recipeImage: string
  totalTime: number
  rating: RatingAggregate
  servingPrice: number
  nutritionLabels: string[]
  servings: number
}
export type OptionalReviewType = {
  _id: string
  username: string
  recipeId: string
  // A ratings doc holds a star rating, a written review, or both — review-only
  // docs carry null here (the server writes numbers, never strings).
  rating: number | null
  ratingLastUpdated: string
  // Transitional (V5 cutover): numeric epoch-ms on new writes, string on
  // pre-migration docs; '' = no review yet.
  reviewCreatedAt?: string | number
  reviewLastUpdated?: string | number
  reviewText?: string
  recipeTitle?: string
  recipeImage?: string
}
export type ReviewType = {
  _id: string
  // The reviewer's stable Firebase uid is used server-side as the identity join
  // key but is NEVER serialized to callers (audit M1: it was a username→uid
  // oracle). The public handle is `username`; `displayName` the optional visible
  // name; `isCurrentUser` the rename-proof "this review is mine" signal. Kept
  // optional only so legacy callers don't break — it is not present at runtime.
  userId?: string
  username: string
  recipeId: string
  rating: number | null
  ratingLastUpdated: string
  // Transitional (V5 cutover): numeric epoch-ms on new writes, string on
  // pre-migration docs; '' = no review yet.
  reviewCreatedAt: string | number
  reviewLastUpdated: string | number
  reviewText: string
  photoURL: string | null
  displayName: string | null
  // Derived server-side from the verified token on GET /getReviews (absent on
  // anonymous requests) — the rename-proof "this review is mine" signal.
  isCurrentUser?: boolean
}

// GET /checkIfReviewed — the signed-in user's own ratings doc, raw (no
// photoURL/displayName enrichment; the client already knows its own identity).
// `reviewed: false` comes back with no doc fields at all.
export type OwnReviewStatus = {
  reviewed: boolean
  _id?: string
  userId?: string
  username?: string
  recipeId?: string
  rating?: number | null
  ratingLastUpdated?: string
  reviewText?: string
  // Transitional (V5 cutover): numeric epoch-ms on new writes, string on
  // pre-migration docs; '' = no review yet.
  reviewCreatedAt?: string | number
  reviewLastUpdated?: string | number
}

export interface NewReviewType {
  recipeId: string
  reviewText: string
}

// ─── Moderation / reports ──────────────────────────────────────────────────
// 'user' targets a whole profile (reported from the public profile page) and,
// like 'review', carries `reportedUsername`; unlike recipe/review it has no
// `recipeId`.
export type ReportTargetType = 'recipe' | 'review' | 'user'
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'offensive'
  | 'copyright'
  | 'dangerous'
  // Recipe-only: wrong ingredient amounts, bad price estimate, etc. The server
  // rejects it on review/user targets; the UI only offers it for recipes.
  | 'incorrect_info'
  | 'other'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface NewReportType {
  targetType: ReportTargetType
  // Required for 'recipe' / 'review'; omitted for a 'user' report.
  recipeId?: string
  reportedUsername?: string // required when targetType === 'review' or 'user'
  reason: ReportReason
  details?: string
}

// Classifier snapshot stamped onto an automated (source: 'automod') report by
// holdRecipeForReview, so the admin queue can show WHY the system held it.
export interface ReportClassifier {
  severity: 'clean' | 'medium' | 'high'
  category: string | null
  // Confidence as a 0–1 probability (openai medium holds). null when the source
  // has no probabilistic score (e.g. Vision likelihood buckets). Optional because
  // reports filed before this field existed don't carry it — formatClassifier
  // falls back to parsing the legacy score embedded in `reason`.
  score?: number | null
  // e.g. 'openai:harassment:0.60'. Medium holds are openai-only (blocklist hits
  // are always high-blocked, never held), so this never carries raw user content.
  reason: string | null
  source: string | null
}

export interface ReportType {
  _id: string
  targetType: ReportTargetType
  // Present on recipe/review reports; absent on user reports.
  recipeId?: string
  reportedUsername?: string
  reporterUid: string
  reason: ReportReason
  details: string
  status: ReportStatus
  createdAt: string
  resolvedBy?: string
  resolvedAt?: string
  // Present only on machine-filed reports. User reports leave these undefined.
  source?: 'automod'
  classifier?: ReportClassifier
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
  | 'recipe.approve'
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
  // Automated moderation actions (system actor).
  | 'recipe.autohold'
  | 'content.blocked'

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
  // 'system' marks an automated (non-human) action — autohold, content.blocked.
  // 'user' marks a self-service action (the user acting on their own account,
  // e.g. account deletion). 'admin' (or absent, for legacy rows) is a human admin.
  actorType?: 'admin' | 'system' | 'user'
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

// Ingredient-enrichment telemetry (N6 + N1 outlier guard). Mirrors the
// `ingredientMisses` docs written best-effort by POST /api/ingredients/parse
// and listed read-only by GET /admin/ingredients.
export type IngredientMissType = 'miss' | 'price_outlier'

export interface IngredientMissItem {
  _id: string
  type: IngredientMissType
  normalized: string
  raw: string
  count: number
  firstSeen: string
  lastSeen: string
  // price_outlier only: the matched ingredient name + the offending price (cents).
  name?: string
  priceCents?: number
}

export interface IngredientMissesResponse {
  items: IngredientMissItem[]
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
  // Automated-moderation activity (all-time). Optional: a stale/partial payload
  // (older server, truncated response) must not crash the admin Overview — the
  // consumer reads it with `?.x ?? 0`.
  moderation?: {
    autoHeld: number // recipes the classifier held for review (recipe.autohold)
    autoBlocked: number // writes refused outright (content.blocked)
    autoFlagsDismissed: number // automod reports an admin dismissed (flags cleared, not content restored)
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

// A user-defined folder over the saved-recipes list (GET /collections). `count`
// and `coverRecipeId` are derived server-side from membership, so they always
// match the master saved list.
export type RecipeCollection = {
  id: string
  name: string
  createdAt: string
  count: number
  coverRecipeId: string | null
  // Resolved server-side from coverRecipeId (the most-recently-saved member);
  // null when the collection is empty or its cover recipe is hidden/removed.
  coverImage: string | null
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
  recipes: RecipeCardType[]
  recipesTotalCount: number
  // Cross-recipe sums over the user's publicly-visible recipes (not just the
  // initial `recipes` batch), used for the header Saves/Made counts.
  recipesSavesTotal: number
  recipesMadeTotal: number
}
