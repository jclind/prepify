const { getDB } = require('../db')

// ─── Paid-API daily spend ceiling (audit H1) ────────────────────────────────
//
// The per-user-per-MINUTE limiters (writeLimiter / parseLimiter / nutrition) and
// the global per-IP backstop bound BURST rate, but nothing bounds cumulative
// daily spend: a fresh Firebase account resets the per-uid minute budget and IPs
// rotate freely, so an attacker with N throwaway accounts multiplies the paid
// Spoonacular/Edamam/Vision/OpenAI bill linearly (a Sybil quota-drain / dollar-
// cost DoS). This adds two DAILY counters per paid surface, in Mongo:
//   • a per-ACCOUNT daily cap  — bounds a single account's daily spend, and
//   • a global daily ceiling   — bounds TOTAL daily spend across ALL accounts,
//     which is the one that actually defeats Sybil (it doesn't matter how many
//     accounts an attacker mints once the aggregate ceiling trips).
//
// Counters live in the `paidQuota` collection, keyed by UTC day + surface (+ uid
// for the per-account counter), and self-reap via a TTL index on `expireAt`
// (db.js). The per-account counter is incremented first and, if it's over cap,
// the global counter is NOT touched — so one abusive account can't inflate the
// global number with its own rejected overflow.

// A UTC calendar-day key (YYYY-MM-DD). UTC (not local) so the daily window is
// stable regardless of server timezone and every replica agrees on "today".
function utcDayKey(now) {
  return now.toISOString().slice(0, 10)
}

// Atomically increment one counter and return its post-increment value. Upserts
// the doc on the first hit of the day, stamping `expireAt` two days out so the
// TTL index reaps it after the window has fully passed.
async function bumpCounter(db, id, day, now) {
  const expireAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const doc = await db.collection('paidQuota').findOneAndUpdate(
    { _id: id },
    {
      $inc: { count: 1 },
      $setOnInsert: { day, expireAt },
    },
    { upsert: true, returnDocument: 'after' }
  )
  return doc.count
}

// Increment the per-account and global daily counters for `surface` and decide
// whether the call may proceed. A cap of N permits counts 1..N and rejects the
// N+1'th call (count > cap). `now` is injectable for tests. Returns:
//   { allowed: true }
//   { allowed: false, scope: 'user' | 'global', count, cap }
async function bumpAndCheckQuota(db, { surface, uid, perUserDaily, globalDaily, now = new Date() }) {
  const day = utcDayKey(now)

  // Per-account first — reject (and skip the global bump) if this one account has
  // already spent its daily allowance, so its overflow never pollutes the global
  // counter.
  const userCount = await bumpCounter(db, `${day}:${surface}:u:${uid}`, day, now)
  if (userCount > perUserDaily) {
    return { allowed: false, scope: 'user', count: userCount, cap: perUserDaily }
  }

  const globalCount = await bumpCounter(db, `${day}:${surface}:g`, day, now)
  if (globalCount > globalDaily) {
    return { allowed: false, scope: 'global', count: globalCount, cap: globalDaily }
  }

  return { allowed: true }
}

// Read an integer cap from env, falling back to `fallback` when unset/invalid.
function envInt(name, fallback) {
  const raw = process.env[name]
  const n = raw != null ? parseInt(raw, 10) : NaN
  return Number.isInteger(n) && n > 0 ? n : fallback
}

// Charge one call against the daily quota for a paid `surface`, from inside a
// handler. Use this instead of the middleware when the paid call is conditional
// or should only be charged after validation (a Vision scan runs only when an
// image is set or changed). Needs req.uid. Returns true when the caller may
// proceed; otherwise it has already sent the 429 and returns false.
//
// Skipped under Jest like the sibling rate limiters (the suite fires many
// requests per uid), unless PAID_QUOTA_ENFORCE_IN_TEST is set by a test that
// exercises the quota through a route. Caps are read from env at call time with
// the given defaults, so a deploy can tighten them without a code change:
//   PAID_QUOTA_<SURFACE>_USER_DAILY   / PAID_QUOTA_<SURFACE>_GLOBAL_DAILY
// Fails OPEN on a counter-DB error: a transient Mongo hiccup must not hard-block
// legitimate paid calls (the per-minute limiters still bound burst); the error is
// logged so a real outage surfaces.
async function chargePaidQuota(req, res, {
  surface,
  perUserDaily,
  globalDaily,
  message = 'Daily limit reached for this feature — please try again tomorrow.',
}) {
  if (process.env.NODE_ENV === 'test' && !process.env.PAID_QUOTA_ENFORCE_IN_TEST) return true
  const envPrefix = `PAID_QUOTA_${surface.toUpperCase()}`
  try {
    const result = await bumpAndCheckQuota(getDB(), {
      surface,
      uid: req.uid,
      perUserDaily: envInt(`${envPrefix}_USER_DAILY`, perUserDaily),
      globalDaily: envInt(`${envPrefix}_GLOBAL_DAILY`, globalDaily),
    })
    if (!result.allowed) {
      // Log the global trip loudly — it means the aggregate spend ceiling was
      // hit, which is either a real spike or an in-progress abuse wave worth
      // alerting on.
      if (result.scope === 'global') {
        console.error(
          `[paidQuota] GLOBAL daily ceiling hit for surface=${surface} (count=${result.count}, cap=${result.cap})`
        )
      }
      res.status(429).json({ error: message, code: 'DAILY_QUOTA_EXCEEDED' })
      return false
    }
    return true
  } catch (err) {
    console.error(`[paidQuota] counter check failed for surface=${surface}, failing open:`, err && err.message)
    return true
  }
}

// Build an Express middleware enforcing the daily quota for one paid `surface`
// on every request. Mount AFTER verifyToken (needs req.uid). Same options and
// behavior as chargePaidQuota.
function makePaidQuotaLimiter(opts) {
  return async function paidQuotaLimiter(req, res, next) {
    if (await chargePaidQuota(req, res, opts)) next()
  }
}

// Cloud Vision SafeSearch scans outside recipe create: a profile photo set and a
// recipe image change on edit. Recipe create is metered under the 'recipe'
// surface instead, since every create scans. 20 scans per account per day is
// several times any real editing session; 1000 a day globally caps the worst
// case at about $1.50 of Vision. Overridable via PAID_QUOTA_VISION_USER_DAILY /
// PAID_QUOTA_VISION_GLOBAL_DAILY.
const VISION_QUOTA = {
  surface: 'vision',
  perUserDaily: 20,
  globalDaily: 1000,
  message: 'Daily image-upload limit reached — please try again tomorrow.',
}

module.exports = { makePaidQuotaLimiter, chargePaidQuota, VISION_QUOTA, bumpAndCheckQuota, utcDayKey }
