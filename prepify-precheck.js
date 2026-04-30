#!/usr/bin/env node
/**
 * Prepify Server Precheck
 * Run from your project root: node prepify-precheck.js
 *
 * Checks everything Session 1 needs before Claude Code runs.
 * Does not modify any files.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = process.cwd()
let passed = 0
let warned = 0
let failed = 0

function ok(msg)   { console.log(`  ✅ ${msg}`); passed++ }
function warn(msg) { console.log(`  ⚠️  ${msg}`); warned++ }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++ }
function section(title) { console.log(`\n── ${title} ──`) }

// ─── 1. Node version ───────────────────────────────────────────────────────
section('Node.js')
const nodeVersion = parseInt(process.version.slice(1).split('.')[0])
if (nodeVersion >= 18) ok(`Node ${process.version}`)
else fail(`Node ${process.version} — need v18+. Install from nodejs.org`)

// ─── 2. Project root looks right ───────────────────────────────────────────
section('Project root')
const rootPkg = path.join(ROOT, 'package.json')
if (fs.existsSync(rootPkg)) {
  const pkg = JSON.parse(fs.readFileSync(rootPkg, 'utf8'))
  if (pkg.name) ok(`Found root package.json — "${pkg.name}"`)
  else warn('Root package.json has no name field')

  // Check it's the frontend, not something else
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (deps.react) ok('React detected — this is the frontend root ✓')
  else warn('React not found in root package.json — are you in the right directory?')
} else {
  fail('No package.json found — run this from your project root')
}

// ─── 3. server/ doesn't already exist ─────────────────────────────────────
section('server/ directory')
const serverDir = path.join(ROOT, 'server')
if (!fs.existsSync(serverDir)) {
  ok('server/ does not exist yet — Claude Code will create it cleanly')
} else {
  const existing = fs.readdirSync(serverDir)
  if (existing.length === 0) {
    ok('server/ exists but is empty — fine to proceed')
  } else {
    warn(`server/ already exists with ${existing.length} file(s): ${existing.join(', ')}`)
    console.log('     Claude Code will write into it. Check for conflicts manually.')
  }
}

// ─── 4. .gitignore checks ──────────────────────────────────────────────────
section('.gitignore')
const gitignore = path.join(ROOT, '.gitignore')
if (fs.existsSync(gitignore)) {
  const content = fs.readFileSync(gitignore, 'utf8')
  if (content.includes('.env')) ok('.env is gitignored')
  else fail('.env is NOT in .gitignore — add it before creating server/.env')

  if (content.includes('node_modules')) ok('node_modules is gitignored')
  else warn('node_modules not in .gitignore — consider adding it')
} else {
  fail('No .gitignore found — create one and add .env and node_modules/')
}

// ─── 5. Frontend .env exists ───────────────────────────────────────────────
section('Frontend environment')
const frontendEnv = path.join(ROOT, '.env')
if (fs.existsSync(frontendEnv)) {
  ok('.env file exists')
  const envContent = fs.readFileSync(frontendEnv, 'utf8')
  const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  const keys = lines.map(l => l.split('=')[0].trim())

  const firebaseKeys = keys.filter(k => k.startsWith('REACT_APP_FIREBASE'))
  if (firebaseKeys.length > 0) ok(`Firebase frontend vars found (${firebaseKeys.length})`)
  else warn('No REACT_APP_FIREBASE_ vars found — is Firebase configured?')
} else {
  warn('No root .env found — frontend may rely on env vars not yet set')
}

// ─── 6. http-common.ts baseURL ─────────────────────────────────────────────
section('Frontend API config (http-common)')
const httpCommonPaths = [
  path.join(ROOT, 'src', 'api', 'http-common.ts'),
  path.join(ROOT, 'src', 'api', 'http-common.js'),
  path.join(ROOT, 'src', 'http-common.ts'),
  path.join(ROOT, 'src', 'http-common.js'),
]
const foundHttpCommon = httpCommonPaths.find(p => fs.existsSync(p))
if (foundHttpCommon) {
  ok(`Found ${path.relative(ROOT, foundHttpCommon)}`)
  const content = fs.readFileSync(foundHttpCommon, 'utf8')
  const baseUrlMatch = content.match(/baseURL['":\s]+['"`]([^'"`]+)['"`]/)
  if (baseUrlMatch) {
    const url = baseUrlMatch[1]
    console.log(`     Current baseURL: "${url}"`)
    if (url.includes('mongodb') || url.includes('realm') || url.includes('data.mongodb-api')) {
      warn('baseURL still points at old MongoDB endpoint — Session 2 will update this')
    } else if (url.includes('localhost')) {
      ok('baseURL points at localhost — good for local dev')
    } else {
      ok('baseURL found — review it manually')
    }
  } else {
    warn('Could not detect baseURL — check http-common manually')
  }
} else {
  warn('http-common not found at expected paths — Claude Code will need the correct path')
  console.log('     Searched:', httpCommonPaths.map(p => path.relative(ROOT, p)).join(', '))
}

// ─── 7. MongoDB URI ────────────────────────────────────────────────────────
section('MongoDB URI')
const hasMongoUri = process.env.MONGO_URI ||
  (fs.existsSync(frontendEnv) &&
    fs.readFileSync(frontendEnv, 'utf8').includes('MONGO_URI'))

if (process.env.MONGO_URI) {
  const uri = process.env.MONGO_URI
  if (uri.startsWith('mongodb+srv://')) ok('MONGO_URI env var found and looks valid')
  else warn('MONGO_URI found but does not start with mongodb+srv:// — double check it')
} else {
  warn('MONGO_URI not set as env var')
  console.log('     You will need it before starting the server.')
  console.log('     Get it from: Atlas → your cluster → Connect → Drivers → copy the URI')
  console.log('     It looks like: mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/prepify')
}

// ─── 8. Git status ─────────────────────────────────────────────────────────
section('Git')
try {
  const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim()
  if (status === '') {
    ok('Working tree is clean — safe to run Claude Code')
  } else {
    const lines = status.split('\n')
    warn(`${lines.length} uncommitted change(s) in working tree`)
    console.log('     Consider committing or stashing before running Claude Code')
    lines.slice(0, 5).forEach(l => console.log(`     ${l}`))
    if (lines.length > 5) console.log(`     ...and ${lines.length - 5} more`)
  }
} catch {
  warn('Not a git repo or git not available — skipping')
}

// ─── 9. Port 4000 available ────────────────────────────────────────────────
section('Port availability')
try {
  const result = execSync('lsof -i :4000 -t', { stdio: 'pipe' }).toString().trim()
  if (result) warn('Port 4000 is in use — something is already running there')
  else ok('Port 4000 is free')
} catch {
  ok('Port 4000 appears free')
}

// ─── 10. npm available ─────────────────────────────────────────────────────
section('npm')
try {
  const npmVersion = execSync('npm --version').toString().trim()
  ok(`npm ${npmVersion} available`)
} catch {
  fail('npm not found — required for server/npm install')
}

// ─── Summary ───────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40))
console.log(`  ${passed} passed  |  ${warned} warnings  |  ${failed} failed`)
console.log('─'.repeat(40))

if (failed > 0) {
  console.log('\n  🚫 Fix the failed checks before running Claude Code.\n')
  process.exit(1)
} else if (warned > 0) {
  console.log('\n  ⚠️  Warnings found — review them, then run Claude Code.\n')
  process.exit(0)
} else {
  console.log('\n  🟢 All clear — Claude Code is good to go.\n')
  process.exit(0)
}