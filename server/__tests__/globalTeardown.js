// Stops the run-wide in-memory Mongo started by globalSetup.js (same process,
// so the instance is reachable on globalThis).
module.exports = async () => {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop()
  }
}
