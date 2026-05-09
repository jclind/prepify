# Upgrade Plan for Prepify Dependencies

**Last updated:** 2026-05-06
**Current status:** 19 outdated packages, 36 CVEs found

---

## Overview

This document provides a safe, incremental upgrade plan for resolving all outdated dependencies and security vulnerabilities in the Prepify project. The plan is organized by stages to minimize risk and allow for testing between each set of changes.

### Quick Reference

| Priority | Package | Installed | Latest | Gap | CVE |
|----------|---------|-----------|--------|-----|-----|
| 1 | firebase | 9.23.0 | 12.12.1 | 3 major | Moderate |
| 1 | cypress | 12.17.4 | 15.14.2 | 3 major | Moderate |
| 1 | react | 17.0.2 | 19.2.6 | 2 major | - |
| 1 | react-dom | 17.0.2 | 19.2.6 | 2 major | - |
| 1 | react-router-dom | 6.30.3 | 7.15.0 | 1 major | - |
| 1 | typescript | 4.9.5 | 6.0.3 | 2 major | - |
| 2 | @testing-library/react | 12.1.5 | 16.3.2 | 4 major | - |
| 2 | @hello-pangea/dnd | 16.6.0 | 18.0.1 | 2 major | - |
| 2 | @types/node | 20.19.39 | 25.6.0 | 1 major | - |
| 2 | @types/jest | 29.5.14 | 30.0.0 | 1 major | - |
| 2 | react-helmet-async | 1.3.0 | 3.0.0 | 2 major | - |
| 2 | react-loader-spinner | 5.4.5 | 8.0.2 | 3 major | - |
| 2 | react-to-print | 2.15.1 | 3.3.0 | 1 major | - |
| 2 | react-top-loading-bar | 2.3.1 | 3.0.2 | 1 major | - |
| 3 | react-scripts | 5.0.0 | 5.0.1 | patch | High |
| 3 | react-icons | 4.12.0 | 5.6.0 | 1 major | - |

---

## Stage 1: Security & Foundation First

### Prompt 1 — Remove unused package ❌

```
Remove @formspree/react from dependencies since it's not imported anywhere in the codebase.
```

**Why:** Static analysis found no imports of this package. Removing it reduces attack surface and dependency tree size.

**Verification:** Run `npm install` to ensure no broken dependencies.

---

### Prompt 2 — Upgrade Firebase (security fix, spans 3 majors) ✅

```
Upgrade firebase from 9.23.0 to the latest version (12.12.1). Check the Firebase v9 to v10 and v10 to v12 migration guides for any breaking changes. Focus on:
- Auth context usage (src/context/AuthContext.tsx)
- Any direct Firebase imports
- Configuration changes needed in environment variables

After upgrading, run the dev server and verify authentication still works.
```

**Why:** Firebase has active moderate-severity CVEs. Spans 3 major versions requiring careful migration.

**Key files to check:**
- `src/context/AuthContext.tsx`
- `src/pages/Settings/SubSettings/Profile.tsx`
- `src/pages/Settings/SubSettings/Password.tsx`
- `.env` files

**Verification steps:**
1. Run `npm start`
2. Test login/logout flow
3. Test password reset
4. Check console for deprecation warnings

---

### Prompt 3 — Upgrade Cypress (security fix, spans 3 majors) ✅

```
Upgrade cypress from 12.17.4 to the latest version (15.14.2). Review the Cypress 13, 14, and 15 breaking changes, particularly:
- Configuration changes in cypress.config.ts
- Any API changes in test files
- Command syntax changes

After upgrading, run `npx cypress open` to verify tests still load correctly.
```

**Why:** Cypress has moderate-severity CVEs via @cypress/request. Spans 3 major versions.

**Key files to check:**
- `cypress.config.ts`
- `cypress/e2e/` test files
- `cypress/support/` files

**Verification steps:**
1. Run `npx cypress open`
2. Run all E2E tests
3. Check for configuration errors

---

## Stage 2: TypeScript Foundation

### Prompt 4 — Upgrade TypeScript (4.9.5 → 6.0.3) ✅

```
Upgrade typescript from 4.9.5 to the latest version (6.0.3). Review TypeScript 5.x and 6.x breaking changes. Check for:
- Stricter type checking that may cause new errors
- Changes in type inference
- Deprecated syntax

After upgrading, run `npm run build` to check for type errors and fix any issues that arise.
```

