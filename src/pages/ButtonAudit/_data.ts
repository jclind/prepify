// TEMPORARY — data for the /button-audit review page. Deleted (with
// ButtonAudit.tsx) before the PR opens; never ships. See docs/design/
// button-hover-audit.md for the shipped hover-motion work this audits against.
//
// Compiled from a full-app sweep of every clickable (buttons, links, styled
// divs, toggles) across the navbar, Home, /recipes, single-recipe, add/edit,
// account, settings, public profile, auth, and company/legal pages. Base +
// hover are read straight from the SCSS; token values resolved from helpers.scss.

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'ok'

export type Family =
  | 'Primary fill'
  | 'Outline'
  | 'Ghost'
  | 'Danger'
  | 'Text link'
  | 'Icon-only'
  | 'Chip / toggle'
  | 'Card'
  | 'Nav / segmented'
  | 'Load more'
  | 'Select / combobox'
  | 'Other'

export interface Clickable {
  name: string
  surface: string
  loc: string
  element: string
  label: string
  icon: string // "none" | "left: X" | "right: X" | "icon-only: X"
  family: Family
  base: string
  hover: string
  outlier: Severity
  why?: string
}

// ── Canonical reference: the shipped .btn language (renders live on the page) ──
export const CANON = [
  { cls: 'btn btn--primary', label: 'Primary', note: 'orange fill · brighten 1.06 + lift −2px + brand glow' },
  { cls: 'btn btn--outline', label: 'Outline', note: 'white · border→ink + lift −2px + elevation-2' },
  { cls: 'btn btn--ghost', label: 'Ghost', note: 'transparent · colour only, stays flat' },
  { cls: 'btn btn--danger', label: 'Danger', note: 'red outline → red fill + lift + danger glow' },
  { cls: 'btn btn--danger-solid', label: 'Danger solid', note: 'red fill → DARKER red + lift + danger glow' },
]

// ── Ranked systemic findings (the designer's critique) ───────────────────────
export interface Finding {
  severity: Severity
  title: string
  peers: string
  offender: string
  recommend: string
  refs: string
}

