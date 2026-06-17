# Prepify

Prepify is a recipe website focused on recipe pricing, fridge/freezer life, nutrition, and much more. It is built using React.js, Typescript, Firebase authentication, and MongoDB for the database.

## Functionality

- Recipe Creation: Users can easily create and share their recipes on Prepify.
- External API Integration: An external API fetches ingredient nutrition and pricing data to enhance recipe details.
- Search and Filter: The website provides a powerful search and filter section to help users find recipes easily.
- Accessibility: Prepify prioritizes up-to-date accessibility standards for a smooth user experience.

## Dependencies and Tech Stack

- React.js
- Typescript
- Scss
- Npm
- Firebase Authentication
- MongoDB
- @jclind/ingredient-parser

## Installation and Running

1. Clone the repository: `git clone https://github.com/jclind/prepify.git`
2. Navigate to the project directory: `cd prepify`
3. Install frontend dependencies: `npm install`
4. Install backend dependencies: `cd server && npm install && cd ..`
5. Create your environment files: copy `.env.example` to `.env` for the frontend and create `server/.env` for the API (see `CLAUDE.md` for the full list of variables). Configure your Firebase, MongoDB, and external API credentials.
6. Start the API server: `cd server && npm run dev` (runs on `http://localhost:4000`)
7. In a separate terminal, start the frontend dev server: `npm start`
8. Access the application at: `http://localhost:3000`

## Contributing

Contributions to Prepify are welcome! If you find any issues or have suggestions for improvements, please feel free to submit a pull request.

We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. Please ensure that your contributions align with our guidelines.

## License

This project is licensed under the [MIT License](LICENSE).
