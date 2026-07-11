// Must load first so Sentry instruments express before it's required below.
require('./instrument')
const Sentry = require('@sentry/node')
const app = require('./app')
const { connectDB, closeDB } = require('./db')

const PORT = process.env.PORT || 4000

connectDB()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`)
    })

    // Graceful shutdown. Railway sends SIGTERM on every deploy/rollout (and
    // SIGINT on a local Ctrl-C): stop accepting new connections, drain the
    // in-flight ones, close the Mongo client, then exit 0. A ~10s force-exit
    // timer guarantees the process still dies if a connection or the client
    // hangs, so a rollout can never wedge on a stuck instance.
    let shuttingDown = false
    const shutdown = signal => {
      if (shuttingDown) return
      shuttingDown = true
      console.log(`Received ${signal}, shutting down gracefully`)
      const force = setTimeout(() => {
        console.error('Graceful shutdown timed out after 10s, forcing exit')
        process.exit(1)
      }, 10000)
      server.close(async () => {
        try {
          await closeDB()
        } catch (err) {
          console.error('Error closing Mongo during shutdown:', err.message)
        }
        clearTimeout(force)
        process.exit(0)
      })
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  })

// Crash-and-restart on a truly unexpected fault: an unhandled rejection or an
// uncaught exception leaves the process in an undefined state, so the correct
// response on Railway (which restarts a crashed process) is to log it, surface
// it to Sentry, flush the queued event, and exit non-zero. Sentry.* are safe
// no-ops when SENTRY_DSN is unset (dev/CI), so no init guard is needed; the
// captureException is still wrapped so a Sentry failure can't block the exit.
const handleFatal = (err, origin) => {
  console.error(`Fatal ${origin}:`, err)
  try {
    Sentry.captureException(err)
    Sentry.flush(2000).finally(() => process.exit(1))
  } catch {
    process.exit(1)
  }
}
process.on('unhandledRejection', reason => handleFatal(reason, 'unhandledRejection'))
process.on('uncaughtException', err => handleFatal(err, 'uncaughtException'))
