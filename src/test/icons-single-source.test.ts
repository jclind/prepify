import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

// Guard for the "one icon per concept" sweep: every icon must be imported from
// the single source of truth at src/Components/icons, never from 'react-icons/*'
// directly. That re-export module is the ONLY place allowed to touch react-icons,
// so a concept can't drift across icon families (star = AiFillStar / BsStar /
// FiStar, etc.) again. If this fails, import the icon you need from
// 'src/Components/icons' instead — add a new semantic export there if it's a
// genuinely new concept.
const SRC = join(__dirname, '..')
const ICONS_MODULE = join(SRC, 'Components', 'icons')
const REACT_ICONS = /from\s+['"]react-icons(?:\/[a-z0-9]+)?['"]/

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (name === 'node_modules') return []
    if (statSync(full).isDirectory()) return walk(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })

describe('icons single source of truth', () => {
  it('no file imports from react-icons directly (use src/Components/icons)', () => {
    const offenders = walk(SRC)
      .filter(f => !f.startsWith(ICONS_MODULE))
      .filter(f => REACT_ICONS.test(readFileSync(f, 'utf8')))
      .map(f => relative(SRC, f))
    expect(offenders).toEqual([])
  })
})
