# Scaffold Notes

## Decisions Made

### Firebase Middleware Pattern
- Copied the exact pattern from `server/middleware/auth.js`
- Sets `req.uid` (not `req.user`) to match the existing pattern
- Includes the guard against double initialization (`!admin.apps.length`)

### Ingredient Name Extraction
- Currently using the full trimmed `ingredientString` as the cache lookup key
- Added a comment in `routes/parse.js` noting that smarter parsing can be added later
- This is a deliberate simplification for the initial scaffold

### Database Connection
- Directly uses `MongoClient` from `mongodb` package in `index.js`
- Attaches `db` instance to `app.locals.db` for route access (same pattern used by Express apps)
- Connection failure exits with code 1 (matching `server/index.js` pattern)

### Spoonacular Response Mapping
- Maps only the fields explicitly required: `id`, `name`, `image`, `nutrition`, `possibleUnits`, `estimatedCost`, `aisle`
- Additional fields from Spoonacular response are not included

### CORS Configuration
- Uses default `cors()` without origin restrictions for simplicity
- Main `server/` has a more complex CORS setup with allowed origins, but `server-ingredients/` keeps it simple as specified

## Verification Results

- ✅ `npm install` completed successfully (with expected deprecation warnings from dependency versions)
- ✅ All relative paths in `index.js` and `routes/parse.js` are correct
- ✅ `.env` is in `.gitignore`
- ✅ All 10 files created as specified
