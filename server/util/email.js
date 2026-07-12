const { getAuth } = require('firebase-admin/auth')
const { recipeIdQuery } = require('./recipeIdQuery')

// Transactional email for moderation outcomes, behind one thin Resend wrapper so
// the provider can be swapped (SES/Postmark) without touching the call sites.
//
// Deliberately best-effort, exactly like util/auditLog.recordAudit: a send (or
// recipient-lookup) failure must NEVER break the moderation action that triggered
// it, so every public helper swallows its own errors and always resolves. Callers
// `await` it alongside recordAudit but need not guard it.
//
// Env-gated: with no RESEND_API_KEY (dev/CI/test default) the whole module
// no-ops before any Firebase/DB lookup, so it adds zero behavior when disabled.

// Lazily-constructed Resend client. Kept module-local so a single client is
// reused across sends; built on first use only when email is enabled.
let _client = null

// Email is on only when a key is present AND not explicitly killed. Read from
// the environment on every call (not cached at import) so tests can toggle it
// and a missing key in CI cleanly disables sending.
function emailEnabled() {
  if (process.env.EMAIL_ENABLED === 'false') return false
  return !!process.env.RESEND_API_KEY
}

function getClient() {
  if (!emailEnabled()) return null
  if (!_client) {
    // Required lazily so the `resend` package is never loaded when disabled.
    const { Resend } = require('resend')
    _client = new Resend(process.env.RESEND_API_KEY)
  }
  return _client
}

function fromAddress() {
  return process.env.EMAIL_FROM || 'Prepify <onboarding@resend.dev>'
}

function appBaseUrl() {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

// Hard cap on a single provider send. Even though notifications run in the
// background (see notifyInBackground), a hung connection would otherwise keep a
// promise — and its closure — alive indefinitely; this bounds it.
const SEND_TIMEOUT_MS = 10000

// Promise.race against a timer, clearing the timer when `promise` settles so we
// never leak an open handle (important under Jest and for clean shutdown).
function withTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    timeout,
  ])
}

