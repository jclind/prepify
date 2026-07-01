// TEMPORARY — data for the /button-audit review page. Deleted (with
// ButtonAudit.tsx) before the PR opens; never ships. See docs/design/
// button-hover-audit.md for the shipped hover-motion work this audits against.
//
// SECOND PASS. This is a re-audit taken AFTER the three-tier consistency fix
// (branch feat/button-consistency-fixes). Every clickable was re-read from the
// CURRENT code by five independent surveyors — global+navbar, Home+/recipes,
// single-recipe+reviews, add-recipe+forms, account/settings/auth — with no
// reference to the first pass. Base + hover are read straight from the SCSS;
// token values resolved from helpers.scss. Findings are split into what the
// pass CLOSED and what a fresh eye still flags (ranked).

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
  { cls: 'btn btn--primary', label: 'Primary', note: 'orange fill · brighten 1.06 + lift -2px + brand glow' },
  { cls: 'btn btn--outline', label: 'Outline', note: 'white · border->ink + lift -2px + elevation-2' },
  { cls: 'btn btn--ghost', label: 'Ghost', note: 'transparent · colour only, stays flat' },
  { cls: 'btn btn--danger', label: 'Danger', note: 'red outline -> red fill + lift + danger glow' },
  { cls: 'btn btn--danger-solid', label: 'Danger solid', note: 'red fill -> DARKER red + lift + danger glow' },
]

// ── Findings ─────────────────────────────────────────────────────────────────
// status 'resolved' = closed by the three-tier consistency pass (shown as the
// "before" so you can confirm it); status 'open' = still flagged on this pass.
export interface Finding {
  severity: Severity
  status: 'open' | 'resolved'
  title: string
  peers: string
  offender: string
  recommend: string
  refs: string
}