**Why:** TypeScript 6.0.3 introduces significant improvements and stricter type checking. This is foundational for other type definition upgrades.

**Key areas that may need fixes:**
- Type assertions
- Generic constraints
- Any `any` types that might now error
- Index signatures

**Verification steps:**
1. Run `npm run build`
2. Fix any type errors that appear
3. Run `npm test` to verify test types are still valid

---

### Prompt 5 — Upgrade @types packages (follow TypeScript) ✅

```
Upgrade @types/node from 20.19.39 to the latest (25.6.0) and @types/jest from 29.5.14 to the latest (30.0.0).

Note: Do NOT upgrade @types/react or @types/react-dom yet — they must match the React version you'll upgrade in the next stage.
```

**Why:** Type definitions should stay current with their runtime packages. These are straightforward upgrades.

**Verification steps:**
1. Run `npm run build`
2. Check for any type errors related to Node.js or Jest APIs

---

## Stage 3: React Core (17 → 19)

### Prompt 6 — Upgrade React & React DOM together ✅

NOTES FROM RUN:
Code changes
  - src/index.js: ReactDOM.render → createRoot().render (required by React
  18+)
  - 7 type fixes for React 19's stricter ref types (RefObject<T> is now
  RefObject<T | null>, MutableRefObject deprecated, useRef() requires
  initial value)
  - Drag.tsx: tightened ReactElement → ReactElement<any> so cloneElement
  accepts custom props

  Dependencies
  - react, react-dom: 17.0.2 → 19.2.6
  - @types/react: 18.2.79 → 19.2.14
  - @types/react-dom: 18.2.25 → 19.2.3
  - @hello-pangea/dnd: 16.6.0 → 18.0.1 (needed for React 19 peer)
  - @testing-library/react: 12.1.5 → 16.3.2 (needed for React 19)
  - ajv: added @^8.20.0 to fix a known react-scripts 5 / ajv-keywords
  resolution issue

  Verification
  - tsc --noEmit clean
  - npm run build succeeds (gzipped main bundle 346 kB)
  - npm test — 78/78 vitest tests pass
  - npm start compiles, dev server returns 200 on / and serves the bundle

  Caveats
  - npm install requires --legacy-peer-deps because react-alert@7.0.3
  declares peer react@^16.8.1 || ^17. The library is hooks-only and works
  at runtime with React 19, but its peer range is stale. Long-term you'll
  want to either replace react-alert (e.g. react-hot-toast, sonner) or add
  an overrides block. CI scripts will need the flag too.
  - I verified the dev server compiles and serves correctly via curl, but
  did not exercise the UI in a real browser — drag-and-drop, modals, forms,
   react-alert toasts, and react-to-print should all be smoke-tested
  manually before merging.
  - StrictMode now double-invokes effects/state setters in dev. If anything
   looks odd (double API calls, double inserts), that's the cause and
  should be fixed in the effect, not by removing StrictMode.

  END NOTES

```
Upgrade react and react-dom from 17.0.2 to the latest version (19.2.6). Review the React 18 and React 19 migration guides. Key things to check:
- Concurrent rendering effects (React 18)
- StrictMode behavior changes
- Any removed or deprecated APIs (e.g., componentWillMount, UNSAFE_componentWillMount)
- New hooks available in React 19
- Changes to event handling
- Form handling changes in React 19

After upgrading, also update @types/react and @types/react-dom to match the new React version.

Run `npm start` and manually test the app. Pay special attention to:
- Recipe rendering
- Drag-and-drop functionality (Dnd components)
- Forms (add recipe, reviews, settings)
- Modals
- Any custom hooks or lifecycle methods
```

**Why:** React 17 → 19 skips an entire major version (React 18). This is the highest-risk upgrade and affects the entire codebase.

**Key breaking changes to review:**
- **React 18:** StrictMode double-invoking effects, concurrent rendering
- **React 19:** Removed deprecated APIs, new hooks (use, useOptimistic, useFormStatus)
- Event handling: SyntheticEvent changes
- Form handling: React 19 introduces built-in form handling