export const FINDINGS: Finding[] = [
  {
    severity: 'critical',
    title: '“Load more” exists as three different components',
    peers:
      'The /recipes grid load-more is a real pill: outline → turns orange, lifts −2px, gains a brand glow, carries a chevron.',
    offender:
      'The global .load-more-btn (Saved, Ratings, Your Recipes, Public Profile) is a 250×45 near-square box with a grey→grey border hover, no orange, no glow. The reviews “More Reviews” button is a .btn--ghost whose only hover is an underline — no colour, no lift, no icon. Three separate definitions of the same control (index.scss, Recipes.scss, RatingsAndReviews.scss).',
    recommend:
      'Collapse all “load more” onto one treatment (the /recipes pill is the strongest candidate). Normalise the label grammar too — currently “Load More Recipes”, “Load More Reviews”, and lowercase “Load more recipes” all coexist.',
    refs: 'index.scss:229 · Recipes.scss:238 · RatingsAndReviews.scss:207',
  },
  {
    severity: 'critical',
    title: 'The primary CTA is hand-built in six places',
    peers:
      'The design system ships one orange CTA: .btn--primary (fill + brighten 1.06 + lift + $shadow-brand).',
    offender:
      '.about-btn-primary (always-on $shadow-brand-strong, not hover-only), .empty-state__cta (not even on the .btn base), Home’s .primary, the summary-bar .submit-btn (text colour #eee, not white), and the draft .resume (brighten + glow but never lifts) each redeclare the orange CTA and quietly drift on shadow, text colour, and whether they lift.',
    recommend:
      'Route every orange CTA through .btn--primary. Delete the bespoke copies; where a size differs, add a size modifier rather than a new class.',
    refs: 'About.scss:70 · EmptyState.scss:46 · HomeCookSuggestion.scss:119 · AddRecipeSummaryBar.scss:109 · Drafts.scss:124',
  },
  {
    severity: 'high',
    title: 'Two hover “languages” never reconciled: .btn Lift vs the navbar dialect',
    peers:
      'Everything on the .btn system lifts −2px, eases every property over one 0.15s token, and lightens fills with brightness(1.06).',
    offender:
      'Every navbar control speaks a different dialect: no lift, no shadow, 0.12s linear, and either an opacity/colour shift or a hard-coded brightness(1.07). The nav CTAs are pill-shaped “to match” the system but share none of its motion — they read as a separate component family.',
    recommend:
      'Decide whether the nav is deliberately its own system (defensible) — and if so, document that boundary. If not, adopt the shared timing + lift on the nav CTAs.',
    refs: 'DesktopNav.scss · NavMenu.scss',
  },
  {
    severity: 'high',
    title: 'Fill-on-hover runs in two opposite directions',
    peers:
      'The orange primary fill LIGHTENS on hover (brightness 1.06 — the shipped decision).',
    offender:
      '.btn--danger-solid DARKENS on hover (swaps to $error-red-hover). So the two solid fills in the same system move in opposite tonal directions on the same gesture. Separately, three “brighten” magnitudes exist for the identical gesture: canonical 1.06 vs 1.07 on both signup CTAs and the nav Create button.',
    recommend:
      'Pick one fill-hover direction (lighten) and one magnitude ($hover-brighten). If danger must darken, treat that as an explicit, documented exception.',
    refs: 'index.scss:208 · DesktopNav.scss:254 · NavMenu.scss:226',
  },
  {
    severity: 'high',
    title: 'Primary CTAs and drawer controls that give NO hover feedback',
    peers: 'Every surfaced button in the system responds to the cursor (colour and/or lift + shadow).',
    offender:
      'The filters drawer’s “Show recipes” apply — a solid orange primary CTA — has no hover rule at all. So do the drawer Reset, the drawer close ✕, the active filter chips, “Clear all”, both modal close ✕ buttons, the settings toggle switches, the Prepify logo, the Beta tag, and the account-menu trigger. Several are high-traffic primary controls whose only affordance is the cursor.',
    recommend:
      'Give every actionable control a hover state. The drawer apply especially should read like any other .btn--primary.',
    refs: 'Recipes.scss:432/423/389 · Recipes.scss:203/214 · DesktopNav.scss:270 · controls.scss:143',
  },
  {
    severity: 'high',
    title: 'Focus-visible is missing on entire input + control families',
    peers: 'The global button/a rules add a focus ring, and .btn inherits it.',
    offender:
      'The compact FormInput variant (every AddRecipe field: title, servings, times, ingredient/instruction entry, inline edits) has no focus ring; the description textarea sets outline:none with no replacement (a WCAG failure); drag-handle divs are non-focusable with no ring; and RatingsAndReviews.scss carries stale :focus-visible selectors targeting star markup that no longer exists.',
    recommend:
      'Add a visible focus indicator to the compact input variant and the textarea; make reorder handles real, focusable controls; delete the dead star-focus CSS.',
    refs: 'FormInput.scss · RecipeFormTextArea.scss:24 · IngredientList.scss:27 · RatingsAndReviews.scss:61',
  },
  {
    severity: 'high',
    title: 'react-select brand hover is silently a no-op',
    peers: 'Brand controls hover to an orange border.',
    offender:
      'The cuisine / meal-type / diet selectors set control hover to { borderColor: \'primary\' } — a literal string that is not a valid CSS colour, so the intended orange border never renders. The three customStyles objects are copy-pasted, so the bug is tripled.',
    recommend:
      'Use the real token value (or a shared style object) so the hover actually paints; dedupe the three customStyles blocks.',
    refs: 'CuisineSelector.tsx · MealTypeSelector.tsx · DietSelector.tsx',
  },
  {
    severity: 'medium',
    title: 'Selection-state active colour disagrees between the two nav rails',
    peers: '“You are here” should read the same everywhere.',
    offender:
      'The account SegmentedNav marks the active tab ORANGE ($primary on a 10% orange tint); the Settings section nav marks active TEAL (#006065 on a secondary tint). Moving from Account to Settings, the selected-state hue flips.',
    recommend: 'Choose one active-selection colour for segmented navigation and apply it to both rails.',
    refs: 'Account.scss:282 · Settings.scss:34',
  },
  {
    severity: 'medium',
    title: 'Inline text links use three different colours for one role',
    peers: 'An inline text link is a single role and should read as one colour.',
    offender:
      'Auth/Help links are teal #00adb5; the 404 support link is teal #00787e (a visibly different shade); legal-body links are orange #ff5722. Three colours for “inline text link”, two of them near-identical teals on white.',
    recommend: 'Standardise inline link colour to one token; if legal pages want orange, make that a deliberate, documented variant.',
    refs: 'FormStyles.scss:144 · 404.scss:88 · LegalDocument.scss:78',
  },
  {
    severity: 'medium',
    title: 'The Filters toolbar shows three hover languages side by side',
    peers: 'Adjacent controls in one toolbar should share a hover language.',
    offender:
      'Filters (outline) hovers colour-only with no lift; the Sort trigger beside it hovers to a different neutral border ($tertiary-text) with no lift; the Search submit is an orange .btn--primary that lifts + glows. Three pills, three behaviours, one row.',
    recommend: 'Give Filters + Sort the same outline hover; decide whether the toolbar wants lift at all and apply it uniformly.',
    refs: 'Recipes.scss:88 · Recipes.scss:132',
  },
  {
    severity: 'medium',
    title: 'Destructive actions have no single vocabulary',
    peers:
      'The Danger-zone delete does it right: red outline → red fill + danger glow, clearly destructive at rest.',
    offender:
      'Collection Delete is a ghost visually identical to Rename until hover, then shifts to a hard-coded #c0392b (not $error-red). Draft Delete reads neutral grey at rest, red only on hover. Desktop logout hovers RED; mobile logout hovers ORANGE for the same action. No consistent “this is destructive” signal.',
    recommend: 'Adopt one destructive treatment (the .btn--danger family) and one red token; make logout read the same on both surfaces.',
    refs: 'SavedRecipes.scss:320 · Drafts.scss:147 · DesktopNav.scss:443 · NavMenu.scss:185',
  },
  {
    severity: 'medium',
    title: '“Save” hovers two different ways depending on surface',
    peers: 'One control should behave the same wherever it appears.',
    offender:
      'On the recipe card the save chip SCALES (1.08) and uses the identical hover for saved and unsaved (both go orange) — a saved card gives no distinct saved-hover cue. On the action bar the same control LIFTS and correctly differentiates (orange glow unsaved vs teal glow saved).',
    recommend: 'Unify the save control’s hover across surfaces and preserve the saved/unsaved distinction in both.',
    refs: 'RecipeCard.scss:79 · SingleRecipe.scss:206',
  },
  {
    severity: 'medium',
    title: 'System class names shadowed by look-alikes',
    peers: 'The system ships .btn--primary and .btn--ghost with defined behaviours.',
    offender:
      'Home’s modal defines local .primary (sidesteps .btn--primary) and .ghost that is actually a solid GREY FILL, not the transparent system ghost. These shadow the BEM variants and give different hovers, fragmenting the system by name collision.',
    recommend: 'Rename or remove the look-alike classes; compose the real variants.',
    refs: 'HomeCookSuggestion.scss:119/128',
  },
  {
    severity: 'medium',
    title: 'Recipe links open two ways; “See all” appears in two forms',
    peers: 'The same semantic object should get the same affordance.',
    offender:
      'A recipe link is a −4px card lift in the grid, but a warm background chip (#fbf7f2, one-off 0.12s) in the Home meal columns. And “See all” is chevron + $text-base in section headers vs chevron-less + $text-sm in the meal columns.',
    recommend: 'Pick one recipe-link hover and one “See all” treatment.',
    refs: 'Home.scss:80 · Home.scss:145 · Home.scss:45/138',
  },
  {
    severity: 'medium',
    title: 'The Google sign-in button is a weak, off-brand one-off',
    peers: 'Secondary CTAs use .btn--outline (border + lift + shadow).',
    offender:
      'The Google button is hand-built (not .btn--outline); its only hover is a #fafafa background wash — no lift, no shadow, no border move — so it feels inert next to the teal submit above it. Its “GoogleColorIcon” is recoloured teal, defeating the recognisable multicolour Google mark.',
    recommend: 'Base it on .btn--outline for consistent hover; restore the true-colour Google mark.',
    refs: 'FormStyles.scss:254',
  },
  {
    severity: 'low',
    title: 'Bespoke fills opt out of the lift silently',
    peers: 'Surfaced .btn variants rise −2px on hover.',
    offender:
      'Several filled/outline buttons (acct-edit, am-close, collection Rename/Delete, and the prominent draft Resume CTA) brighten and/or glow but never lift, because their local transition lists omit transform.',
    recommend: 'Include transform in the transition (or compose the variant) so like buttons move alike.',
    refs: 'Account.scss:215 · AchievementsModal.scss:37 · Drafts.scss:124',
  },
  {
    severity: 'low',
    title: 'Hard-coded hexes and off-scale radii bypass the token system',
    peers: 'Colours come from the palette tokens; radii from the $radius-* scale.',
    offender:
      'Row hover #fbf7f2, modal ghost greys #f0f1f3/#e4e6e9, destructive #c0392b, teal literals #006065/#057780, radius 7px (ingr/instr remove) and 5px (Beta tag), and $primary-background (#eee) used as a button TEXT colour all sit off the token system.',
    recommend: 'Replace with tokens; add scale entries if a value is genuinely needed.',
    refs: 'Home.scss:154 · HomeCookSuggestion.scss · IngredientList.scss:161 · Navbar.scss:162',
  },
  {
    severity: 'low',
    title: 'The image dropzone is not a real control',
    peers: 'Actionable elements are buttons/links with keyboard + focus.',
    offender:
      'The AddRecipe image picker is a div with onClick — no role="button", no keyboard handler, no focus style, and raw off-token hex (#f0f0f0/#ccc/#666). Keyboard users can’t add an image. Its remove-X carries a dead .option-btn class with no CSS.',
    recommend: 'Make the dropzone a real button (or add role + key handlers + focus ring); drop the dead class.',
    refs: 'ImagePicker.tsx:104',
  },
  {
    severity: 'low',
    title: 'Contrast debt is real but owner-deferred',
    peers: 'White text on a fill should clear WCAG AA (4.5:1).',
    offender:
      '$primary-accessible is currently aliased back to the vivid $primary (#ff5722), so every white-on-orange fill (~3.6:1) and every small orange text link/chip fails AA today. Documented in helpers.scss as the pending brand-orange recolor.',
    recommend:
      'Out of scope for a hover/consistency pass — but once the accessible orange lands, re-check that $hover-brighten doesn’t dip a passing fill back below AA.',
    refs: 'helpers.scss:26',
  },
]