export const FINDINGS: Finding[] = [
  // ─────────────────────────── STILL OPEN (ranked) ───────────────────────────
  {
    severity: 'high',
    status: 'open',
    title: 'Two focus-ring gaps slipped through the focus-ring fix (WCAG 2.4.7)',
    peers:
      'The Tier-2 pass restored a visible focus ring on the compact inputs, the description textarea, the image dropzone, and every remove/retry X — the global button:focus-visible ring covers everything else.',
    offender:
      'The click-to-edit rows for EVERY ingredient and EVERY instruction still have none: Item.scss sets outline:none on .item-btn and .label-text-container, and at .item .item-btn specificity (0,2,0) that beats the global ring (0,1,1) with no :focus-visible restore. The single-recipe servings input also strips its ring (outline:none) with no replacement. Keyboard focus is invisible on the primary edit control of the recipe builder.',
    recommend:
      'Add `&:focus-visible { @include s.outline(); }` to .item-btn / .label-text-container (or drop the resting outline:none), and give .serv-input a focus ring. One-line fixes; the hardest part was that they hid behind a higher-specificity file the Tier-2 sweep did not touch.',
    refs: 'Item.scss:22 · Item.scss:48 · SingleRecipe.scss:319',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'The navbar is still a second motion system — and internally inconsistent',
    peers:
      'The .btn / load-more family eases every property together over one $hover-timing (0.15s ease) and surfaced controls lift -2px.',
    offender:
      'No nav control speaks that language. The whole bar runs 0.12s LINEAR, the footer links 0.12s ease, autocomplete 0.1s, and several rows (account items, profile header, footer wordmark) have no transition at all — they snap. The two Sign-up CTAs disagree on the AA fix (desktop fills $primary-accessible, mobile fills vivid $primary) AND on shape (pill vs 10px); the mobile Log-in animates border/colour but omits them from its transition list, so its hover snaps. This is the deferred "nav is its own dialect" boundary — still undocumented, and now shown to be fragmented even inside itself.',
    recommend:
      'Make the call explicitly: either document the nav as a deliberate separate system (defensible) or fold the two button-analogues (Sign up / Create) onto the shared timing + lift. Either way, reconcile mobile vs desktop Sign-up (one fill token, one radius) and fix the snapping transition lists.',
    refs: 'DesktopNav.scss · NavMenu.scss:218/229 · Footer.scss:109',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'Prominent controls that still give no hover feedback',
    peers: 'Almost every actionable control now responds to the cursor (colour and/or lift).',
    offender:
      'Zero-hover holdouts remain, several beside peers that DO respond: the nav Prepify wordmark (the footer wordmark darkens on hover — same link, two behaviours), the Beta tag button, the desktop account trigger (its neighbour the Saved icon tints), the mobile account-identity row (the desktop equivalent tints), the Settings toggle switches, and the CreateUsername "Cancel and log out".',
    recommend:
      'Give each a hover state (or, for the toggles, accept state-change-only but confirm that is deliberate). The brand wordmark reading two ways across surfaces is the one to fix first.',
    refs: 'Navbar.scss:149 · DesktopNav.scss:270 · controls.scss:143 · CreateUsername.scss:11',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'Destructive actions are red-at-rest now, but still three different shapes',
    peers:
      'Settings "Delete account" is the canonical .btn--danger: red outline -> red fill + lift + $shadow-danger.',
    offender:
      'The pass made every Delete red at rest on the one $error-red token (good) — but the shapes never converged. Collection Delete is a BORDERLESS ghost-danger (tint-only hover, no lift); draft Delete carries a SOFT RED BORDER (tint-only hover, no lift); the owner-recipe Delete rests as a neutral grey pill (no red until hover) and its hover text is the fill token #eeeeee, not white. So the two account Deletes do not even match each other, and none reaches the system danger.',
    recommend:
      'Route destructive buttons through .btn--danger (keep the quiet ghost-danger only for low-stakes inline links like a review Delete). At minimum make the two account Deletes identical.',
    refs: 'controls.scss:235 · SavedRecipes.scss:323 · Drafts.scss:153 · RecipeControls.scss:94',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'The primary Search button is a non-semantic <div>',
    peers: 'Primary actions are <button>/<a> with a focus ring and keyboard activation.',
    offender:
      'The Search submit is a <div onClick> wearing btn btn--primary — no role, no tabIndex, no focus ring, not Space/Enter-activatable on its own. The form’s Enter-to-submit is the only keyboard path; the visible orange control itself is inert to assistive tech. (Both the navbar and the Home/recipes surveyors independently flagged this.)',
    recommend:
      'Make it a real <button type="submit"> (or add role=button + tabIndex + key handler + focus ring). It already looks like a primary button; it should behave like one.',
    refs: 'SearchRecipesInput.tsx:240',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'Off-token teal text still fails AA where the link fix did not reach',
    peers: 'Inline text links were unified on the accessible teal $secondary-accessible #00787e.',
    offender:
      'Control/label teals were left behind and sit below AA: the recipe diet-tag chips, the "Made It" toggle, and the RecipeNotFound contact link use raw $secondary #00adb5; the Settings back link and the Settings outline-button hover text hardcode #057780; the Help SELECTED topic-chip label uses #00adb5 as text on a pale tint. Three teal shades where the link family has exactly one.',
    recommend:
      'Extend the #00787e token to these control/label teals (or add an accessible-teal variable and use it everywhere). Delete the #057780 literals.',
    refs: 'SingleRecipe.scss:448/468 · RecipeNotFound.scss:101 · Settings.scss:99 · controls.scss:227 · Help.scss:96',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'A local .ghost still shadows the system ghost — and hovers two ways',
    peers: '.btn--ghost is transparent, muted, colour->ink on hover, and deliberately flat.',
    offender:
      'HomeCookSuggestion keeps a local .ghost that is a GREY FILL (#f0f1f3, ink text) — the opposite of the system ghost, and a name collision with it. It lifts + gains elevation-2 inside the modal card but goes flat (bg-only) in the error state: one class, two hovers, off-token greys. (The sibling .primary was correctly folded onto .btn--primary; .ghost was left.)',
    recommend: 'Rename it (e.g. .cook-secondary) or compose .btn--outline; pick one hover; tokenise the greys.',
    refs: 'HomeCookSuggestion.scss:120 · HomeCookSuggestion.scss:145',
  },
  {
    severity: 'medium',
    status: 'open',
    title: 'Recipe-navigation hovers still fork; "See all" ships in two forms',
    peers: 'Every recipe card/tile lifts (-4px + elevation-4) over $hover-timing.',
    offender:
      'The Home meal-column rows hover to a warm chip #fbf7f2 on an off-token 0.12s — the only recipe-nav hover not on the lift metaphor or the shared timing. And "See all" appears twice: chevron + $text-base in section headers vs chevron-less + $text-sm in the meal columns — same words, two treatments.',
    recommend: 'Give the meal rows the same lift (or a tokenised tint on $hover-timing); pick one "See all" treatment.',
    refs: 'Home.scss:154 · Home.scss:138 · Home.tsx:47',
  },
  {
    severity: 'medium',
    status: 'open',
    title: '"Half-outline" buttons keep opting out of the lift',
    peers: '.btn--outline hovers border->ink + lift -2px + elevation-2.',
    offender:
      'Several outline-family controls take part of that and drop the rest: /recipes Filters + Sort recolour to orange and stay flat (and disagree at rest — Filters on a dark-ink border, Sort on grey), the drawer Reset stays flat, Account "Edit profile" recolours to orange and stays flat while its own sibling icon buttons lift, the owner Edit recolours to brand not ink and stays flat, and the Settings outline buttons hover teal (not ink). Each is defensible alone; together the outline family has no single hover.',
    recommend: 'Decide whether outlines lift; apply it uniformly. If the compact toolbar deliberately stays flat, at least align the resting borders and the hover target.',
    refs: 'Recipes.scss:92/144/413 · Account.scss:215 · RecipeControls.scss:74 · controls.scss:218',
  },
  {
    severity: 'low',
    status: 'open',
    title: 'Modal close X buttons give no or near-no hover',
    peers: 'Icon buttons compose a colour variant (.btn--icon + a hover), or at least tint on hover.',
    offender:
      'The owner delete-modal close is a bare .btn with no colour/--icon variant, so it has ZERO hover (and md pill padding wraps a 30px icon). The Home cook-modal close only swaps its translucent bg to solid white. Both read as static.',
    recommend: 'Give modal closes the .btn--icon + ghost hover the Settings/Account closes already use.',
    refs: 'RecipeControls.scss:144 · HomeCookSuggestion.scss:17',
  },
  {
    severity: 'low',
    status: 'open',
    title: 'Off-scale radii and a dead hidden control',
    peers: 'Radii come from the $radius-* scale; controls that render are styled on-system.',
    offender:
      'ingr-remove + instr-remove use border-radius:7px (off the 4/6/8 scale), the Beta tag 5px, and the RecipeNotFound CTA a 10px rounded-rect where every other primary CTA is a pill. Separately, the review sort dropdown is dead weight: mounted only for an on-mount setSort side-effect, hidden via display:none, styled with hardcoded #eeeeee + pure-black text + a null:null boxShadow — it would be the ugliest control on the page if it ever showed.',
    recommend: 'Snap the radii to the scale; make the not-found CTA a pill; replace the hidden dropdown with a plain default-sort constant.',
    refs: 'IngredientList.scss:161 · Navbar.scss:162 · RecipeNotFound.scss:75 · ReviewFilters.tsx:12',
  },
  {
    severity: 'low',
    status: 'open',
    title: 'Smaller drift: focus-ring colour, snap-timing, dead code, grammar',
    peers: 'One focus ring, one timing token, one label voice.',
    offender:
      'The UserRatings row and the PublicProfile tile use a bespoke ORANGE 2px focus ring where everything else uses the shared blue @include outline(). Servings +/- hard-fill orange with NO transition; several menu rows/footer wordmark snap. Item.scss has a malformed `button: {}` nested block that compiles to garbage, and the DesktopNav Create base rule is dead (the quiet skin always wins). Labels drift across surfaces: nav "Log in / Sign up" vs footer "Sign in / Create account". The footer "Report a bug" hovers to the admin cool-blue #2563eb in the consumer footer.',
    recommend: 'Pick one focus-ring colour; add the timing token to the snappers; delete the dead blocks; align label grammar; move the bug-report hover off the admin palette.',
    refs: 'UserRatings.scss:23 · PublicProfile.scss:194 · Item.scss:10 · Footer / BugReportModal.scss',
  },

  // ────────────────────── CLOSED BY THE CONSISTENCY PASS ──────────────────────
  {
    severity: 'critical',
    status: 'resolved',
    title: '"Load more" was three different components',
    peers: 'One shared .load-more-btn: white pill, chevron, orange border + lift + brand glow on hover.',
    offender:
      'Was a 250x45 grey box (index.scss), a separate /recipes pill, and a ghost "More Reviews" that only underlined — three definitions, three grammars.',
    recommend: 'FIXED: collapsed onto one self-centering .load-more-btn used by /recipes, reviews, Saved, Ratings, Your Recipes, and Public Profile; labels normalised to sentence case + chevron.',
    refs: 'index.scss:229',
  },
  {
    severity: 'critical',
    status: 'resolved',
    title: 'The primary CTA was hand-built in six places',
    peers: 'One orange CTA language: fill + brighten 1.06 + lift + $shadow-brand.',
    offender:
      'about-btn-primary (always-on strong shadow), empty-state cta (not on .btn), Home .primary, the summary submit (text #eee), and draft Resume (never lifted) each drifted.',
    recommend:
      'FIXED: EmptyState composes .btn--primary; Home .primary -> .btn--primary; About shadow is hover-only; summary text is white; Resume lifts.',
    refs: 'EmptyState.scss · About.scss:70 · AddRecipeSummaryBar.scss · Drafts.scss:124',
  },
  {
    severity: 'high',
    status: 'resolved',
    title: 'Drawer + toolbar controls gave no hover feedback',
    peers: 'Every drawer/toolbar control now responds.',
    offender:
      'The drawer "Show recipes" primary had no hover at all; Reset, the close X, the active filter chips, and "Clear all" were inert.',
    recommend:
      'FIXED: "Show recipes" brightens + lifts + glows like any primary; Reset/close/chips/Clear all all hover; Filters + Sort share one orange-border language.',
    refs: 'Recipes.scss:428/413/207',
  },
  {
    severity: 'high',
    status: 'resolved',
    title: 'react-select brand hover was a silent no-op (x3)',
    peers: 'Brand controls hover to an orange border.',
    offender:
      "The cuisine/meal/diet selectors set borderColor:'primary' — a literal string, not a colour — so the hover never painted, and the three style objects were copy-pasted.",
    recommend: 'FIXED: one shared recipeSelectStyles resolves the real token (styles.primary), so the orange hover paints; all three deduped.',
    refs: 'recipeSelectStyles.ts',
  },
  {
    severity: 'high',
    status: 'resolved',
    title: 'Focus-visible was missing on whole input families',
    peers: 'Inputs show a visible focus ring.',
    offender:
      'The compact FormInput (every AddRecipe field) had no ring; the description textarea set outline:none with no replacement; stale star :focus-visible selectors targeted removed markup.',
    recommend:
      'FIXED: compact inputs + textarea get a teal :focus-visible ring; dead star selectors removed. (Two rows the sweep did not reach are now the top OPEN finding.)',
    refs: 'FormInput.scss · RecipeFormTextArea.scss',
  },
  {
    severity: 'medium',
    status: 'resolved',
    title: 'The image dropzone was not a real control',
    peers: 'Actionable elements are keyboard-operable with a focus ring.',
    offender: 'The AddRecipe dropzone was a div with onClick — no role, no keyboard, no focus; its remove-X carried a dead .option-btn class.',
    recommend: 'FIXED: role=button + tabIndex + Enter/Space handler + focus ring; hexes tokenised; dead class gone.',
    refs: 'ImagePicker.tsx',
  },
  {
    severity: 'medium',
    status: 'resolved',
    title: 'Segmented-nav active colour disagreed (orange vs teal)',
    peers: '"You are here" should read one colour.',
    offender: 'The Account rail marked active ORANGE; the Settings rail marked active TEAL — the hue flipped between the two.',
    recommend: 'FIXED: both rails mark the active tab orange ($primary on a 10% tint).',
    refs: 'Settings.scss:34',
  },
  {
    severity: 'medium',
    status: 'resolved',
    title: 'Inline text links used three colours for one role',
    peers: 'One inline-link colour.',
    offender: 'Auth/Help teal #00adb5, 404 teal #00787e, legal-body ORANGE #ff5722 — three colours, two near-identical teals.',
    recommend:
      'FIXED: the text-link family is unified on the accessible teal #00787e (auth/help/404/legal). (Stray control/label teals that remain are an OPEN finding.)',
    refs: 'FormStyles.scss · 404.scss · LegalDocument.scss',
  },
  {
    severity: 'medium',
    status: 'resolved',
    title: 'Fill-on-hover ran at two magnitudes; logout read two ways',
    peers: 'One brighten magnitude ($hover-brighten 1.06); one destructive colour.',
    offender: 'Both signup CTAs and the nav Create used brightness(1.07); desktop logout hovered RED while mobile hovered ORANGE.',
    recommend: 'FIXED: nav brighten is the canonical 1.06; both logouts hover red on the $error-red token.',
    refs: 'DesktopNav.scss · NavMenu.scss:207',
  },
  {
    severity: 'medium',
    status: 'resolved',
    title: 'Card "Save" gave no distinct saved cue; Edit inverted to charcoal',
    peers: 'A toggle should differentiate its states; outline Edit should not fill dark.',
    offender:
      'The card save used the identical orange hover for saved + unsaved; the owner Edit hovered to a one-off charcoal #303841 fill.',
    recommend:
      'FIXED: the card save reads teal when saved (matching the action bar) and orange when unsaved; owner Edit now hovers to an orange outline. Google button rebuilt on the outline hover with the true-colour icon.',
    refs: 'RecipeCard.scss:79 · RecipeControls.scss:74 · FormStyles.scss:254',
  },
]

