# Bug Report: `axios.create is not a function` in `@jclind/ingredient-parser`

**Status:** Open  
**Severity:** High — blocks app load on localhost and any webpack 5 build  
**Affected package:** `@jclind/ingredient-parser` (owned)  
**Affected file:** `dist/src/api/http.js` (compiled from `src/api/http.ts`)

---

## Symptom

Visiting the app in the browser throws an uncaught error that prevents the page from loading:

```
Uncaught TypeError: axios_1.default.create is not a function
    at ./node_modules/@jclind/ingredient-parser/dist/src/api/http.js (http.js:9)
    at ./node_modules/@jclind/ingredient-parser/dist/src/api/requests.js (requests.js:17)
```

---

## Root Cause

The compiled `http.js` uses TypeScript's `__importDefault` helper to import axios:

```js
// dist/src/api/http.js
const axios_1 = __importDefault(require("axios"));
exports.spoonacularHttp = axios_1.default.create({ ... });
```

`__importDefault` wraps a module as `{ default: theModule }` only when the module lacks `__esModule: true`. This assumption breaks with **axios 1.x under webpack 5**.

Axios 1.x ships with `"type": "module"` and a conditional `exports` map:

```json
"browser": {
  "require": "./dist/browser/axios.cjs",
  "default": "./index.js"
}
```

Webpack 5 (used by Create React App) does not consistently apply the `"require"` condition when bundling browser code. Depending on how the module graph resolves, `require("axios")` can return an object where `.default` is not the axios instance — and therefore has no `.create` method.

---

## Current Workaround

A `patch-package` patch exists at `patches/@jclind+ingredient-parser+1.2.11.patch`, but it is **not being applied** because the installed version is `1.2.13` and `patch-package` matches on the exact version in the filename.

---

## Fix (in the source package)

In `src/api/http.ts`, replace the bare axios import with a defensive shim that handles both possible resolution shapes:

```typescript
import _axios from 'axios';

// axios 1.x + webpack 5 CJS/ESM interop: .create may be on the import itself
// or on .default depending on how the bundler resolves the exports map
const axios = (typeof (_axios as any).create === 'function') ? _axios : (_axios as any).default;
```

Then use `axios.create({...})` throughout the file instead of `_axios.create({...)`.

---

## Steps to Close

1. Apply the fix above in the `@jclind/ingredient-parser` source repo
2. Publish a new version (e.g. `1.2.14`)
3. Update `package.json` in prepify: `"@jclind/ingredient-parser": "^1.2.14"`
4. Delete all `patches/@jclind+ingredient-parser+*.patch` files
