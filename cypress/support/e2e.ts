import './commands'

// Suppress known browser noise that doesn't indicate real app failures.
// Return true (or nothing) for anything else so actual crashes still fail tests.
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop')) return false
  return true
})