// ── Full inventory ───────────────────────────────────────────────────────────
// outlier: how likely this control is an outlier vs its family peers, re-rated
// on the CURRENT (post-fix) code. Most are now 'ok'; the flagged rows are the
// remaining tail behind the OPEN findings above.
export const INVENTORY: Clickable[] = [
  // —— System (the yardstick) ——
  { name: '.btn--primary', surface: 'System', loc: 'index.scss:164', element: '.btn variant', label: '—', icon: 'either', family: 'Primary fill', base: 'orange #ff5722 fill, white, pill', hover: 'brighten 1.06 + lift -2px + $shadow-brand', outlier: 'ok', why: 'The canonical orange CTA.' },
  { name: '.btn--outline', surface: 'System', loc: 'index.scss:176', element: '.btn variant', label: '—', icon: 'either', family: 'Outline', base: 'white, grey-400 border, ink', hover: 'border->ink + lift -2px + elevation-2', outlier: 'ok' },
  { name: '.btn--ghost', surface: 'System', loc: 'index.scss:187', element: '.btn variant', label: '—', icon: 'either', family: 'Ghost', base: 'transparent, secondary-text', hover: 'colour->ink only (flat)', outlier: 'ok', why: 'Deliberately the flat member.' },
  { name: '.btn--danger', surface: 'System', loc: 'index.scss:196', element: '.btn variant', label: '—', icon: 'either', family: 'Danger', base: 'white, red border+text', hover: 'red fill + lift + $shadow-danger', outlier: 'ok' },
  { name: '.btn--danger-solid', surface: 'System', loc: 'index.scss:208', element: '.btn variant', label: '—', icon: 'either', family: 'Danger', base: 'red fill, white', hover: 'DARKER red + lift + glow', outlier: 'low', why: 'Only fill that darkens; primary lightens (documented exception).' },
  { name: '.load-more-btn (shared)', surface: 'Global', loc: 'index.scss:229', element: 'standalone class', label: 'Load more…', icon: 'right: Chevron', family: 'Load more', base: 'white, grey-400 1.5px, pill, wt700', hover: 'colour+border->orange + lift + $shadow-brand', outlier: 'ok', why: 'One shared load-more now; the strongest treatment won.' },

  // —— Navbar: desktop ——
  { name: 'Prepify wordmark', surface: 'Navbar', loc: 'Navbar.scss:149', element: 'NavLink', label: 'Prepify', icon: 'none', family: 'Text link', base: 'italic 700 orange wordmark', hover: 'NONE', outlier: 'medium', why: 'Primary brand link with no hover; the footer wordmark darkens.' },
  { name: 'Beta tag', surface: 'Navbar', loc: 'Navbar.scss:162', element: 'button', label: 'Beta', icon: 'none', family: 'Chip / toggle', base: 'teal fill, 5px radius, breathing pulse', hover: 'NONE', outlier: 'medium', why: 'Interactive button, no hover; off-scale 5px radius.' },
  { name: 'Hamburger', surface: 'Navbar', loc: 'Navbar.tsx:58', element: 'button (lib)', label: 'aria: menu', icon: 'icon-only: bars', family: 'Icon-only', base: '3rd-party hamburger-react', hover: 'library default (no app CSS)', outlier: 'low' },
  { name: 'Recipes link', surface: 'Navbar', loc: 'DesktopNav.scss:136', element: 'NavLink', label: 'Recipes', icon: 'left (<1000px)', family: 'Nav / segmented', base: 'muted, 600, 0.12s linear', hover: 'colour->accent orange', outlier: 'low', why: 'Nav dialect (0.12s linear, no lift).' },
  { name: 'Create Recipe', surface: 'Navbar', loc: 'DesktopNav.scss:506', element: 'NavLink', label: 'Create Recipe', icon: 'left: PlusCircle', family: 'Outline', base: 'outlined neutral pill (quiet skin)', hover: 'neutral bg-fill + border->text (no lift)', outlier: 'medium', why: 'Outline twin that hovers by bg-fill, not border->ink+lift; base rule is dead code.' },
  { name: 'Log in CTA (desktop)', surface: 'Navbar', loc: 'DesktopNav.scss:245', element: 'NavLink', label: 'Log in', icon: 'none', family: 'Outline', base: 'transparent, 2px border, pill', hover: 'border+colour->orange (no lift)', outlier: 'low', why: '2px border + orange hover, nav dialect.' },
  { name: 'Sign up CTA (desktop)', surface: 'Navbar', loc: 'DesktopNav.scss:254', element: 'NavLink', label: 'Sign up', icon: 'none', family: 'Primary fill', base: 'accessible-orange fill, pill', hover: 'brighten 1.06 only (no lift/glow)', outlier: 'medium', why: 'Primary twin, half-hover; disagrees with mobile Sign up.' },
  { name: 'Saved icon', surface: 'Navbar', loc: 'DesktopNav.scss:205', element: 'NavLink', label: 'aria: Saved', icon: 'icon-only: Bookmark', family: 'Icon-only', base: '42px circle, muted', hover: 'bg tint + colour->text', outlier: 'low' },
  { name: 'Account trigger', surface: 'Navbar', loc: 'DesktopNav.scss:270', element: 'button', label: 'aria: Account menu', icon: 'icon-only: avatar+caret', family: 'Icon-only', base: 'avatar 42px + chevron', hover: 'NONE (caret rotates on open)', outlier: 'medium', why: 'No hover; the Saved icon beside it tints.' },
  { name: 'Account dropdown items x4', surface: 'Navbar', loc: 'DesktopNav.scss:356', element: 'NavLink', label: 'Account / Your recipes / Settings / Help', icon: 'left: various', family: 'Nav / segmented', base: 'row, 600, ink', hover: 'bg grey-200 (snaps, no transition)', outlier: 'low', why: 'Un-eased; active uses vivid $primary.' },
  { name: 'Log out (desktop)', surface: 'Navbar', loc: 'DesktopNav.scss:443', element: 'button', label: 'Log out', icon: 'left: LogOut', family: 'Danger', base: 'outline, 10px radius', hover: 'border+colour->red (no fill/lift)', outlier: 'low', why: 'Restrained danger-tint; matches mobile logout (deliberate).' },

  // —— Navbar: mobile menu ——
  { name: 'Menu rows x5', surface: 'Navbar', loc: 'MenuLink.tsx:14', element: 'NavLink', label: 'Home / Recipes / Create / Account / Help', icon: 'left: various', family: 'Nav / segmented', base: 'row, $text-xl, 10px radius', hover: 'bg grey-50; active orange tint', outlier: 'low', why: 'Nav dialect.' },
  { name: 'Account identity (mobile)', surface: 'Navbar', loc: 'AccountCard.tsx:52', element: 'NavLink', label: 'username + email', icon: 'left: avatar', family: 'Card', base: 'tappable row', hover: 'NONE', outlier: 'medium', why: 'No feedback; the desktop equivalent tints.' },
  { name: 'Log out (mobile)', surface: 'Navbar', loc: 'NavMenu.scss:185', element: 'button', label: 'Log out', icon: 'left: LogOut', family: 'Danger', base: 'full-width outline, 10px radius', hover: 'border+colour->red', outlier: 'ok', why: 'Now matches desktop logout.' },
  { name: 'Log in CTA (mobile)', surface: 'Navbar', loc: 'NavMenu.scss:218', element: 'NavLink', label: 'Log in', icon: 'none', family: 'Outline', base: 'transparent, 10px radius', hover: 'border+colour->accent (SNAPS)', outlier: 'medium', why: '10px vs desktop pill; transition omits the animated props.' },
  { name: 'Sign up CTA (mobile)', surface: 'Navbar', loc: 'NavMenu.scss:229', element: 'NavLink', label: 'Sign up', icon: 'none', family: 'Primary fill', base: 'VIVID $primary fill, 10px radius', hover: 'brighten 1.06', outlier: 'medium', why: 'Vivid orange (worse AA) vs desktop accessible; 10px vs pill.' },

  // —— Search (shared) ——
  { name: 'Search submit', surface: 'Search', loc: 'SearchRecipesInput.tsx:240', element: 'div onClick', label: 'Search', icon: 'none', family: 'Primary fill', base: '.btn--primary skin on a <div>', hover: 'brighten + lift + $shadow-brand', outlier: 'medium', why: 'Non-semantic: no role/tabindex/focus; keyboard only via form Enter.' },
  { name: 'Autocomplete option rows', surface: 'Search', loc: 'SearchRecipesInput.tsx:287', element: 'li[role=option]', label: 'recipe title', icon: 'left: thumb', family: 'Select / combobox', base: 'row, 0.1s', hover: 'bg grey-200', outlier: 'ok', why: 'Correct APG combobox (activedescendant).' },
  { name: 'Autocomplete footer', surface: 'Search', loc: 'SearchRecipesInput.tsx:330', element: 'button', label: 'Search for "…"', icon: 'left: Search', family: 'Text link', base: 'orange text, 700', hover: 'bg grey-200', outlier: 'low', why: 'Vivid orange on white (~2.7:1); 0.1s timing.' },

  // —— Footer ——
  { name: 'Footer wordmark', surface: 'Footer', loc: 'Footer.scss:66', element: 'Link', label: 'Prepify', icon: 'none', family: 'Text link', base: '800 orange (nav is 700)', hover: 'colour->$primary-hover (SNAPS)', outlier: 'low', why: 'Has a hover the nav wordmark lacks; different weight; un-eased.' },
  { name: 'Footer links x12', surface: 'Footer', loc: 'Footer.scss:109', element: 'Link/a', label: 'Home / All recipes / Sign in / Create account / …', icon: 'none', family: 'Text link', base: 'secondary-text, 600, 0.12s ease', hover: 'colour->orange', outlier: 'low', why: 'Yet another timing; grammar drift ("Sign in" vs nav "Log in").' },
  { name: 'Report a bug', surface: 'Footer', loc: 'BugReportModal.scss:9', element: 'button.btn.link', label: 'Report a bug', icon: 'none', family: 'Text link', base: '.btn base, tertiary text', hover: 'colour->admin blue #2563eb + tint', outlier: 'low', why: 'Admin cool-blue surfacing in the consumer footer.' },

  // —— Home ——
  { name: 'What should I cook?', surface: 'Home', loc: 'HomeCookSuggestion.tsx:62', element: 'button.btn', label: 'What should I cook?', icon: 'left: Dice', family: 'Primary fill', base: 'orange fill, resting elevation-2', hover: 'brighten + lift + $shadow-brand', outlier: 'low', why: 'Hand-rolled primary on the .btn base.' },
  { name: 'View all recipes', surface: 'Home', loc: 'Home.tsx:61', element: 'Link', label: 'View all recipes', icon: 'right: Chevron', family: 'Primary fill', base: 'orange fill ($primary)', hover: 'brighten + lift + $shadow-brand', outlier: 'ok', why: 'On-system; sourced from $primary vs accessible token (latent).' },
  { name: 'See all (section header)', surface: 'Home', loc: 'Home.tsx:47', element: 'Link', label: 'See all', icon: 'right: Chevron', family: 'Text link', base: 'orange 700 $text-base', hover: 'underline', outlier: 'medium', why: 'Two-forms twin of the meal-col See all.' },
  { name: 'See all (meal col x3)', surface: 'Home', loc: 'HomeBrowseByMeal.tsx:96', element: 'Link', label: 'See all', icon: 'none', family: 'Text link', base: 'orange 700 $text-sm, no chevron', hover: 'underline', outlier: 'medium', why: 'Smaller, chevron-less twin.' },
  { name: 'Meal row link', surface: 'Home', loc: 'HomeBrowseByMeal.tsx:17', element: 'Link', label: 'recipe title', icon: 'left: thumb', family: 'Card', base: 'row, ink', hover: 'bg #fbf7f2 chip (0.12s)', outlier: 'medium', why: 'Off-token warm chip + off-timing; clashes with the card lift.' },
  { name: 'Recipe card', surface: 'Home', loc: 'HomeRecipeCard.tsx:17', element: 'Link', label: 'recipe title', icon: 'left: thumb', family: 'Card', base: 'white, elevation-3', hover: 'lift -4px + elevation-4', outlier: 'ok' },
  { name: 'Cook-modal close', surface: 'Home', loc: 'HomeCookSuggestion.scss:17', element: 'button.btn--icon', label: 'aria: Close', icon: 'icon-only: X', family: 'Icon-only', base: '30px circle, translucent', hover: 'bg->solid white only', outlier: 'low', why: 'No colour variant composed; bg-only hover.' },
  { name: 'Modal View recipe', surface: 'Home', loc: 'HomeCookSuggestion.tsx:99', element: 'Link.btn--primary', label: 'View recipe', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok', why: 'Now on the real .btn--primary.' },
  { name: 'Modal Try another', surface: 'Home', loc: 'HomeCookSuggestion.scss:120', element: 'button.ghost', label: 'Try another', icon: 'left: Dice', family: 'Other', base: 'local .ghost = GREY FILL #f0f1f3', hover: 'bg + lift + elevation-2', outlier: 'medium', why: 'Local .ghost shadows the BEM ghost; grey fill that lifts.' },
  { name: 'Modal Try again (error)', surface: 'Home', loc: 'HomeCookSuggestion.scss:145', element: 'button.ghost', label: 'Try again', icon: 'none', family: 'Other', base: 'same local .ghost', hover: 'bg only (flat)', outlier: 'medium', why: 'Same class, different (flat) hover than Try another.' },

  // —— /recipes ——
  { name: 'Filters', surface: '/recipes', loc: 'Recipes.scss:92', element: 'button', label: 'Filters (+badge)', icon: 'left: Sliders', family: 'Outline', base: 'dark-ink border pill', hover: 'border+colour->orange (no lift)', outlier: 'medium', why: 'Flat orange hover; resting ink border disagrees with Sort.' },
  { name: 'Sort trigger', surface: '/recipes', loc: 'Recipes.scss:132', element: 'button', label: 'Sort: {label}', icon: 'right: Chevron', family: 'Select / combobox', base: 'grey-400 border pill', hover: 'border+colour->orange (no lift)', outlier: 'low', why: 'Now shares Filters hover, but rests on a grey border.' },
  { name: 'Sort menu item', surface: '/recipes', loc: 'Recipes.scss:176', element: 'button', label: 'option', icon: 'none', family: 'Other', base: 'list row', hover: 'bg grey-200; active orange tint', outlier: 'ok' },
  { name: 'Active filter chip', surface: '/recipes', loc: 'Recipes.scss:207', element: 'button', label: '{value} x', icon: 'text x', family: 'Chip / toggle', base: 'orange-tint chip', hover: 'tint deepens 0.10->0.18', outlier: 'ok', why: 'Now hovers.' },
  { name: 'Clear all', surface: '/recipes', loc: 'Recipes.scss:223', element: 'button', label: 'Clear all', icon: 'none', family: 'Text link', base: 'underlined secondary-text', hover: 'colour->ink', outlier: 'ok' },
  { name: 'Empty Clear filters', surface: '/recipes', loc: 'Recipes.scss:322', element: 'button', label: 'Clear filters', icon: 'none', family: 'Outline', base: 'grey border pill (named --ghost)', hover: 'border->orange + lift + elevation-2', outlier: 'low', why: 'Misnamed --ghost; a lifting orange outline (a 3rd outline hover).' },
  { name: 'Empty Browse all', surface: '/recipes', loc: 'Recipes.scss:313', element: 'button', label: 'Browse all recipes', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Load more recipes', surface: '/recipes', loc: 'Recipes.tsx:322', element: 'button.load-more-btn', label: 'Load more recipes', icon: 'right: Chevron', family: 'Load more', base: 'shared pill', hover: 'orange border + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Drawer close', surface: '/recipes', loc: 'Recipes.scss:375', element: 'button', label: 'aria: Close', icon: 'text x', family: 'Ghost', base: 'bare text x', hover: 'colour->ink', outlier: 'ok', why: 'Now hovers.' },
  { name: 'Drawer chip', surface: '/recipes', loc: 'Recipes.scss:448', element: 'button', label: 'option', icon: 'none', family: 'Chip / toggle', base: 'grey-400 border pill', hover: 'border+colour->orange; active fill', outlier: 'ok' },
  { name: 'Drawer Reset', surface: '/recipes', loc: 'Recipes.scss:413', element: 'button', label: 'Reset', icon: 'none', family: 'Outline', base: 'outline pill', hover: 'border+colour->ink (no lift)', outlier: 'low', why: 'Claims to match .btn--outline but omits the lift.' },
  { name: 'Drawer Show recipes', surface: '/recipes', loc: 'Recipes.scss:428', element: 'button', label: 'Show recipes', icon: 'none', family: 'Primary fill', base: 'orange fill, flex:1', hover: 'brighten + lift + $shadow-brand', outlier: 'ok', why: 'Now reads as a system primary.' },

  // —— RecipeCard (shared) ——
  { name: 'Recipe card (grid)', surface: 'Shared', loc: 'RecipeCard.scss:3', element: 'article>a', label: 'recipe', icon: 'left: thumb', family: 'Card', base: 'white, elevation-3', hover: 'lift -4px + elevation-4', outlier: 'ok', why: 'Focus ring is a hard-coded #4d90fe blue (off-token).' },
  { name: 'Card save bookmark', surface: 'Shared', loc: 'RecipeCard.scss:79', element: 'button', label: 'aria: save', icon: 'icon-only: Bookmark', family: 'Icon-only', base: '2rem chip', hover: 'scale 1.08; unsaved->orange, saved stays teal', outlier: 'ok', why: 'Now teal-when-saved; scale is the documented corner-chip affordance.' },

  // —— Single recipe ——
  { name: 'Back "All recipes"', surface: 'Recipe', loc: 'SingleRecipe.scss:27', element: 'a', label: 'All recipes', icon: 'left: ArrowLeft', family: 'Text link', base: 'secondary-text 700', hover: 'colour->orange', outlier: 'ok' },
  { name: 'Servings -/+', surface: 'Recipe', loc: 'SingleRecipe.scss:296', element: 'button', label: 'aria: +/- servings', icon: 'icon-only: +/-', family: 'Icon-only', base: '32px circle, white', hover: 'bg->orange + white (NO transition)', outlier: 'low', why: 'Hard fill with no timing token (snaps).' },
  { name: 'Servings input', surface: 'Recipe', loc: 'SingleRecipe.scss:310', element: 'input', label: 'aria: Servings', icon: 'none', family: 'Other', base: 'transparent centred', hover: 'none', outlier: 'medium', why: 'outline:none with no focus replacement (WCAG).' },
  { name: 'Ingredient row (check)', surface: 'Recipe', loc: 'SingleRecipe.scss:334', element: 'div[role=checkbox]', label: 'ingredient', icon: 'left: check+thumb', family: 'Chip / toggle', base: 'interactive row', hover: 'bg grey-200', outlier: 'ok', why: 'Has a focus ring.' },
  { name: 'Diet tag links', surface: 'Recipe', loc: 'SingleRecipe.scss:448', element: 'a', label: 'tag', icon: 'none', family: 'Chip / toggle', base: 'teal-tint chip, raw $secondary text', hover: 'bg deepens', outlier: 'medium', why: 'Raw #00adb5 small text fails AA; hover has no timing token.' },
  { name: 'Save / Saved toggle', surface: 'Recipe', loc: 'SingleRecipe.scss:206', element: 'button.btn', label: 'Save / Saved', icon: 'left: Bookmark + caret', family: 'Primary fill', base: 'orange (unsaved) / teal (saved) fill', hover: 'brighten + lift + brand/teal glow', outlier: 'ok', why: 'AA-tuned; faithful primary Lift.' },
  { name: 'Rate', surface: 'Recipe', loc: 'AddRatingBtn.tsx:20', element: 'button.btn--outline', label: 'Rate / {n}', icon: 'left: Star', family: 'Outline', base: 'outline pill', hover: 'border->ink + lift + elevation-2', outlier: 'ok' },
  { name: 'Print', surface: 'Recipe', loc: 'PrintRecipeBtn.tsx:22', element: 'button.btn--outline', label: 'Print', icon: 'left: Printer', family: 'Outline', base: 'outline pill', hover: 'border->ink + lift + elevation-2', outlier: 'ok' },
  { name: 'Made It', surface: 'Recipe', loc: 'SingleRecipe.scss:468', element: 'button.btn', label: 'Made It', icon: 'none', family: 'Chip / toggle', base: 'teal-tint, raw $secondary', hover: 'bg deepens (no lift)', outlier: 'medium', why: 'Opts out of the Lift its row-mates get; inaccessible teal.' },
  { name: 'Owner Edit', surface: 'Recipe', loc: 'RecipeControls.scss:74', element: 'button.btn', label: 'Edit', icon: 'left: Edit', family: 'Outline', base: 'cream outline pill', hover: 'border+colour->orange (no lift)', outlier: 'low', why: 'Charcoal regression fixed; still flat + recolours brand not ink.' },
  { name: 'Owner Delete', surface: 'Recipe', loc: 'RecipeControls.scss:94', element: 'button.btn', label: 'Delete', icon: 'left: Trash', family: 'Danger', base: 'neutral grey pill (identical to Edit at rest)', hover: 'red fill, text #eeeeee (no lift/glow)', outlier: 'medium', why: 'No danger telegraph at rest; opts out of danger Lift; hover text off-token.' },
  { name: 'Delete-modal close', surface: 'Recipe', loc: 'RecipeControls.scss:144', element: 'button.btn', label: 'aria: close', icon: 'icon-only: X', family: 'Icon-only', base: '.btn, no variant', hover: 'NONE', outlier: 'medium', why: 'No colour/--icon variant -> zero hover; md padding around a 30px icon.' },
  { name: 'Delete-modal Cancel', surface: 'Recipe', loc: 'RecipeControls.tsx:136', element: 'button.btn--outline', label: 'Cancel', icon: 'none', family: 'Outline', base: 'outline pill', hover: 'border->ink + lift + elevation-2', outlier: 'ok' },
  { name: 'Delete-modal Delete Recipe', surface: 'Recipe', loc: 'RecipeControls.tsx:139', element: 'button.btn--danger-solid', label: 'Delete Recipe', icon: 'none', family: 'Danger', base: 'red fill', hover: 'darker red + lift + $shadow-danger', outlier: 'ok', why: 'Canonical danger — but pairs with the non-canonical toolbar Delete.' },
  { name: 'Remove rating', surface: 'Recipe', loc: 'RatingsAndReviews.scss:78', element: 'button.btn--ghost', label: 'Remove rating', icon: 'none', family: 'Ghost', base: 'underlined ghost', hover: 'colour->ink', outlier: 'ok' },
  { name: 'Sign In To Rate', surface: 'Recipe', loc: 'SingleRecipe.scss:617', element: 'Link', label: 'Sign In To Rate', icon: 'left: stars', family: 'Text link', base: 'orange, soft border pill', hover: 'bg tint (0.12s)', outlier: 'low', why: 'Off-token timing; Title-Case label.' },
  { name: 'Star rating input x5', surface: 'Recipe', loc: 'StarRating.tsx:85', element: 'button x5', label: 'aria: Rate n/5', icon: 'icon-only: star', family: 'Icon-only', base: 'reset', hover: 'JS fill preview', outlier: 'ok', why: 'Real buttons; dead star :focus selectors removed.' },
  { name: 'Submit Review', surface: 'Recipe', loc: 'AddReview.tsx:69', element: 'button.btn--primary', label: 'Submit Review', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Load more reviews', surface: 'Recipe', loc: 'ReviewsList.tsx:45', element: 'button.load-more-btn', label: 'Load more reviews', icon: 'right: Chevron', family: 'Load more', base: 'shared pill', hover: 'orange border + lift + $shadow-brand', outlier: 'ok', why: 'Was the bare underline ghost; now the shared pill.' },
  { name: 'Review sort dropdown', surface: 'Recipe', loc: 'ReviewFilters.tsx:12', element: 'react-select (hidden)', label: 'Date: Newest', icon: 'right: caret', family: 'Select / combobox', base: 'hardcoded #eeeeee + pure black', hover: 'react-select default (dead null:null shadow)', outlier: 'medium', why: 'Rendered-but-hidden for an on-mount side-effect; off-token if ever shown.' },
  { name: 'Per-review Edit / Delete / Cancel', surface: 'Recipe', loc: 'RecipeReview.scss:101', element: 'button.btn--ghost x3', label: 'Edit / Delete / Cancel', icon: 'none', family: 'Ghost', base: 'underlined ghost links', hover: 'colour->ink (Delete->red)', outlier: 'ok' },
  { name: 'Per-review Submit', surface: 'Recipe', loc: 'RecipeReview.scss:119', element: 'button.btn--primary', label: 'Submit', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Delete-review modal Cancel/Delete', surface: 'Recipe', loc: 'ConfirmDeleteReviewModal.tsx:41', element: 'btn--outline / btn--danger-solid', label: 'Cancel / Delete', icon: 'none', family: 'Danger', base: 'outline + red fill', hover: 'canonical', outlier: 'ok' },
  { name: 'Not-found CTA', surface: 'Recipe', loc: 'RecipeNotFound.scss:75', element: 'a', label: 'Browse all recipes', icon: 'none', family: 'Primary fill', base: 'orange fill, 10px radius (NOT pill)', hover: 'brighten + lift + $shadow-brand', outlier: 'medium', why: 'Lone non-pill primary CTA.' },
  { name: 'Not-found contact link', surface: 'Recipe', loc: 'RecipeNotFound.scss:101', element: 'Link', label: 'Contact our help team', icon: 'none', family: 'Text link', base: 'raw $secondary #00adb5', hover: 'underline', outlier: 'medium', why: 'Raw teal small text fails AA (token #00787e used nearby).' },

  // —— Add / edit recipe + forms ——
  { name: 'Text input (compact)', surface: 'AddRecipe', loc: 'FormInput.scss:123', element: 'input', label: 'placeholders', icon: 'optional left', family: 'Other', base: 'compact 40px', hover: 'none', outlier: 'ok', why: 'Teal :focus-visible ring restored.' },
  { name: 'Text input (md)', surface: 'Forms', loc: 'FormInput.scss:62', element: 'input', label: '—', icon: 'optional left', family: 'Other', base: '48px', hover: 'none', outlier: 'low', why: 'Rings on :focus (not :focus-visible) — minor convention drift.' },
  { name: 'Description textarea', surface: 'AddRecipe', loc: 'RecipeFormTextArea.scss:24', element: 'textarea', label: '—', icon: 'none', family: 'Other', base: 'bordered', hover: 'none', outlier: 'ok', why: 'outline:none but teal :focus-visible ring restored (WCAG ok).' },
  { name: 'Image dropzone (empty)', surface: 'AddRecipe', loc: 'ImagePicker.tsx:104', element: 'div[role=button]', label: 'Select an image', icon: 'none', family: 'Card', base: 'dashed box', hover: 'NONE', outlier: 'low', why: 'Real keyboard control now; only gap is no hover on a big target.' },
  { name: 'Image remove (X)', surface: 'AddRecipe', loc: 'ImagePicker.tsx:130', element: 'button', label: 'aria: Remove image', icon: 'icon-only: X', family: 'Icon-only', base: '28px circle', hover: 'bg->opaque white', outlier: 'low', why: 'Off-token color:black; dead .option-btn is gone.' },
  { name: 'Ingredient/Instruction row (edit)', surface: 'AddRecipe', loc: 'Item.scss:19', element: 'button.item-btn', label: 'ingredient / step text', icon: 'left: thumb/number', family: 'Card', base: 'transparent row', hover: 'row bg tint', outlier: 'high', why: 'outline:none beats the global ring, no restore -> no focus indicator (WCAG).' },
  { name: 'Ingredient/Instruction label row', surface: 'AddRecipe', loc: 'Item.scss:43', element: 'button.label-text-container', label: 'group label', icon: 'none', family: 'Card', base: 'transparent row', hover: 'row bg tint', outlier: 'high', why: 'Same outline:none focus gap (WCAG).' },
  { name: 'Drag handle x2', surface: 'AddRecipe', loc: 'IngredientList.scss:27', element: 'div[role=button] (dnd)', label: 'aria: Drag', icon: 'icon-only: Grip', family: 'Icon-only', base: 'div, cursor grab', hover: 'colour->orange', outlier: 'low', why: 'Keyboard reorder works; but <div> so the branded ring never applies.' },
  { name: 'Ingredient/Instruction remove (X)', surface: 'AddRecipe', loc: 'IngredientList.scss:161', element: 'button', label: 'aria: Remove', icon: 'icon-only: X', family: 'Icon-only', base: '30px, radius 7px', hover: 'colour->orange + bg white', outlier: 'low', why: 'Off-scale 7px radius; has a focus ring.' },
  { name: 'Ingredient retry', surface: 'AddRecipe', loc: 'IngredientList.scss:121', element: 'button', label: 'aria: Retry', icon: 'icon-only: Alert->Rotate', family: 'Icon-only', base: 'icon, red', hover: 'colour->orange + glyph swap', outlier: 'ok', why: 'Has focus ring.' },
  { name: 'Add Label', surface: 'AddRecipe', loc: 'AddLabel.tsx:46', element: 'button', label: 'Add Label', icon: 'left: Plus', family: 'Text link', base: 'secondary-text + orange +', hover: 'colour->orange', outlier: 'low', why: 'Off-token transition (0.1s linear).' },
  { name: 'Cuisine / Course / Diet select', surface: 'AddRecipe', loc: 'recipeSelectStyles.ts:12', element: 'react-select', label: 'placeholders', icon: 'right: caret', family: 'Select / combobox', base: '2px border combobox', hover: 'border->orange (real token now)', outlier: 'ok', why: 'Brand hover paints; all three deduped onto one style object.' },
  { name: 'Summary Cancel', surface: 'AddRecipe', loc: 'AddRecipeSummaryBar.scss:71', element: 'button.btn', label: 'Cancel', icon: 'none', family: 'Outline', base: 'muted outline', hover: 'colour+border->ink (flat)', outlier: 'low', why: 'Bespoke muted outline, no lift.' },
  { name: 'Summary Submit (valid)', surface: 'AddRecipe', loc: 'AddRecipeSummaryBar.scss:109', element: 'button.btn', label: 'Create Recipe / Save Changes', icon: 'none', family: 'Primary fill', base: 'orange fill, WHITE text', hover: 'brighten + lift + $shadow-brand', outlier: 'ok', why: 'Text is white now.' },
  { name: 'Summary Submit (invalid)', surface: 'AddRecipe', loc: 'AddRecipeSummaryBar.scss:99', element: 'button.btn', label: 'Create Recipe', icon: 'none', family: 'Outline', base: 'muted — looks disabled', hover: 'colour+border shift', outlier: 'medium', why: 'Looks disabled but is clickable (runs validation); only hover reveals it.' },
  { name: 'Draft Resume banner', surface: 'AddRecipe', loc: 'DraftResumeBanner.scss:76', element: 'button.btn', label: 'Resume', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Draft banner Dismiss', surface: 'AddRecipe', loc: 'DraftResumeBanner.scss:114', element: 'button', label: 'aria: Dismiss', icon: 'icon-only: X', family: 'Icon-only', base: 'icon ghost', hover: 'colour->ink', outlier: 'ok' },

  // —— Account ——
  { name: 'Level/XP card', surface: 'Account', loc: 'Account.scss:114', element: 'button', label: 'Lv N · rank · Rewards ›', icon: 'right: › char', family: 'Card', base: 'gradient-tint card', hover: 'border + $shadow-brand (no lift)', outlier: 'medium', why: 'Card that shadows but does not lift; off-token 0.12s.' },
  { name: 'Edit profile', surface: 'Account', loc: 'Account.scss:215', element: 'button.btn', label: 'Edit profile', icon: 'left: Edit', family: 'Outline', base: 'cream-border pill', hover: 'border+colour->orange (no lift)', outlier: 'medium', why: 'Opts out of the lift while its sibling icon buttons lift.' },
  { name: 'Settings / Share (icon)', surface: 'Account', loc: 'Account.scss:228', element: 'button', label: 'aria', icon: 'icon-only: gear/share', family: 'Icon-only', base: '38px circle, cream border', hover: 'border+colour->orange + lift + elevation-2', outlier: 'low' },
  { name: 'Account nav tab x4', surface: 'Account', loc: 'Account.scss:282', element: 'Link', label: 'Saved / Ratings / Your Recipes / Drafts', icon: 'left + badge', family: 'Nav / segmented', base: 'segmented rail', hover: 'bg grey-50; active ORANGE', outlier: 'ok', why: 'Active hue now agrees with Settings.' },
  { name: 'Add a bio', surface: 'Account', loc: 'Account.scss:87', element: 'Link', label: '+ Add a bio', icon: 'none', family: 'Text link', base: 'tertiary text', hover: 'colour->orange', outlier: 'low', why: 'Prompt link hovers orange, not the area teal.' },

  // —— Saved ——
  { name: 'Collection tile', surface: 'Saved', loc: 'SavedRecipes.scss:16', element: 'button', label: 'collection + count', icon: 'left: thumb', family: 'Card', base: '158px tile', hover: 'lift -4px + elevation-4; active ring', outlier: 'ok' },
  { name: 'New collection tile', surface: 'Saved', loc: 'SavedRecipes.scss:111', element: 'button', label: 'New', icon: 'left: FolderPlus', family: 'Card', base: 'dashed orange tile', hover: 'bg grey-50, no lift', outlier: 'low', why: 'Deliberately flat create-affordance.' },
  { name: 'Create collection', surface: 'Saved', loc: 'SavedRecipes.scss:150', element: 'button.btn--primary', label: 'Create', icon: 'none', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Search clear', surface: 'Saved', loc: 'SavedRecipes.scss:203', element: 'button.btn--icon', label: 'aria: Clear', icon: 'icon-only: X', family: 'Icon-only', base: '22px grey chip', hover: 'bg darken (no lift)', outlier: 'low' },
  { name: 'Sort trigger / menu', surface: 'Saved', loc: 'SavedRecipes.scss:222', element: 'button', label: 'Sort: {current}', icon: 'right: Chevron', family: 'Select / combobox', base: 'grey border pill', hover: 'border->tertiary', outlier: 'ok' },
  { name: 'Collection Rename', surface: 'Saved', loc: 'SavedRecipes.scss:307', element: 'button.btn--outline.ghost', label: 'Rename', icon: 'left: Edit', family: 'Ghost', base: 'borderless override', hover: 'bg grey-50 (greys not inks)', outlier: 'low' },
  { name: 'Collection Delete', surface: 'Saved', loc: 'SavedRecipes.scss:323', element: 'button.…ghost.danger', label: 'Delete', icon: 'left: Trash', family: 'Danger', base: 'borderless, RED at rest', hover: 'red tint (no border/fill/lift)', outlier: 'medium', why: 'Red at rest now, but borderless tint-hover; differs from draft Delete.' },

  // —— Ratings / Your Recipes / Drafts ——
  { name: 'Rating row', surface: 'Ratings', loc: 'UserRatings.scss:23', element: 'div[role=button]', label: 'recipe title', icon: 'left: thumb', family: 'Card', base: 'list row', hover: 'bg grey-50', outlier: 'low', why: 'Bespoke ORANGE 2px focus ring (vs the shared blue ring).' },
  { name: 'User recipe tile', surface: 'Your Recipes', loc: 'UserRecipeThumbnail.scss:5', element: 'Link', label: 'recipe', icon: 'right: arrow', family: 'Card', base: 'card radius-18', hover: 'lift -4px + elevation-4; arrow slides', outlier: 'ok' },
  { name: 'Draft Resume', surface: 'Drafts', loc: 'Drafts.scss:124', element: 'button.btn', label: 'Continue editing', icon: 'left: Edit', family: 'Primary fill', base: 'orange fill', hover: 'brighten + lift + $shadow-brand', outlier: 'ok', why: 'Now lifts (was static).' },
  { name: 'Draft Delete', surface: 'Drafts', loc: 'Drafts.scss:153', element: 'button.btn', label: 'Delete', icon: 'left: Trash', family: 'Danger', base: 'soft red border, RED at rest', hover: 'red tint (no fill/lift)', outlier: 'medium', why: 'Red at rest now, but soft-border tint-hover; differs from collection Delete.' },

  // —— Public profile ——
  { name: 'Profile share (icon)', surface: 'Profile', loc: 'PublicProfile.scss:80', element: 'button.btn--icon.btn--ghost', label: 'aria: Share', icon: 'icon-only: Share', family: 'Icon-only', base: '30px ghost circle', hover: 'colour->orange + bg tint', outlier: 'low' },
  { name: 'Profile recipe tile', surface: 'Profile', loc: 'PublicProfile.scss:194', element: 'Link', label: 'recipe', icon: 'photo + badge', family: 'Card', base: 'square-media card', hover: 'lift -4px + elevation-4 + img scale', outlier: 'low', why: 'Bespoke ORANGE 2px focus ring (vs the shared blue ring).' },

  // —— Settings ——
  { name: 'Settings nav item x4', surface: 'Settings', loc: 'Settings.scss:34', element: 'NavLink', label: 'Profile / Account / Privacy / Danger Zone', icon: 'left + chevron', family: 'Nav / segmented', base: 'segmented rail', hover: 'bg tint; active ORANGE; danger red', outlier: 'ok', why: 'Active hue now agrees with Account.' },
  { name: 'Settings back link', surface: 'Settings', loc: 'Settings.scss:99', element: 'Link', label: 'Back', icon: 'left: chevron', family: 'Text link', base: 'hardcoded #057780 teal', hover: 'underline', outlier: 'medium', why: 'Stray teal shade, not the #00787e token.' },
  { name: 'Toggle switch x2', surface: 'Settings', loc: 'controls.scss:143', element: 'button[role=switch]', label: 'aria', icon: 'icon-only: knob', family: 'Chip / toggle', base: '44x26 pill switch', hover: 'NONE', outlier: 'medium', why: 'No hover affordance.' },
  { name: 'Upload / Update password / Export', surface: 'Settings', loc: 'controls.scss:218', element: 'button.btn--outline', label: 'Upload photo / …', icon: 'optional', family: 'Outline', base: 'warm-border pill', hover: 'border->teal + text #057780 + lift', outlier: 'medium', why: 'Outline hovers teal (stray #057780) not ink.' },
  { name: 'Save changes / Update email', surface: 'Settings', loc: 'controls.scss:212', element: 'button.btn--primary', label: 'Save changes / Update email', icon: 'none', family: 'Primary fill', base: 'orange fill, compact', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: 'Discard / Remove (avatar)', surface: 'Settings', loc: 'controls.scss:230', element: 'button.btn--ghost', label: 'Discard / Remove', icon: 'none', family: 'Ghost', base: 'ghost', hover: 'colour->ink (or white on dark bar)', outlier: 'ok' },
  { name: 'Delete account (card + modal)', surface: 'Settings', loc: 'controls.scss:235', element: 'button.btn--danger', label: 'Delete account', icon: 'none', family: 'Danger', base: 'red outline', hover: 'red fill + lift + $shadow-danger', outlier: 'ok', why: 'The one true canonical destructive control.' },
  { name: 'Modal close (X)', surface: 'Settings', loc: 'sections.scss:180', element: 'button.btn--icon', label: 'aria: close', icon: 'icon-only: X', family: 'Icon-only', base: 'grey circle', hover: 'bg + colour->ink (no lift)', outlier: 'low' },

  // —— Auth ——
  { name: 'Auth Submit CTA', surface: 'Auth', loc: 'FormStyles.scss:223', element: 'button', label: 'Log in / Create account / …', icon: 'none', family: 'Primary fill', base: 'TEAL fill (accessible), 48px', hover: 'lift + $shadow-teal', outlier: 'ok', why: 'Deliberate teal CTA; darken bug fixed.' },
  { name: 'Google sign-in', surface: 'Auth', loc: 'FormStyles.scss:254', element: 'button', label: 'Continue with Google', icon: 'left: FcGoogle', family: 'Outline', base: 'white, grey border, 48px', hover: 'border->ink + lift + elevation-2', outlier: 'ok', why: 'Now the canonical outline hover; true-colour icon restored.' },
  { name: 'Auth text links', surface: 'Auth', loc: 'FormStyles.scss:144', element: 'Link x N', label: 'Forgot password? / Sign up / Terms / …', icon: 'none', family: 'Text link', base: 'teal #00787e', hover: 'underline', outlier: 'ok' },
  { name: 'Prompt link', surface: 'Auth', loc: 'FormStyles.scss:82', element: 'Link', label: 'inline Log in', icon: 'none', family: 'Text link', base: 'teal #00787e 700', hover: 'NONE', outlier: 'low', why: 'On-brand teal but no hover (siblings underline).' },
  { name: 'Remember-me checkbox', surface: 'Auth', loc: 'FormStyles.scss:114', element: 'input', label: 'Remember me', icon: 'icon-only: check', family: 'Chip / toggle', base: 'custom 18px box', hover: 'border->teal; teal focus ring', outlier: 'ok' },
  { name: 'Cancel and log out', surface: 'Auth', loc: 'CreateUsername.scss:11', element: 'button', label: 'Cancel and log out', icon: 'none', family: 'Text link', base: 'grey, permanently underlined', hover: 'NONE', outlier: 'medium', why: 'No hover; grey, off the auth teal family.' },

  // —— Company / legal / shared ——
  { name: 'About primary CTA x2', surface: 'About', loc: 'About.scss:70', element: 'Link', label: 'Browse recipes', icon: 'right: ArrowRight', family: 'Primary fill', base: 'orange fill, NO resting shadow', hover: 'brighten + lift + $shadow-brand + arrow slide', outlier: 'ok', why: 'Resting shadow removed; glow is hover-only now.' },
  { name: 'About ghost CTA x2', surface: 'About', loc: 'About.scss:86', element: 'Link', label: 'Create an account', icon: 'none', family: 'Ghost', base: 'transparent, grey border', hover: 'lift + bg grey-50 + border lightens', outlier: 'low', why: 'Bordered "ghost" that lifts; border lightens, not ->ink.' },
  { name: 'Help topic chips x4', surface: 'Help', loc: 'Help.scss:59', element: 'button', label: 'Report a bug / Suggest / Ask / Else', icon: 'top: various', family: 'Chip / toggle', base: 'card chip', hover: 'border+text->teal', outlier: 'medium', why: 'Selected label uses raw #00adb5 as text (fails AA).' },
  { name: 'Add a subject / Email fallback', surface: 'Help', loc: 'Help.scss:143', element: 'button / a', label: 'Add a subject / email', icon: 'none', family: 'Text link', base: 'teal #00787e', hover: 'underline', outlier: 'ok' },
  { name: '404 Return Home', surface: '404', loc: '404.scss:98', element: 'button.btn--primary', label: 'Return Home', icon: 'none', family: 'Primary fill', base: 'orange fill, oversized', hover: 'brighten + lift + $shadow-brand', outlier: 'ok' },
  { name: '404 support link', surface: '404', loc: '404.scss:88', element: 'Link', label: 'contact our support team', icon: 'none', family: 'Text link', base: 'teal #00787e', hover: 'underline', outlier: 'ok', why: 'Now on the accessible teal + hovers.' },
  { name: 'Legal body links', surface: 'Legal', loc: 'LegalDocument.scss:78', element: 'a', label: 'inline links', icon: 'none', family: 'Text link', base: 'teal #00787e (was orange)', hover: 'underline', outlier: 'ok' },
  { name: 'EmptyState CTA', surface: 'Shared', loc: 'EmptyState.scss:49', element: 'Link/button.btn--primary', label: 'dynamic', icon: 'optional', family: 'Primary fill', base: 'orange fill on the .btn base', hover: 'brighten + lift + $shadow-brand', outlier: 'ok', why: 'Now composes .btn--primary.' },
]

export const FAMILIES: Family[] = [
  'Primary fill', 'Outline', 'Ghost', 'Danger', 'Text link',
  'Icon-only', 'Chip / toggle', 'Card', 'Nav / segmented',
  'Load more', 'Select / combobox', 'Other',
]

export const SEV_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'ok']
