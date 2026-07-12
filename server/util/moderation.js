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

// Recipes: non-public via the `status` enum. 'hidden' = a moderation takedown
// (reported/policy); 'unpublished' = an admin de-publish that is deliberately
// NOT framed as a moderation action; 'pending_review' = an automated-moderation
// hold (owner + moderator can see it, the public cannot) awaiting a human clear.
// All three are filtered from every PUBLIC read path identically; they differ
// only in intent and which field is stamped. $nin (not $eq 'active') keeps this
// legacy-safe — a doc with no status field isn't matched, so the existing catalog
// stays visible on deploy.
const RECIPE_VISIBLE = { status: { $nin: ['hidden', 'unpublished', 'pending_review'] } }

// Owner-facing variant: the author still sees their own 'pending_review' recipe
// (e.g. in their created list / own recipe view) while it is withheld from every
// public surface above. 'hidden'/'unpublished' remain excluded even for the owner.
// Use this ONLY on reads already scoped to the owning user (userId === req.uid).
const RECIPE_OWNER_VISIBLE = { status: { $nin: ['hidden', 'unpublished'] } }

// Reviews live in the `ratings` collection and are hidden via a distinct
// `moderationHidden` flag — kept separate from the user's own delete (which
// blanks reviewText) so a takedown is reversible and auditable.
const REVIEW_VISIBLE = { moderationHidden: { $ne: true } }

module.exports = { RECIPE_VISIBLE, RECIPE_OWNER_VISIBLE, REVIEW_VISIBLE }