**Files likely needing updates:**
- Class components using deprecated lifecycle methods
- Event handlers using synthetic event properties
- Forms (consider using React 19's new form features)

**Verification steps:**
1. Run `npm start`
2. Test all pages load correctly
3. Test recipe creation/editing
4. Test drag-and-drop in Instructions
5. Test modals (confirm delete, etc.)
6. Test authentication flows
7. Check console for warnings/errors
8. Run `npm test` and fix any failing tests

---

## Stage 4: React Ecosystem (after React 19 is stable)

### Prompt 7 — Upgrade React Router (6 → 7) ✅

NOTES FROM RUN:
No code changes required. All existing API usage (BrowserRouter, Routes, Route,
useNavigate, useLocation, useParams, Link, NavLink, Navigate, Outlet, MemoryRouter)
is unchanged in v7 when using library mode. NavLink className callbacks already used
the v6.4+ `({ isActive }) => ...` pattern which is identical in v7.

Dependencies
- react-router-dom: 6.30.3 → 7.15.0 (added react-router as transitive dep)
- Bundle size: +7.24 kB gzipped

Verification
- npm install succeeded (--legacy-peer-deps required, same as rest of project)
- tsc --noEmit clean (only pre-existing baseUrl deprecation warning)
- npm run build succeeds (gzipped main bundle 353 kB)
- npm test — 78/78 vitest tests pass
- No route config changes needed (BrowserRouter + Routes + Route stays as-is)

Caveats
- v7 makes all v6 "future flags" default — this only affects data router users;
  this project uses BrowserRouter so no behavioral changes.
- Manual navigation testing (back/forward, URL params, account sub-routes) should
  be smoke-tested in a browser before merging.

END NOTES

```
Upgrade react-router-dom from 6.30.3 to the latest version (7.15.0). Review React Router v7 breaking changes. Check:
- Route configuration changes
- useNavigate, useLocation, useParams API changes
- Any removed hooks or components
- Data router changes (if used)

After upgrading, test all navigation:
- Home, Recipes, AddRecipe, Account, Help pages
- Recipe detail pages
- Back/forward browser navigation
- URL parameters handling
```

**Why:** React Router v7 introduces breaking changes. This is a high-impact library affecting navigation throughout the app.

**Key files to check:**
- `src/App.tsx` (route configuration)
- Any components using `useNavigate`, `useLocation`, `useParams`

**Verification steps:**
1. Click through all navigation links
2. Test browser back/forward buttons
3. Test direct URL access
4. Test recipe detail pages with IDs in URL

---

### Prompt 8 — Upgrade React Testing Library (12 → 16)

```
Upgrade @testing-library/react from 12.1.5 to the latest version (16.3.2). Review the breaking changes between versions. Update test files in src/test/ for:
- New or changed query methods
- Changes in render options
- Act() API changes
- fireEvent vs userEvent preference

After upgrading, run `npm test` and fix any failing tests.
```

**Why:** Spans 4 major versions. Testing library API has evolved significantly.

**Key changes:**
- Prefer `userEvent` over `fireEvent` for more realistic user interaction
- Query method deprecations (e.g., `getByAltText` vs others)
- Render options changes

**Files to check:**
- All files in `src/test/`

**Verification steps:**
1. Run `npm test`
2. Fix any failing tests
3. Ensure test coverage remains

---

### Prompt 9 — Upgrade Drag-and-Drop Library ✅

```
Upgrade @hello-pangea/dnd from 16.6.0 to the latest version (18.0.1). Review breaking changes, focusing on:
- Drag and drop context usage
- Droppable and Draggable API changes
- onDragEnd handler signature changes

After upgrading, test the drag-and-drop functionality in AddRecipe → Instructions → drag to reorder instructions.
```

**Why:** Spans 2 major versions. Drag-and-drop is a critical user-facing feature.

**Key files to check:**
- `src/pages/AddRecipe/Dnd/Drop.tsx`
- `src/pages/AddRecipe/Dnd/Drag.tsx`
- `src/pages/AddRecipe/Instructions/InstructionItem/InstructionItem.tsx`

**Verification steps:**
1. Go to AddRecipe → Instructions
2. Drag instructions to reorder
3. Verify order persists after save
4. Test on mobile if possible

---

## Stage 5: UI Component Libraries

### Prompt 10 — Upgrade UI libraries (batch these as they're lower risk)

```
Upgrade the following packages to their latest versions:
- react-helmet-async: 1.3.0 → 3.0.0
- react-loader-spinner: 5.4.5 → 8.0.2
- react-to-print: 2.15.1 → 3.3.0
- react-top-loading-bar: 2.3.1 → 3.0.2
- react-icons: 4.12.0 → 5.6.0

For each, check the changelog for breaking changes and update imports/API calls accordingly. Test:
- Page titles/meta tags (react-helmet-async)
- Loading spinners
- Print functionality (PrintRecipeBtn)
- Loading bar behavior
- Icon rendering throughout the app
```

**Why:** These are isolated UI components with smaller surface areas. Safe to batch.

**Key files to check:**
- `src/App.tsx` (react-helmet-async, react-top-loading-bar)
- `src/pages/SingleRecipe/Buttons/PrintRecipeBtn.tsx`
- Icon imports throughout the codebase

**Verification steps:**
1. Check page titles in browser tab
2. Verify loading spinners appear and disappear correctly
3. Test print functionality (Ctrl+P / Cmd+P)
4. Verify loading bar behavior on navigation
5. Spot-check icons across the app

---

## Stage 6: Final Polish

### Prompt 11 — Upgrade React Scripts

```
Upgrade react-scripts from 5.0.0 to 5.0.1. This is a patch update but has some transitive dependency security fixes.

After upgrading, run:
- `npm run build` to verify production build works
- `npm start` to verify dev server works
- Check for any new warnings in the console
```

**Why:** Patch update with security fixes in transitive dependencies. Low risk but important for security posture.

**Verification steps:**
1. Run `npm run build`
2. Check build output for errors/warnings
3. Run `npm start` and verify dev server
4. Check browser console for new warnings

---

### Prompt 12 — Final verification

```
Run a full audit and verification:
1. Run `npm audit` to confirm no remaining vulnerabilities
2. Run `npm test` to ensure all tests pass
3. Run `npm run build` to verify production build
4. Manually test the app's core features:
   - Authentication (login/logout)
   - Viewing recipes
   - Adding/editing recipes
   - Reviews and ratings
   - Saving recipes
   - Search and filters
   - Drag-and-drop
   - Print functionality
   - Mobile responsiveness
```

**Why:** Final sanity check to ensure everything works together after all upgrades.

---

## Summary of Prompts

| Order | Prompt | Focus | Risk |
|-------|--------|-------|------|
| 1 | Remove @formspree/react | Cleanup | Low |
| 2 | Upgrade firebase | Security + 3 majors | High |
| 3 | Upgrade cypress | Security + 3 majors | Medium |
| 4 | Upgrade typescript | Foundation | High |
| 5 | Upgrade @types/node, @types/jest | Type defs | Low |
| 6 | Upgrade react, react-dom, @types/react, @types/react-dom | Core + 2 majors | Very High |
| 7 | Upgrade react-router-dom | Routing + 1 major | High |
| 8 | Upgrade @testing-library/react | Testing + 4 majors | Medium |
| 9 | Upgrade @hello-pangea/dnd | Drag-drop + 2 majors | Medium |
| 10 | Upgrade UI libraries batch | Components | Low-Medium |
| 11 | Upgrade react-scripts | Build tool + patch | Medium |
| 12 | Full verification | Final checks | - |

---

## Tips for Safe Execution

1. **Run tests after each stage** — Don't batch multiple stages without testing
2. **Commit between stages** — If something breaks, you can easily revert
3. **Read changelogs** — Claude can fetch and summarize breaking changes for each package
4. **Test core features** after React upgrade — authentication, forms, navigation, and state management
5. **Watch console warnings** — New versions often deprecate APIs that still work but warn you
6. **Check package-lock.json** — Ensure it's updated correctly after each install
7. **Verify on different browsers** — Some changes may affect browser compatibility

---

## Rollback Strategy

If any stage introduces breaking issues:

1. `git diff package.json package-lock.json` to see what changed
2. `git checkout -- package.json package-lock.json` to revert
3. `rm -rf node_modules && npm install` to clean install previous versions
4. Commit the rollback and note which stage failed
5. Review the package's migration guide more carefully before retrying

---

## References

- [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/12/05/react-19)
- [React Router v7 Upgrade Guide](https://reactrouter.com/start/upgrade)
- [TypeScript 5.x Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5.html)
- [TypeScript 6.x Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6.html)
- [Firebase Web SDK Migration Guide](https://firebase.google.com/docs/web/modular-upgrade)
- [Cypress 13+ Migration Guide](https://docs.cypress.io/guides/references/migration-guide)
