# Prepify Ingredient Parser Service

A standalone Express service for parsing ingredient strings and fetching structured ingredient data from Spoonacular API with MongoDB caching.

## What This Service Does

1. Receives ingredient strings via `POST /parse`
2. Checks MongoDB Atlas for cached results by ingredient name
3. If cached, returns the cached document immediately
4. If not cached, calls the Spoonacular API to fetch ingredient data, persists it to MongoDB, then returns it
5. All requests are authenticated via Firebase ID tokens

## Environment Variables

Create a `.env` file in the root directory:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/prepify?retryWrites=true&w=majority
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}
PORT=4001
```

See `.env.example` for the template.

## Running Locally

```bash
cd server-ingredients
npm install
npm run dev
```

The service will start on port 4001 (or the PORT specified in your .env).

## API Endpoint

### POST /parse

Authenticates requests via Firebase ID token (Bearer token in Authorization header).

**Request:**

```json
{
  "ingredientString": "1 cup rice, washed",
  "spoonacularApiKey": "user-provided-key"
}
```

**Response (cache hit):**

```json
{
  "source": "cache",
  "data": {
    "id": 20081,
    "name": "rice",
    "image": "rice.jpg",
    "nutrition": { ... },
    "possibleUnits": ["cup", "g", "oz"],
    "estimatedCost": { ... },
    "aisle": "Pasta and Rice"
  }
}
```

**Response (cache miss, fetched from Spoonacular):**

```json
{
  "source": "spoonacular",
  "data": { ... }
}
```

## Deploying to Railway

1. Create a new Railway project
2. Set the root directory to `server-ingredients/`
3. Configure environment variables in Railway settings:
   - `MONGO_URI`
   - `FIREBASE_SERVICE_ACCOUNT` (as a JSON string)
   - `PORT` (default: 4001)
4. Deploy

The `railway.json` file is included in this directory with the appropriate build and deploy configuration.
