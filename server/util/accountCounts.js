// Aggregate item counts for a user's account (saved, ratings, recipes, drafts).
// Shared by GET /getAccountCounts (the account-page tabs) and the gamification
// engine, which derives XP / level / achievements from these same counts.

// Returns { saved, ratings, recipes, drafts } for the given uid. All real
// counts; 0 where the user has none.
async function getAccountCountsFor(db, uid) {
  // Ratings live in the `ratings` collection keyed by username (there is no uid
  // on a rating), so resolve the caller's username first. A user with no
  // username yet simply has 0 ratings.
  const usernameDoc = await db.collection('usernames').findOne({ _id: uid })
  const username = usernameDoc?.username

  const [savedAgg, recipes, drafts, ratings] = await Promise.all([
    // Count saved recipes with $size so Mongo returns just the length rather
    // than transferring the whole savedRecipes array to count it in Node.
    db
      .collection('userRecipeData')
      .aggregate([
        { $match: { _id: uid } },
        {
          $project: {
            _id: 0,
            count: { $size: { $ifNull: ['$savedRecipes', []] } },
          },
        },
      ])
      .toArray(),
    db.collection('recipes').countDocuments({ userId: uid }),
    db.collection('recipeDrafts').countDocuments({ userId: uid }),
    username
      ? db.collection('ratings').countDocuments({ username })
      : Promise.resolve(0),
  ])

  return {
    saved: savedAgg[0]?.count ?? 0,
    ratings,
    recipes,
    drafts,
  }
}

module.exports = { getAccountCountsFor }