/**
 * Send one email, best-effort. No-ops (returns `{ skipped: true }`) when email is
 * disabled or there is no recipient; on a provider error it logs and returns
 * `{ sent: false, error }` rather than throwing.
 *
 * @param {object} msg
 * @param {string} msg.to       recipient email (falsy ⇒ skipped)
 * @param {string} msg.subject
 * @param {string} msg.html
 * @param {string} msg.text     plain-text fallback
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const client = getClient()
    if (!client || !to) return { sent: false, skipped: true }
    // The Resend SDK does NOT throw on API errors — it resolves with
    // { data, error }. So a 403/validation failure must be read off `error`,
    // not caught; the try/catch only guards transport-level throws.
    const { data, error } = await withTimeout(
      client.emails.send({ from: fromAddress(), to, subject, html, text }),
      SEND_TIMEOUT_MS,
      'email send'
    )
    if (error) {
      console.error('Failed to send email:', error.message)
      return { sent: false, error: error.message }
    }
    return { sent: true, id: data?.id }
  } catch (err) {
    console.error('Failed to send email:', err.message)
    return { sent: false, error: err.message }
  }
}

// --- Recipient resolution ---------------------------------------------------

// Look up a Firebase user's email by uid. Returns null if the user is gone or the
// lookup fails — a missing address just means "nobody to notify", never an error.
async function emailForUid(uid) {
  try {
    const user = await getAuth().getUser(uid)
    return user.email || null
  } catch (err) {
    return null
  }
}

// Reviews are keyed by username (no uid on the doc); the usernames collection is
// _id=uid → username. Look up by the indexed, canonical `username_lower` (the same
// field auth.js/publicProfile.js query) so the match is case-insensitive and hits
// the index instead of scanning.
async function emailForUsername(db, username) {
  try {
    const doc = await db
      .collection('usernames')
      .findOne({ username_lower: String(username).toLowerCase() })
    if (!doc) return null
    return emailForUid(doc._id)
  } catch (err) {
    return null
  }
}

// --- Templates --------------------------------------------------------------

const TEAM = 'The Prepify Team'

// Minimal HTML-escape for user-supplied values interpolated into template HTML
// (recipe titles, moderation reasons).
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Shared inline-styled shell (no external CSS — email clients strip <style>) plus
// a plain-text fallback. Callers pass ONE array of RAW paragraphs; escaping for
// the HTML branch happens here, so a single source of truth backs both bodies
// and no caller has to hand-maintain a parallel text copy (or reverse an escape).
function layout({ heading, paragraphs }) {
  const url = appBaseUrl()
  const htmlParas = paragraphs
    .map((p) => `<p style="margin:0 0 16px;color:#374151;line-height:1.55;">${esc(p)}</p>`)
    .join('')
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;color:#111827;margin:0 0 20px;">${esc(heading)}</h1>
  ${htmlParas}
  <p style="margin:24px 0 8px;">
    <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Go to Prepify</a>
  </p>
  <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">— ${TEAM}</p>
</div>`
  const text = `${heading}\n\n${paragraphs.join('\n\n')}\n\n${url}\n\n— ${TEAM}`
  return { html, text }
}

// The "how to appeal" line. If SUPPORT_EMAIL is configured it names a concrete
// address (the from-address is no-reply, so replies go nowhere); otherwise it
// falls back to generic wording so nothing reads as broken when it's unset.
function appealLine() {
  const support = process.env.SUPPORT_EMAIL
  return support
    ? `If you believe this was a mistake, you can appeal by emailing us at ${support}.`
    : 'If you believe this was a mistake, you can appeal by contacting Prepify support.'
}

const templates = {
  reportResolved() {
    const subject = 'Update on the content you reported'
    return {
      subject,
      ...layout({
        heading: subject,
        paragraphs: [
          'Thanks for helping keep Prepify safe.',
          'We reviewed the content you reported and have taken action in line with our community guidelines. No further action is needed on your part.',
        ],
      }),
    }
  },

  accountStatus({ status, reason }) {
    const banned = status === 'banned'
    const subject = banned
      ? 'Your Prepify account has been banned'
      : 'Your Prepify account has been suspended'
    const paragraphs = [
      `Your Prepify account has been ${banned ? 'banned' : 'suspended'} following a review of activity that violates our community guidelines.`,
    ]
    if (reason) paragraphs.push(`Reason: ${reason}`)
    paragraphs.push(
      banned
        ? 'This decision is permanent and you can no longer post recipes or reviews.'
        : 'While suspended, you will not be able to post recipes or reviews.'
    )
    paragraphs.push(appealLine())
    return { subject, ...layout({ heading: subject, paragraphs }) }
  },

  recipeHidden({ recipeTitle }) {
    const subject = 'Your recipe was removed from Prepify'
    const titleBit = recipeTitle ? ` "${recipeTitle}"` : ''
    return {
      subject,
      ...layout({
        heading: subject,
        paragraphs: [
          `Your recipe${titleBit} has been hidden by our moderation team because it may not meet our community guidelines, and is no longer visible to other users.`,
          appealLine(),
        ],
      }),
    }
  },

  reviewTakenDown({ recipeTitle }) {
    const subject = 'Your review was removed from Prepify'
    const onBit = recipeTitle ? ` on "${recipeTitle}"` : ''
    return {
      subject,
      ...layout({
        heading: subject,
        paragraphs: [
          `One of your reviews${onBit} has been removed by our moderation team because it may not meet our community guidelines.`,
          appealLine(),
        ],
      }),
    }
  },

  // Admin-facing: Cloud Vision flagged a user image with a non-trivial ADULT
  // likelihood (the canary in imageModeration.js). Internal, no appeal line; the
  // body carries the SafeSearch likelihoods so it can be triaged from the inbox.
  adultContentFlagged({ context, adult, racy, violence, verdict }) {
    const subject = 'Prepify moderation: adult-content image flagged'
    return {
      subject,
      ...layout({
        heading: subject,
        paragraphs: [
          'Cloud Vision SafeSearch flagged a user-uploaded image with a non-trivial ADULT likelihood.',
          `Surface: ${context || 'unknown'}`,
          `SafeSearch — adult: ${adult}, racy: ${racy}, violence: ${violence}`,
          `Moderation verdict: ${verdict}`,
          'This is an early-warning signal, NOT CSAM detection. If these recur it is the agreed trigger to stand up dedicated CSAM hash-scanning (see CONTENT_MODERATION.md P3). Further alerts are rate-limited.',
        ],
      }),
    }
  },

  // Admin-facing: a new user bug report landed. No appeal line (internal); the
  // CTA button drops the admin at Prepify, and the body carries the triage bits.
  bugReportFiled({ category, description, url, reporterLabel }) {
    const subject = `New bug report: ${category}`
    const paragraphs = [
      `A new ${category} report was submitted by ${reporterLabel || 'a user'}.`,
    ]
    if (url) paragraphs.push(`Page: ${url}`)
    paragraphs.push(`Description: ${description}`)
    paragraphs.push('Open the admin bug-reports queue to triage it.')
    return { subject, ...layout({ heading: subject, paragraphs }) }
  },
}

// --- Per-event helpers ------------------------------------------------------

// Shared delivery shell: resolve a recipient, build the template, send — all
// best-effort (swallows its own errors, never throws). Every event helper is just
// this plus its own precondition + resolver + template, so adding a 5th event
// doesn't re-introduce the guard/try/catch boilerplate. `buildTemplate` may be
// async (the review event fetches a recipe title first).
async function deliver(resolveRecipient, buildTemplate) {
  try {
    const to = await resolveRecipient()
    if (!to) return // nobody to notify — skip the template build + send
    await sendEmail({ to, ...(await buildTemplate()) })
  } catch (err) {
    console.error('Email notification failed:', err.message)
  }
}

// Best-effort recipe-title lookup for nicer copy; null on any miss/failure.
async function fetchRecipeTitle(db, recipeId) {
  try {
    const recipe = await db
      .collection('recipes')
      .findOne(recipeIdQuery(recipeId), { projection: { title: 1 } })
    return recipe?.title || null
  } catch (e) {
    return null
  }
}

// Report resolved → email the reporter. (Dismiss is intentionally silent.)
function notifyReportResolved(reporterUid) {
  if (!emailEnabled() || !reporterUid) return Promise.resolve()
  return deliver(() => emailForUid(reporterUid), () => templates.reportResolved())
}

// Bulk resolve → email each DISTINCT reporter once, sent serially so a large
// sweep self-throttles under the provider's per-second rate limit instead of
// firing the whole batch at once.
async function notifyReportResolvedMany(reporterUids) {
  if (!emailEnabled()) return
  const unique = [...new Set((reporterUids || []).filter(Boolean))]
  for (const uid of unique) {
    await notifyReportResolved(uid)
  }
}

// Account suspended/banned → email the affected user. Activation is silent.
function notifyAccountStatus(uid, status, reason) {
  if (!emailEnabled() || (status !== 'suspended' && status !== 'banned')) return Promise.resolve()
  return deliver(() => emailForUid(uid), () => templates.accountStatus({ status, reason }))
}

// Recipe hidden → email the owner. Unhide is silent.
function notifyRecipeHidden(ownerUid, recipeTitle) {
  if (!emailEnabled() || !ownerUid) return Promise.resolve()
  return deliver(() => emailForUid(ownerUid), () => templates.recipeHidden({ recipeTitle }))
}

// Review taken down → email the author. Restore is silent.
function notifyReviewTakenDown(db, ownerUsername, recipeId) {
  if (!emailEnabled() || !ownerUsername) return Promise.resolve()
  return deliver(
    () => emailForUsername(db, ownerUsername),
    async () => templates.reviewTakenDown({ recipeTitle: await fetchRecipeTitle(db, recipeId) })
  )
}

// Where new-bug-report alerts go. ADMIN_NOTIFY_EMAIL overrides; otherwise this
// hardcoded default (same inbox already used for contact in the footer). Set the
// env var to point alerts at a dedicated support inbox later without a code change.
const DEFAULT_ADMIN_EMAIL = 'jesselindcs@gmail.com'
function adminNotifyAddress() {
  return process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_ADMIN_EMAIL
}

// New bug report → email the admin so the queue isn't only pull-based. Unlike the
// moderation events this notifies a fixed internal address, not the actor.
function notifyBugReportFiled({ category, description, url, reporterLabel }) {
  if (!emailEnabled()) return Promise.resolve()
  const to = adminNotifyAddress()
  if (!to) return Promise.resolve()
  return deliver(
    () => to,
    () => templates.bugReportFiled({ category, description, url, reporterLabel })
  )
}

// Where adult-content canary alerts go. MODERATION_ALERT_EMAIL overrides; else it
// falls back to the shared admin address. Separate from ADMIN_NOTIFY_EMAIL so the
// safety canary can be pointed at a different inbox without a code change.
function moderationAlertAddress() {
  return process.env.MODERATION_ALERT_EMAIL || adminNotifyAddress()
}

// Throttle for the adult-content canary email: at most one send per window, so a
// burst of bad uploads can't flood the inbox. The per-image console.warn in
// imageModeration.js still fires every time — this only rate-limits the push. The
// last-sent timestamp is module-local (per process); a multi-instance deploy may
// send one-per-instance, which is acceptable for an early-warning. Default 30 min,
// env-overridable (0 disables throttling).
let _lastAdultAlertAt = 0
function adultAlertThrottleMs() {
  const v = Number(process.env.MODERATION_ALERT_THROTTLE_MS)
  return Number.isFinite(v) && v >= 0 ? v : 30 * 60 * 1000
}

// Adult-content image flagged → email the moderation/admin address, throttled and
// best-effort. Returns without sending when disabled, throttled, or there is no
// recipient. The throttle clock only advances on an actual (enabled) attempt.
function notifyAdultContentFlag({ context, adult, racy, violence, verdict }) {
  if (!emailEnabled()) return Promise.resolve()
  const now = Date.now()
  if (now - _lastAdultAlertAt < adultAlertThrottleMs()) return Promise.resolve()
  _lastAdultAlertAt = now
  const to = moderationAlertAddress()
  if (!to) return Promise.resolve()
  return deliver(
    () => to,
    () => templates.adultContentFlagged({ context, adult, racy, violence, verdict })
  )
}

// --- Background dispatch -----------------------------------------------------
// Moderation routes fire notifications WITHOUT awaiting them, so the admin's
// HTTP response never waits on Firebase + the email provider (the action has
// already committed). The promise is tracked so tests — and a future graceful
// shutdown — can await in-flight sends; it can never reject (the helpers swallow
// their own errors, and we attach a catch as a backstop).
const _pending = new Set()

function notifyInBackground(promise) {
  const tracked = Promise.resolve(promise).catch((err) => {
    console.error('Background notification failed:', err && err.message)
  })
  _pending.add(tracked)
  tracked.finally(() => _pending.delete(tracked))
  return tracked
}

// Await all in-flight background notifications (used by tests).
function flushNotifications() {
  return Promise.all([..._pending])
}

module.exports = {
  sendEmail,
  notifyInBackground,
  flushNotifications,
  notifyReportResolved,
  notifyReportResolvedMany,
  notifyAccountStatus,
  notifyRecipeHidden,
  notifyReviewTakenDown,
  notifyBugReportFiled,
  notifyAdultContentFlag,
}
