declare namespace Cypress {
  interface Chainable {
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
    ): Chainable<Element>
    signupProcess(): Chainable<Element>
    login(): Chainable<Element>
  }
}
