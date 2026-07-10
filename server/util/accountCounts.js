// Aggregate item counts for a user's account.
//
// There are two consumers with DIFFERENT correct semantics, so there are two
// entry points:
//
//  • getAccountCountsFor      → the account-page tab badges. Each count should
//    match the length of the list its tab renders. `saved` counts only saved
//    recipes that are still publicly visible, matching the Saved tab's own
//    totalCount (server/routes/users.js): a soft-hidden saved recipe drops from
//    the list, so counting it in the badge left the badge reading higher than
//    the grid it sits on.
//
//  • getGamificationCountsFor → XP / level / achievements. These must reflect
//    real, still-visible accomplishments so awards don't overstate, CAN be
//    revoked when content is taken down, and can't leak the existence of a
//    held/hidden recipe through a level or achievement on a public profile:
//      - recipes: only publicly-published recipes (RECIPE_VISIBLE) count toward
//        "Published N recipes"; hidden / unpublished / pending_review do not.
//      - ratings: only actual written, non-hidden reviews count toward "Left N
//        reviews"; a star-only rating (empty reviewText) is not a review.
//      - saved:   only still-visible saved recipes.
//
// Everything keys on the stable uid (ratings carry `userId` since D1), so no
// username round-trip is needed.

const { RECIPE_VISIBLE, REVIEW_VISIBLE } = require('./moderation')
const { recipeIdInQuery } = require('./recipeIdQuery')

// Count the user's saved recipes whose underlying recipe is still publicly
// visible. Mirrors the Saved-tab totalCount: pull the saved ids, then count the
// visible ones by an indexed _id $in (no doc bodies fetched).
async function countVisibleSaved(db, uid) {
  const doc = await db
    .collection('userRecipeData')
    .findOne({ _id: uid }, { projection: { savedRecipes: 1 } })
  const ids = (doc?.savedRecipes ?? []).map((e) => e.recipeId)
  if (ids.length === 0) return 0
  return db
    .collection('recipes')
    .countDocuments({ ...recipeIdInQuery(ids), ...RECIPE_VISIBLE })
}

// Tab-badge counts: { saved, ratings, recipes, drafts }. `saved` is
// visibility-filtered to match the Saved tab list; 0 where the user has none.
async function getAccountCountsFor(db, uid) {
  const [saved, recipes, drafts, ratings] = await Promise.all([
    countVisibleSaved(db, uid),
    db.collection('recipes').countDocuments({ userId: uid }),
    db.collection('recipeDrafts').countDocuments({ userId: uid }),
    db.collection('ratings').countDocuments({ userId: uid }),
  ])

  return { saved, ratings, recipes, drafts }
}

// Gamification counts: { saved, ratings, recipes } — see the module header for
// why each is filtered. Drafts earn no XP and gate no achievement, so they are
// omitted (computeGamification / computeXp never read `drafts`).
async function getGamificationCountsFor(db, uid) {
  const [saved, recipes, ratings] = await Promise.all([
    countVisibleSaved(db, uid),
    db.collection('recipes').countDocuments({ userId: uid, ...RECIPE_VISIBLE }),
    db.collection('ratings').countDocuments({
      userId: uid,
      // A real, still-public review: has body text and isn't moderation-hidden.
      reviewText: { $exists: true, $nin: ['', null] },
      ...REVIEW_VISIBLE,
    }),
  ])

  return { saved, ratings, recipes }
}

module.exports = { getAccountCountsFor, getGamificationCountsFor }
