// Mongo-side teardown of a single recipe, run inside a transaction `session`.
// Removes the recipe document, its ratings/reviews, and EVERY reference to it in
// users' saved / made / created lists — so deleting a recipe never leaves
// other users' reviews orphaned or their saved cards pointing at a 404.
//
// Shared by DELETE /deleteRecipe and the POST /deleteAccount cascade so the two
// paths can't drift (the cascade previously did a naive recipes.deleteMany and
// skipped all of this). The recipe's Storage image is an EXTERNAL side effect
// and is intentionally NOT handled here — the caller deletes it (best-effort)
// after the transaction commits, keeping this function purely transactional.
//
// `recipe` is the already-fetched recipe document. References elsewhere (ratings
// .recipeId, savedRecipes[].recipeId, …) are stored as the recipe id's STRING
// form, which `String(recipe._id)` yields whether _id is a native ObjectId
// (post-migration) or a legacy string.
async function teardownRecipeDocs(db, recipe, session) {
  const recipeId = String(recipe._id)
  await db.collection('recipes').deleteOne({ _id: recipe._id }, { session })
  await db.collection('ratings').deleteMany({ recipeId }, { session })
  await db.collection('userRecipeData').updateMany(
    {},
    {
      $pull: {
        savedRecipes: { recipeId },
        madeRecipes: { recipeId },
        userRecipes: { recipeId },
      },
    },
    { session }
  )
}

module.exports = { teardownRecipeDocs }
