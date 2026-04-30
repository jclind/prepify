declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>
    fillSignupInputs(
      username: string,
      email: string,
      password: string,
      options: {
        click?: boolean
        uniqueUsername?: boolean
        uniqueEmail?: boolean
        uniquePassword?: boolean
      }
    ): Chainable<void>
    signupProcess(): Chainable<void>
  }
}
