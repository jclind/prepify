// Single source of truth for the soft-hide visibility predicates.
//
// IMPORTANT: these are written as "exclude only what is explicitly hidden"
// ($ne), NOT "include only active". Every recipe/review created before this
// feature shipped has NO moderation field at all, so a `status: 'active'` style
// filter would hide the entire existing catalog on first deploy. $ne matches
// docs where the field is absent, hidden=false, or status!='hidden'.
//
// Merge these into an existing query object by spreading, e.g.
//   collection.find({ ...someFilter, ...RECIPE_VISIBLE })
// The keys (`status` / `moderationHidden`) never collide with query fields used
// elsewhere, so the spread ANDs cleanly.

// Recipes: hidden via `status: 'hidden'` (enum leaves room for P2 states like
// 'unpublished' / 'featured' without another migration).
const RECIPE_VISIBLE = { status: { $ne: 'hidden' } }

// Reviews live in the `ratings` collection and are hidden via a distinct
// `moderationHidden` flag — kept separate from the user's own delete (which
// blanks reviewText) so a takedown is reversible and auditable.
const REVIEW_VISIBLE = { moderationHidden: { $ne: true } }

module.exports = { RECIPE_VISIBLE, REVIEW_VISIBLE }