// ── Full inventory ───────────────────────────────────────────────────────────
// outlier: how likely this control is an outlier vs its family peers.
export const INVENTORY: Clickable[] = [
  // —— Navbar / global system ——
  { name: '.btn--primary (system)', surface: 'System', loc: 'index.scss:164', element: '.btn variant', label: '—', icon: 'either', family: 'Primary fill', base: 'orange #ff5722 fill, white text, pill', hover: 'brighten 1.06 + lift −2px + $shadow-brand', outlier: 'ok', why: 'The canonical orange CTA.' },
  { name: '.btn--outline (system)', surface: 'System', loc: 'index.scss:176', element: '.btn variant', label: '—', icon: 'either', family: 'Outline', base: 'white, grey-400 border, ink text, pill', hover: 'border→ink + lift −2px + elevation-2', outlier: 'ok' },
  { name: '.btn--ghost (system)', surface: 'System', loc: 'index.scss:187', element: '.btn variant', label: '—', icon: 'either', family: 'Ghost', base: 'transparent, secondary-text', hover: 'colour→ink only (flat)', outlier: 'ok', why: 'Deliberately the flat member.' },
  { name: '.btn--danger (system)', surface: 'System', loc: 'index.scss:196', element: '.btn variant', label: '—', icon: 'either', family: 'Danger', base: 'white, red border+text', hover: 'red fill + lift + $shadow-danger', outlier: 'ok' },
  { name: '.btn--danger-solid (system)', surface: 'System', loc: 'index.scss:208', element: '.btn variant', label: '—', icon: 'either', family: 'Danger', base: 'red fill, white text', hover: 'DARKER red + lift + glow', outlier: 'medium', why: 'Only fill that darkens; primary lightens.' },
  { name: 'Global .load-more-btn', surface: 'Global', loc: 'index.scss:229', element: 'button', label: 'Load More…', icon: 'none', family: 'Load more', base: '250×45 near-square, grey-400 border, $text-xl', hover: 'border→tertiary + lift + elevation-2', outlier: 'critical', why: 'One of three load-more definitions; no brand cue.' },
  { name: 'Prepify logo', surface: 'Navbar', loc: 'PrepifyLogo.tsx:14', element: 'NavLink', label: 'Prepify', icon: 'none', family: 'Text link', base: 'italic 700 orange wordmark', hover: 'NONE (colour flips by nav state only)', outlier: 'high', why: 'Primary brand link with zero hover.' },
  { name: 'Beta tag', surface: 'Navbar', loc: 'PrepifyLogo.tsx:17', element: 'button', label: 'Beta', icon: 'none', family: 'Chip / toggle', base: 'teal fill, white, 5px radius, breathing animation', hover: 'NONE', outlier: 'high', why: 'Animates forever but no hover; off-scale radius.' },
  { name: 'Hamburger', surface: 'Navbar', loc: 'Navbar.tsx:58', element: 'button (lib)', label: 'aria: menu', icon: 'icon-only: bars', family: 'Icon-only', base: '3rd-party hamburger-react, 40px', hover: 'library internal', outlier: 'low' },
  { name: 'Recipes link', surface: 'Navbar', loc: 'DesktopBar.tsx:58', element: 'NavLink', label: 'Recipes', icon: 'left: Recipes', family: 'Nav / segmented', base: 'muted var, 600, 0.12s', hover: 'opacity 1 + colour→accent (orange)', outlier: 'medium', why: 'Nav dialect, not .btn Lift.' },
  { name: 'Create Recipe', surface: 'Navbar', loc: 'DesktopBar.tsx:63', element: 'NavLink', label: 'Create Recipe', icon: 'left: PlusCircle', family: 'Outline', base: 'outlined neutral pill (quiet skin)', hover: 'bg var + border→text (brightness 1.07 base)', outlier: 'medium', why: 'Bespoke vs .btn; 1.07 brighten drift.' },
  { name: 'Log in CTA (desktop)', surface: 'Navbar', loc: 'DesktopBar.tsx:17', element: 'NavLink', label: 'Log in', icon: 'none', family: 'Outline', base: 'transparent, 2px border, pill', hover: 'border+colour→accent', outlier: 'low', why: 'Dead is-active class wired, no rule.' },
  { name: 'Sign up CTA (desktop)', surface: 'Navbar', loc: 'DesktopBar.tsx:25', element: 'NavLink', label: 'Sign up', icon: 'none', family: 'Primary fill', base: 'orange fill (accessible token), pill', hover: 'brightness 1.07 (no lift/shadow)', outlier: 'medium', why: '1.07 ≠ canonical 1.06; no lift.' },
  { name: 'Saved bookmark', surface: 'Navbar', loc: 'DesktopBar.tsx:83', element: 'NavLink', label: 'aria: Saved', icon: 'icon-only: Bookmark', family: 'Icon-only', base: '42px circle, muted', hover: 'bg var + colour→text', outlier: 'low' },
  { name: 'Account menu trigger', surface: 'Navbar', loc: 'DesktopAccountMenu.tsx:81', element: 'button', label: 'aria: Account', icon: 'icon-only: avatar+caret', family: 'Icon-only', base: 'avatar 42px + chevron', hover: 'NONE (caret rotates on open only)', outlier: 'high', why: 'Primary control, no hover feedback.' },
  { name: 'Account dropdown links ×4', surface: 'Navbar', loc: 'DesktopAccountMenu.tsx:117', element: 'NavLink', label: 'Account / Your recipes / Settings / Help', icon: 'left: various', family: 'Nav / segmented', base: 'row, 600, ink', hover: 'bg grey-200; active→vivid $primary', outlier: 'low', why: 'Active uses raw $primary, not accessible.' },
  { name: 'Log out (desktop)', surface: 'Navbar', loc: 'DesktopAccountMenu.tsx:125', element: 'button', label: 'Log out', icon: 'left: LogOut', family: 'Danger', base: 'outlined, grey-300, 10px radius', hover: 'border+colour→RED (no fill/lift)', outlier: 'medium', why: 'Bespoke danger; red here, orange on mobile.' },
  { name: 'Menu row ×5 (mobile)', surface: 'Navbar', loc: 'MenuLink.tsx:14', element: 'NavLink', label: 'Home/Recipes/Create/Account/Help', icon: 'left: various', family: 'Nav / segmented', base: 'row, $text-xl, 600', hover: 'bg grey-50; active→orange tint', outlier: 'low' },
  { name: 'Account identity (mobile)', surface: 'Navbar', loc: 'AccountCard.tsx:52', element: 'NavLink', label: 'username + email', icon: 'left: avatar', family: 'Nav / segmented', base: 'tappable row', hover: 'NONE', outlier: 'medium', why: 'Tappable row with no feedback.' },
  { name: 'Log out (mobile)', surface: 'Navbar', loc: 'AccountCard.tsx:76', element: 'button', label: 'Log out', icon: 'left: LogOut', family: 'Danger', base: 'full-width outline, 10px radius', hover: 'border+colour→ORANGE', outlier: 'medium', why: 'Same action as desktop logout but orange, not red.' },
  { name: 'Sign up CTA (mobile)', surface: 'Navbar', loc: 'AccountCard.tsx:39', element: 'NavLink', label: 'Sign up', icon: 'none', family: 'Primary fill', base: 'vivid $primary fill (not accessible token), 10px radius', hover: 'brightness 1.07', outlier: 'high', why: 'Uses vivid orange (worse AA); square vs desktop pill.' },
  { name: 'Log in CTA (mobile)', surface: 'Navbar', loc: 'AccountCard.tsx:32', element: 'NavLink', label: 'Log in', icon: 'none', family: 'Outline', base: 'transparent, 2px border, 10px radius', hover: 'border+colour→accent', outlier: 'low', why: 'Square corners vs desktop pill.' },

  // —— Home ——
  { name: 'What should I cook?', surface: 'Home', loc: 'HomeCookSuggestion.tsx:62', element: 'button.btn', label: 'What should I cook?', icon: 'left: Dice', family: 'Primary fill', base: 'orange fill, resting elevation-2', hover: 'brighten 1.06 + lift + $shadow-brand', outlier: 'ok' },
  { name: 'View all recipes', surface: 'Home', loc: 'Home.tsx:61', element: 'Link', label: 'View all recipes', icon: 'right: Chevron', family: 'Primary fill', base: 'orange fill ($primary), no resting shadow', hover: 'brighten 1.06 + lift + $shadow-brand', outlier: 'low', why: 'Uses $primary vs sibling’s accessible token.' },
  { name: 'See all (section header)', surface: 'Home', loc: 'Home.tsx:47', element: 'Link', label: 'See all', icon: 'right: Chevron', family: 'Text link', base: 'orange 700 $text-base', hover: 'underline only', outlier: 'medium', why: 'Divergent from meal-col See all.' },
  { name: 'See all (meal col ×3)', surface: 'Home', loc: 'HomeBrowseByMeal.tsx:96', element: 'Link', label: 'See all', icon: 'none', family: 'Text link', base: 'orange 700 $text-sm, no chevron', hover: 'underline only', outlier: 'medium', why: 'Smaller + chevron-less twin of header See all.' },
  { name: 'Meal row link', surface: 'Home', loc: 'HomeBrowseByMeal.tsx:17', element: 'Link', label: 'recipe title', icon: 'left: thumb', family: 'Card', base: 'row, ink, radius-lg', hover: 'bg #fbf7f2 chip (0.12s)', outlier: 'medium', why: 'Different hover than the recipe card for same object.' },
  { name: 'Recipe card', surface: 'Home', loc: 'HomeRecipeCard.tsx:17', element: 'Link', label: 'recipe title', icon: 'left: thumb', family: 'Card', base: 'white, elevation-3, radius-2xl', hover: 'lift −4px + elevation-4', outlier: 'ok' },
  { name: 'Modal close', surface: 'Home', loc: 'HomeCookSuggestion.tsx:74', element: 'button.btn--icon', label: 'aria: Close', icon: 'icon-only: X', family: 'Icon-only', base: '30px circle, translucent white', hover: 'bg→solid white only (faint)', outlier: 'medium', why: 'Weakest hover; sub-44 target; shrinks base icon size.' },
  { name: 'Modal View recipe', surface: 'Home', loc: 'HomeCookSuggestion.tsx:99', element: 'Link.primary', label: 'View recipe', icon: 'none', family: 'Primary fill', base: 'local .primary orange fill', hover: 'brighten 1.06 + lift + $shadow-brand', outlier: 'high', why: 'Local .primary shadows .btn--primary.' },
  { name: 'Modal Try another', surface: 'Home', loc: 'HomeCookSuggestion.tsx:102', element: 'button.ghost', label: 'Try another', icon: 'left: Dice', family: 'Other', base: 'local .ghost = GREY FILL (#f0f1f3)', hover: 'bg #e4e6e9 + lift + elevation-2', outlier: 'high', why: '“ghost” is a grey fill; hard-coded greys.' },

  // —— Recipes listing ——
  { name: 'Filters', surface: '/recipes', loc: 'Recipes.scss:88', element: 'button', label: 'Filters (+badge)', icon: 'left: Sliders', family: 'Outline', base: 'outline pill, ink border', hover: 'border+colour→orange (NO lift)', outlier: 'high', why: 'Only outline that refuses to lift; toolbar mismatch.' },
  { name: 'Sort trigger', surface: '/recipes', loc: 'Recipes.scss:132', element: 'button', label: 'Sort: {label}', icon: 'right: Chevron', family: 'Outline', base: 'outline pill, grey-400 border', hover: 'border→tertiary only (NO lift)', outlier: 'medium', why: 'Different neutral hover than Filters beside it.' },
  { name: 'Sort menu item', surface: '/recipes', loc: 'Recipes.scss:172', element: 'button', label: 'option', icon: 'none', family: 'Other', base: 'list row', hover: 'bg grey-200; active orange tint', outlier: 'ok' },
  { name: 'Active filter chip', surface: '/recipes', loc: 'Recipes.scss:203', element: 'button', label: '{value} ✕', icon: 'text ✕', family: 'Chip / toggle', base: 'orange-tint chip', hover: 'NONE', outlier: 'high', why: 'Primary dismiss affordance with no hover; ✕ is text.' },
  { name: 'Clear all', surface: '/recipes', loc: 'Recipes.scss:214', element: 'button', label: 'Clear all', icon: 'none', family: 'Text link', base: 'underlined secondary-text', hover: 'NONE', outlier: 'medium' },
  { name: 'Load more recipes', surface: '/recipes', loc: 'Recipes.scss:238', element: 'button', label: 'Load more recipes', icon: 'right: Chevron', family: 'Load more', base: 'outline pill, min-h 3rem', hover: 'orange border+colour + lift + $shadow-brand', outlier: 'ok', why: 'The strongest load-more; the target treatment.' },
  { name: 'Empty Clear filters', surface: '/recipes', loc: 'Recipes.scss:336', element: 'button', label: 'Clear filters', icon: 'none', family: 'Ghost', base: 'ghost pill, grey border', hover: 'border→orange + lift + elevation-2', outlier: 'low', why: 'A “ghost” that lifts (system ghost stays flat).' },
  { name: 'Empty Browse all', surface: '/recipes', loc: 'Recipes.scss:327', element: 'button', label: 'Browse all recipes', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Drawer close', surface: '/recipes', loc: 'Recipes.scss:389', element: 'button', label: '✕ (aria Close)', icon: 'text ✕', family: 'Icon-only', base: 'bare text ✕', hover: 'NONE', outlier: 'medium' },
  { name: 'Drawer chip', surface: '/recipes', loc: 'Recipes.scss:444', element: 'button', label: 'option', icon: 'none', family: 'Chip / toggle', base: 'grey-400 border pill', hover: 'border+colour→orange; active fill', outlier: 'ok', why: 'Hovers, unlike the active filter chips.' },
  { name: 'Drawer Reset', surface: '/recipes', loc: 'Recipes.scss:423', element: 'button', label: 'Reset', icon: 'none', family: 'Outline', base: 'outline pill', hover: 'NONE', outlier: 'medium' },
  { name: 'Drawer Show recipes', surface: '/recipes', loc: 'Recipes.scss:432', element: 'button', label: 'Show recipes', icon: 'none', family: 'Primary fill', base: 'orange fill, flex:1', hover: 'NONE', outlier: 'high', why: 'Primary CTA with zero hover.' },
  { name: 'Recipe card (grid)', surface: '/recipes', loc: 'RecipeCard.scss:3', element: 'article>a', label: 'recipe', icon: 'left: thumb', family: 'Card', base: 'white, elevation-3, radius-2xl', hover: 'lift −4px + elevation-4', outlier: 'ok' },
  { name: 'Card save bookmark', surface: '/recipes', loc: 'RecipeCard.scss:79', element: 'button', label: 'aria: save', icon: 'icon-only: Bookmark', family: 'Icon-only', base: '2rem chip, translucent white', hover: 'scale 1.08 + colour→orange (same saved/unsaved)', outlier: 'medium', why: 'Scales not lifts; no distinct saved-hover.' },

  // —— Single recipe ——
  { name: 'Back “All recipes”', surface: 'Recipe', loc: 'SingleRecipe.scss:27', element: 'a', label: 'All recipes', icon: 'left: ArrowLeft', family: 'Text link', base: 'secondary-text 700', hover: 'colour→orange', outlier: 'ok' },
  { name: 'Owner Edit', surface: 'Recipe', loc: 'RecipeControls.scss:74', element: 'button.btn', label: 'Edit', icon: 'left: Edit', family: 'Outline', base: 'grey-300 outline pill', hover: 'CHARCOAL fill #303841 (no lift)', outlier: 'high', why: 'Only dark-fill inversion in the app.' },
  { name: 'Owner Delete', surface: 'Recipe', loc: 'RecipeControls.scss:91', element: 'button.btn', label: 'Delete', icon: 'left: Trash', family: 'Danger', base: 'grey-300 outline pill', hover: 'red fill (no lift)', outlier: 'medium', why: 'Danger without the danger-variant lift/glow.' },
  { name: 'Save — unsaved', surface: 'Recipe', loc: 'SingleRecipe.scss:206', element: 'button.btn', label: 'Save', icon: 'left: Bookmark + caret', family: 'Primary fill', base: 'orange fill toggle', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Save — is-saved', surface: 'Recipe', loc: 'SingleRecipe.scss:220', element: 'button.btn', label: 'Saved', icon: 'left: BookmarkFilled + caret', family: 'Primary fill', base: 'teal fill toggle', hover: 'brighten + lift + $shadow-teal', outlier: 'low', why: 'Good state differentiation (vs the card save).' },
  { name: 'Rate', surface: 'Recipe', loc: 'SingleRecipe.scss:199', element: 'button.btn--outline', label: 'Rate / {n}', icon: 'left: Star', family: 'Outline', base: 'outline pill', hover: 'border→ink + lift + elevation-2', outlier: 'ok' },
  { name: 'Print', surface: 'Recipe', loc: 'PrintRecipeBtn.tsx:23', element: 'button.btn--outline', label: 'Print', icon: 'left: Printer', family: 'Outline', base: 'outline pill', hover: 'border→ink + lift + elevation-2', outlier: 'ok' },
  { name: 'Made It', surface: 'Recipe', loc: 'SingleRecipe.scss:468', element: 'button.btn', label: 'Made It', icon: 'none', family: 'Chip / toggle', base: 'teal-tint toggle', hover: 'bg deepens (no lift)', outlier: 'low' },
  { name: 'Servings −/+', surface: 'Recipe', loc: 'SingleRecipe.scss:296', element: 'button', label: 'aria: ± servings', icon: 'icon-only: ±', family: 'Icon-only', base: '32px circle, white', hover: 'bg→orange + white', outlier: 'ok' },
  { name: 'Ingredient row (check)', surface: 'Recipe', loc: 'SingleRecipe.scss:334', element: 'div[role=checkbox]', label: 'ingredient', icon: 'left: check+thumb', family: 'Chip / toggle', base: 'interactive grid row', hover: 'bg primary-background', outlier: 'low', why: 'Div, not button (keyboarded).' },
  { name: 'Tag link', surface: 'Recipe', loc: 'SingleRecipe.scss:448', element: 'a', label: 'tag', icon: 'none', family: 'Chip / toggle', base: 'teal-tint chip link', hover: 'bg deepens', outlier: 'ok' },
  { name: 'Star rating input ×5', surface: 'Recipe', loc: 'StarRating.tsx:86', element: 'button', label: 'aria: Rate n/5', icon: 'icon-only: star', family: 'Icon-only', base: 'reset, 24px', hover: 'JS-only fill preview', outlier: 'low', why: 'Hover via JS, no CSS fallback.' },
  { name: 'More Reviews (load more)', surface: 'Recipe', loc: 'RatingsAndReviews.scss:207', element: 'button.btn--ghost', label: 'More Reviews', icon: 'none', family: 'Load more', base: 'ghost, ink, $text-lg', hover: 'underline only (no colour/lift/shadow)', outlier: 'critical', why: 'Third load-more definition; hovers nothing but underline.' },
  { name: 'Submit Review', surface: 'Recipe', loc: 'AddReview.tsx:69', element: 'button.btn--primary', label: 'Submit Review', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Review Delete (own)', surface: 'Recipe', loc: 'RecipeReview.scss:113', element: 'button.btn--ghost', label: 'Delete', icon: 'none', family: 'Ghost', base: 'ghost link', hover: 'colour→red (bespoke)', outlier: 'low' },
  { name: 'Delete confirm modal', surface: 'Recipe', loc: 'RecipeControls.tsx:139', element: 'button.btn--danger-solid', label: 'Delete Recipe', icon: 'none', family: 'Danger', base: 'red fill', hover: 'darker red + lift + $shadow-danger', outlier: 'ok' },
  { name: 'RecipeNotFound CTA', surface: 'Recipe', loc: 'RecipeNotFound.scss:75', element: 'a', label: 'Browse all recipes', icon: 'none', family: 'Primary fill', base: 'orange fill, radius-lg (NOT pill)', hover: 'brighten + lift + $shadow-brand', outlier: 'medium', why: 'Lone non-pill CTA.' },

  // —— Add / Edit recipe + forms ——
  { name: 'Summary Submit (valid)', surface: 'AddRecipe', loc: 'AddRecipeSummaryBar.scss:109', element: 'button.btn', label: 'Create Recipe / Save Changes', icon: 'none', family: 'Primary fill', base: 'orange fill, text #eee (not white)', hover: 'brighten + lift + $shadow-brand', outlier: 'medium', why: 'Text colour is $primary-background, not white.' },
  { name: 'Summary Submit (invalid)', surface: 'AddRecipe', loc: 'AddRecipeSummaryBar.scss:99', element: 'button.btn', label: 'Create Recipe', icon: 'none', family: 'Outline', base: 'ghost/muted — looks disabled', hover: 'colour+border shift', outlier: 'high', why: 'Looks disabled but is clickable (runs validation).' },
  { name: 'Summary Cancel', surface: 'AddRecipe', loc: 'AddRecipeSummaryBar.scss:71', element: 'button.btn', label: 'Cancel', icon: 'none', family: 'Outline', base: 'outline, secondary-text', hover: 'colour+border shift; no disabled-hover reset', outlier: 'low', why: 'Disabled-hover handled differently than Submit.' },
  { name: 'Draft Resume banner', surface: 'AddRecipe', loc: 'DraftResumeBanner.scss:76', element: 'button.btn', label: 'Resume', icon: 'none', family: 'Primary fill', base: 'orange fill (accessible token)', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Draft dismiss (X)', surface: 'AddRecipe', loc: 'DraftResumeBanner.scss:114', element: 'button', label: 'aria: Dismiss', icon: 'icon-only: X', family: 'Icon-only', base: 'icon-ghost ~24px', hover: 'colour→ink', outlier: 'low', why: 'Sub-44 target.' },
  { name: 'Image dropzone', surface: 'AddRecipe', loc: 'ImagePicker.tsx:104', element: 'div onClick', label: 'Click to select an image', icon: 'none', family: 'Other', base: 'dashed box, off-token hex', hover: 'NONE', outlier: 'high', why: 'Not a real control; no keyboard/focus.' },
  { name: 'Image remove (X)', surface: 'AddRecipe', loc: 'ImagePicker.tsx:112', element: 'button.option-btn', label: 'aria: Remove image', icon: 'icon-only: X', family: 'Icon-only', base: '28px circle; dead .option-btn class', hover: 'bg→opaque white', outlier: 'medium', why: 'Dead class; renders over empty dropzone.' },
  { name: 'Ingredient row (edit)', surface: 'AddRecipe', loc: 'IngredientItem.tsx:167', element: 'button.item-btn', label: 'parsed text', icon: 'left: thumb', family: 'Other', base: 'ghost row', hover: 'none on button (parent row bg)', outlier: 'medium', why: 'No per-control hover/focus; click-to-edit undiscoverable.' },
  { name: 'Ingredient remove (X)', surface: 'AddRecipe', loc: 'IngredientList.scss:161', element: 'button.ingr-remove', label: 'aria: Remove', icon: 'icon-only: X', family: 'Icon-only', base: '30px, radius 7px (off-scale)', hover: 'colour→orange + bg white', outlier: 'low', why: 'Off-scale radius; dup of instr-remove.' },
  { name: 'Ingredient retry', surface: 'AddRecipe', loc: 'IngredientList.scss:121', element: 'button.ingr-retry', label: 'aria: Retry', icon: 'icon-only: Alert→Rotate', family: 'Icon-only', base: 'icon, red', hover: 'colour→orange + glyph cross-fade', outlier: 'ok', why: 'Has focus ring (siblings often don’t).' },
  { name: 'Drag handle ×2', surface: 'AddRecipe', loc: 'IngredientList.scss:27', element: 'div', label: 'aria: Drag', icon: 'icon-only: Grip', family: 'Icon-only', base: 'div, cursor grab', hover: 'colour→orange', outlier: 'medium', why: 'Div, non-focusable, no keyboard reorder.' },
  { name: 'Add Label', surface: 'AddRecipe', loc: 'AddLabel.tsx:46', element: 'button', label: 'Add Label', icon: 'left: Plus', family: 'Text link', base: 'link/ghost, secondary-text', hover: 'colour→orange', outlier: 'ok', why: 'Has focus ring.' },
  { name: 'Instruction remove (X)', surface: 'AddRecipe', loc: 'InstructionItem.scss:98', element: 'button.instr-remove', label: 'aria: Remove step', icon: 'icon-only: X', family: 'Icon-only', base: '30px, radius 7px', hover: 'colour→orange + bg white', outlier: 'low', why: 'Byte-dup of ingr-remove in another file.' },
  { name: 'Compact inputs (title/servings/…)', surface: 'AddRecipe', loc: 'FormInput.tsx', element: 'input', label: 'placeholders', icon: 'none', family: 'Other', base: 'compact FormInput 40–48px', hover: 'none; NO focus ring', outlier: 'high', why: 'Every AddRecipe field focuses with no indicator.' },
  { name: 'Edit textarea', surface: 'AddRecipe', loc: 'RecipeFormTextArea.scss:24', element: 'textarea', label: '—', icon: 'none', family: 'Other', base: 'bordered, resize none', hover: 'outline:none, NO replacement', outlier: 'high', why: 'WCAG focus-visible failure.' },
  { name: 'Cuisine / Meal / Diet select', surface: 'AddRecipe', loc: 'CuisineSelector.tsx:63', element: 'react-select', label: 'placeholders', icon: 'right: caret', family: 'Select / combobox', base: '2px border combobox', hover: "borderColor:'primary' — INVALID string", outlier: 'high', why: 'Brand hover never renders; 3× copy-paste.' },
  { name: 'Password show/hide', surface: 'Auth', loc: 'FormInput.tsx:106', element: 'button', label: 'aria: Show/Hide', icon: 'icon-only: Eye', family: 'Icon-only', base: 'icon-ghost', hover: 'colour→ink', outlier: 'low', why: 'tabIndex −1 (unfocusable).' },

  // —— Auth / company / legal ——
  { name: 'Auth submit', surface: 'Auth', loc: 'FormStyles.scss:213', element: 'button.btn', label: 'Log in / Create account / …', icon: 'none', family: 'Primary fill', base: 'TEAL fill, white, 48px', hover: 'lift + $shadow-teal (no brighten)', outlier: 'ok', why: 'Teal CTA; backwards darken now fixed.' },
  { name: 'Google sign-in', surface: 'Auth', loc: 'FormStyles.scss:254', element: 'button.btn', label: 'Continue/Sign up with Google', icon: 'left: GoogleColor', family: 'Outline', base: 'white, grey-300 border, 48px', hover: 'bg #fafafa only (no lift/shadow/border)', outlier: 'high', why: 'Weak inert hover; icon recoloured teal.' },
  { name: 'Forgot password / switch links', surface: 'Auth', loc: 'FormStyles.scss:144', element: 'Link', label: 'Forgot password? / Sign up / Log in', icon: 'none', family: 'Text link', base: 'teal #00adb5, no underline', hover: 'underline', outlier: 'ok' },
  { name: 'Remember-me checkbox', surface: 'Auth', loc: 'FormStyles.scss:114', element: 'input', label: 'Remember me', icon: 'icon-only: check', family: 'Chip / toggle', base: 'custom 18px box', hover: 'border→teal; teal focus ring', outlier: 'ok' },
  { name: 'Cancel and log out', surface: 'Auth', loc: 'CreateUsername.scss:11', element: 'button', label: 'Cancel and log out', icon: 'none', family: 'Text link', base: 'muted grey, permanently underlined', hover: 'NONE', outlier: 'high', why: 'No hover; already underlined so no cue at all.' },
  { name: 'About primary CTA ×2', surface: 'About', loc: 'About.scss:70', element: 'Link', label: 'Browse recipes', icon: 'right: ArrowRight', family: 'Primary fill', base: 'orange fill, always-on $shadow-brand-strong', hover: 'lift + brighten + arrow slide', outlier: 'medium', why: 'Hand-built primary; resting strong shadow vs system.' },
  { name: 'About ghost CTA ×2', surface: 'About', loc: 'About.scss:83', element: 'Link', label: 'Create an account', icon: 'none', family: 'Ghost', base: 'transparent, grey-300 border', hover: 'lift + bg grey-50 + border lightens', outlier: 'low', why: 'Bordered “ghost” (system ghost is borderless).' },
  { name: 'Help topic chips ×4', surface: 'Help', loc: 'Help.scss:59', element: 'button', label: 'Report a bug / Suggest / Ask / Else', icon: 'top: various', family: 'Chip / toggle', base: 'card chip, radius-2xl', hover: 'border+text→teal; selected teal ring', outlier: 'ok' },
  { name: 'Add a subject', surface: 'Help', loc: 'Help.scss:143', element: 'button', label: '+ Add a subject', icon: 'none', family: 'Text link', base: 'teal link-text', hover: 'underline', outlier: 'ok' },
  { name: '404 Return Home', surface: '404', loc: '404.scss:94', element: 'button.btn--primary', label: 'Return Home', icon: 'none', family: 'Primary fill', base: 'orange fill, oversized $text-2xl', hover: 'brighten + lift + $shadow-brand', outlier: 'low' },
  { name: '404 support link', surface: '404', loc: '404.scss:88', element: 'Link', label: 'contact our support team', icon: 'none', family: 'Text link', base: 'teal #00787e (different shade)', hover: 'NONE', outlier: 'high', why: 'No hover; third teal shade.' },
  { name: 'Legal body links', surface: 'Legal', loc: 'LegalDocument.scss:78', element: 'a', label: 'email', icon: 'none', family: 'Text link', base: 'ORANGE #ff5722', hover: 'underline', outlier: 'medium', why: 'Orange link where auth uses teal.' },
  { name: 'EmptyState CTA', surface: 'Shared', loc: 'EmptyState.scss:46', element: 'Link/button', label: 'dynamic', icon: 'optional', family: 'Primary fill', base: 'orange fill, NOT on .btn base', hover: 'brighten + lift + $shadow-brand', outlier: 'medium', why: 'Reimplements primary by hand.' },

  // —— Account / settings / public profile ——
  { name: 'Level/XP card', surface: 'Account', loc: 'Account.scss:114', element: 'button', label: 'Lv N · rank · Rewards ›', icon: 'right: › char', family: 'Card', base: 'gradient-tint card', hover: 'border + $shadow-brand (no lift)', outlier: 'low' },
  { name: 'Edit profile', surface: 'Account', loc: 'Account.scss:215', element: 'button.btn', label: 'Edit profile', icon: 'left: Edit', family: 'Outline', base: 'cream-border pill', hover: 'border+colour→orange (no lift)', outlier: 'medium', why: 'Bespoke outline, opts out of lift.' },
  { name: 'Settings / Share (icon)', surface: 'Account', loc: 'Account.scss:228', element: 'button.btn--icon', label: 'aria', icon: 'icon-only: gear/share', family: 'Icon-only', base: '38px circle, cream border', hover: 'border+colour→orange + lift + elevation-2', outlier: 'ok' },
  { name: 'Account nav tab ×4', surface: 'Account', loc: 'Account.scss:282', element: 'Link', label: 'Saved / Ratings / Your Recipes / Drafts', icon: 'left + badge', family: 'Nav / segmented', base: 'segmented rail', hover: 'bg grey-50; active ORANGE', outlier: 'medium', why: 'Active hue disagrees with Settings nav (teal).' },
  { name: 'Collection tile', surface: 'Saved', loc: 'SavedRecipes.scss:16', element: 'button', label: 'collection + count', icon: 'left: thumb', family: 'Card', base: '158px tile', hover: 'lift −4px + elevation-4; active ring', outlier: 'ok' },
  { name: 'New collection tile', surface: 'Saved', loc: 'SavedRecipes.scss:111', element: 'button', label: 'New', icon: 'left: FolderPlus', family: 'Card', base: 'dashed orange tile', hover: 'bg grey-50, transform NONE (cancels card lift)', outlier: 'medium', why: 'Sibling tiles lift; this one explicitly doesn’t.' },
  { name: 'Collection Rename', surface: 'Saved', loc: 'SavedRecipes.scss:307', element: 'button.btn--outline.ghost', label: 'Rename', icon: 'left: Edit', family: 'Ghost', base: 'outline+ghost override', hover: 'bg grey-50 (border stays transparent)', outlier: 'low', why: 'Ghost override defeats outline hover.' },
  { name: 'Collection Delete', surface: 'Saved', loc: 'SavedRecipes.scss:320', element: 'button.btn--outline.ghost.danger', label: 'Delete', icon: 'left: Trash', family: 'Danger', base: 'ghost, identical to Rename', hover: 'colour→#c0392b (hard-coded)', outlier: 'high', why: 'Weak destructive signal; non-token red.' },
  { name: 'Create collection', surface: 'Saved', loc: 'SavedRecipes.scss:150', element: 'button.btn--primary', label: 'Create', icon: 'left: Plus', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Load more (Saved/Ratings/Recipes/Profile)', surface: 'Account', loc: 'index.scss:229', element: 'button.load-more-btn', label: 'Load More Recipes / Reviews', icon: 'none', family: 'Load more', base: 'global 250×45 box', hover: 'border→tertiary + lift + elevation-2', outlier: 'critical', why: 'Plain global load-more; diverges from /recipes pill.' },
  { name: 'Rating row', surface: 'Ratings', loc: 'UserRatings.scss:23', element: 'div[role=button]', label: 'recipe title', icon: 'left: thumb', family: 'Card', base: 'list row', hover: 'bg grey-50; inset orange focus', outlier: 'low', why: 'Div-button (avoids nested buttons).' },
  { name: 'User recipe tile', surface: 'Your Recipes', loc: 'UserRecipeThumbnail.scss:5', element: 'Link', label: 'recipe', icon: 'various', family: 'Card', base: 'card radius-18', hover: 'lift −4px + elevation-4; inner arrow slides', outlier: 'ok' },
  { name: 'Draft Resume', surface: 'Drafts', loc: 'Drafts.scss:124', element: 'button.btn', label: 'Continue editing', icon: 'left: Edit', family: 'Primary fill', base: 'orange fill, $shadow-brand-strong', hover: 'brighten + glow (NO lift)', outlier: 'medium', why: 'Prominent CTA that never lifts; label ≠ “Resume”.' },
  { name: 'Draft Delete', surface: 'Drafts', loc: 'Drafts.scss:147', element: 'button.btn', label: 'Delete', icon: 'left: Trash', family: 'Danger', base: 'warm-red border, neutral grey text', hover: 'colour→red, bg #fdf0f0', outlier: 'medium', why: 'Reads neutral at rest; red only on hover.' },
  { name: 'Profile share (icon)', surface: 'Profile', loc: 'PublicProfile.scss:80', element: 'button.btn--icon.btn--ghost', label: 'aria: Share', icon: 'icon-only: Share', family: 'Icon-only', base: '30px ghost circle', hover: 'colour→orange + bg tint', outlier: 'low', why: 'The only social control — no Follow exists.' },
  { name: 'Profile recipe tile', surface: 'Profile', loc: 'PublicProfile.scss:194', element: 'Link', label: 'recipe', icon: 'various', family: 'Card', base: 'square-media card', hover: 'lift −4px + elevation-4 + img scale', outlier: 'ok' },
  { name: 'Settings section nav ×4', surface: 'Settings', loc: 'Settings.scss:34', element: 'Link', label: 'Profile / Account / Privacy / Danger Zone', icon: 'left + chevron', family: 'Nav / segmented', base: 'segmented rail', hover: 'bg tint; active TEAL; danger red', outlier: 'medium', why: 'Active hue disagrees with Account nav (orange).' },
  { name: 'Toggle switch ×2', surface: 'Settings', loc: 'controls.scss:143', element: 'button[role=switch]', label: 'aria', icon: 'icon-only: knob', family: 'Chip / toggle', base: '44×26 pill switch', hover: 'NONE (state change only)', outlier: 'medium', why: 'No hover affordance among hover-reactive peers.' },
  { name: 'Upload photo / Update password / Export', surface: 'Settings', loc: 'controls.scss:218', element: 'button.btn--outline', label: 'Upload photo / …', icon: 'optional', family: 'Outline', base: 'warm-border pill', hover: 'border→TEAL, colour #057780 (no lift)', outlier: 'low', why: 'Teal-hover override on outline; opts out of lift.' },
  { name: 'SaveBar Save changes', surface: 'Settings', loc: 'controls.scss:212', element: 'button.btn--primary', label: 'Save changes', icon: 'none', family: 'Primary fill', base: 'orange fill, compact', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Delete account', surface: 'Settings', loc: 'index.scss:196', element: 'button.btn--danger', label: 'Delete account', icon: 'left: Trash', family: 'Danger', base: 'red outline', hover: 'red fill + lift + $shadow-danger', outlier: 'ok', why: 'The correct destructive treatment.' },
]

export const FAMILIES: Family[] = [
  'Primary fill', 'Outline', 'Ghost', 'Danger', 'Text link',
  'Icon-only', 'Chip / toggle', 'Card', 'Nav / segmented',
  'Load more', 'Select / combobox', 'Other',
]

export const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'ok']
