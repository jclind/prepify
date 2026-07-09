// Auto-mock for 'supertest' (mocks adjacent to node_modules apply to
// node_modules packages automatically, like the sibling firebase-admin mock).
//
// Real supertest, handed an express app, binds a BRAND-NEW ephemeral server for
// every single request and closes it when the response lands — ~800
// listen/connect/close cycles per full suite run. Under CPU/socket pressure
// that churn intermittently breaks at the TCP layer: a connect times out
// (`connect ETIMEDOUT 127.0.0.1:<port>`) or lands on the wrong/stale listener
// and comes back as a bewildering 404/401 from a route that provably exists.
// (Characterized in the X4 flakiness investigation: failing ports sat inside
// the run's own ephemeral-allocation window — they were supertest's own
// one-shot listeners.)
//
// This wrapper keeps ONE listening server per app instance for the whole test
// file and hands supertest that server (supertest reuses a server that is
// already listening instead of binding its own). setup.js closes the servers
// in its afterAll via the __SUPERTEST_SERVERS__ registry. Anything that isn't
// an express app — an http.Server a test manages itself, a URL string — passes
// through to real supertest untouched.
const actual = jest.requireActual('supertest')

const servers = new Map() // app fn -> listening http.Server
globalThis.__SUPERTEST_SERVERS__ = servers

function sharedServerRequest(target, options) {
  if (typeof target === 'function' && typeof target.listen === 'function') {
    let server = servers.get(target)
    if (!server) {
      server = target.listen(0)
      servers.set(target, server)
    }
    return actual(server, options)
  }
  return actual(target, options)
}

// Preserve request.agent / Test / etc.
module.exports = Object.assign(sharedServerRequest, actual)
