import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import { HelmetProvider, Helmet } from 'react-helmet-async'
import {
  stripStaticMeta,
  STATIC_META_ATTR,
  DEFAULT_OG_IMAGE,
} from 'src/util/seo'

// Reproduces the static SEO fallback index.html ships (each tag carries
// data-rh-default). On JS boot these are stripped so React 19's per-route
// <Helmet> output is the only copy in <head> — React 19 hoists metadata
// natively and does NOT dedupe across <Helmet> instances, so a leftover static
// tag would show up as a duplicate.
const seedStaticHead = () => {
  const t = document.createElement('title')
  t.setAttribute(STATIC_META_ATTR, '')
  t.textContent = 'Prepify · Budget-friendly, healthy recipes'
  document.head.appendChild(t)
  const tags: Array<[string, string, string]> = [
    ['property', 'og:title', 'Prepify · Budget-friendly, healthy recipes'],
    ['property', 'og:image', DEFAULT_OG_IMAGE],
    ['property', 'og:url', 'https://www.prepifymeals.com'],
    ['name', 'twitter:image', DEFAULT_OG_IMAGE],
  ]
  tags.forEach(([attr, key, content]) => {
    const el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute('content', content)
    el.setAttribute(STATIC_META_ATTR, '')
    document.head.appendChild(el)
  })
}

const metas = (key: string) =>
  Array.from(
    document.head.querySelectorAll(
      `meta[property="${key}"], meta[name="${key}"]`
    )
  )
const content = (key: string) => metas(key)[0]?.getAttribute('content')

beforeEach(() => {
  document.head
    .querySelectorAll('meta, title')
    .forEach(el => el.remove())
})
afterEach(() => {
  cleanup()
  document.head.querySelectorAll('meta, title').forEach(el => el.remove())
})

describe('stripStaticMeta', () => {
  it('removes every static fallback tag from <head>', () => {
    seedStaticHead()
    expect(
      document.head.querySelectorAll(`[${STATIC_META_ATTR}]`).length
    ).toBeGreaterThan(0)

    stripStaticMeta()

    expect(
      document.head.querySelectorAll(`[${STATIC_META_ATTR}]`)
    ).toHaveLength(0)
    expect(document.head.querySelector('title')).toBeNull()
  })

  it('leaves tags without the marker untouched', () => {
    const keep = document.createElement('meta')
    keep.setAttribute('name', 'viewport')
    keep.setAttribute('content', 'width=device-width')
    document.head.appendChild(keep)
    seedStaticHead()

    stripStaticMeta()

    expect(document.head.querySelector('meta[name="viewport"]')).not.toBeNull()
  })
})

describe('per-route meta is the single source after strip', () => {
  it('a page <Helmet> yields exactly one of each og tag — no static duplicate', async () => {
    // 1. Page served with static fallback tags.
    seedStaticHead()
    // 2. JS boots → strip the fallback.
    stripStaticMeta()
    // 3. The route mounts its single <Helmet> (stand-in for SingleRecipe).
    render(
      <HelmetProvider>
        <Helmet>
          <title>Chicken Tacos · Prepify</title>
          <meta property='og:title' content='Chicken Tacos · Prepify' />
          <meta property='og:image' content='https://cdn.example/tacos.jpg' />
          <meta
            property='og:url'
            content='https://www.prepifymeals.com/recipes/abc'
          />
          <meta name='twitter:image' content='https://cdn.example/tacos.jpg' />
        </Helmet>
      </HelmetProvider>
    )

    await waitFor(() => {
      expect(document.title).toBe('Chicken Tacos · Prepify')
    })

    // Exactly one of each — the static fallback is gone, only the route's tag
    // remains (React 19 would otherwise leave both side by side).
    expect(document.querySelectorAll('head title')).toHaveLength(1)
    expect(metas('og:title')).toHaveLength(1)
    expect(content('og:title')).toBe('Chicken Tacos · Prepify')
    expect(metas('og:image')).toHaveLength(1)
    expect(content('og:image')).toBe('https://cdn.example/tacos.jpg')
    expect(metas('og:url')).toHaveLength(1)
    expect(content('og:url')).toBe('https://www.prepifymeals.com/recipes/abc')
    expect(metas('twitter:image')).toHaveLength(1)
    expect(content('twitter:image')).toBe('https://cdn.example/tacos.jpg')

    // No static leftovers anywhere in <head>.
    expect(
      document.head.querySelectorAll(`[${STATIC_META_ATTR}]`)
    ).toHaveLength(0)
  })
})
