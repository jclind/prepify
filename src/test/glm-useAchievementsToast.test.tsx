import React from 'react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAchievementsToast } from 'src/pages/Account/useAchievementsToast'
import GamificationAPI from 'src/api/gamification'
import { Achievement, Gamification } from 'types'

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: mockToast }))

vi.mock('src/api/gamification', () => ({
  default: { acknowledgeAchievements: vi.fn().mockResolvedValue({}) },
}))
vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn().mockReturnValue('user-1') },
}))

// useAchievementsToast celebrates earned-since-last-visit achievements, then
// acknowledges them so the toast fires once. One unlock gets a named toast;
// several arriving together collapse into a single summary instead of a wall
// of toasts.
const ach = (id: string, name: string): Achievement => ({
  id,
  name,
  description: `${name} description`,
  earned: true,
})

const gamificationOf = (
  achievements: Achievement[],
  newlyUnlocked: string[]
): Gamification => ({
  level: 1,
  rank: 'Newbie',
  xp: 0,
  xpNext: 100,
  pct: 0,
  totalXp: 0,
  achievements,
  earned: achievements.map(a => a.id),
  newlyUnlocked,
})

function Harness({ gamification }: { gamification: Gamification | null }) {
  useAchievementsToast(gamification)
  return null
}

const renderHarness = (gamification: Gamification | null) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Harness gamification={gamification} />
    </QueryClientProvider>
  )

const mockAck = GamificationAPI.acknowledgeAchievements as ReturnType<typeof vi.fn>

describe('useAchievementsToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.success.mockReset()
    mockToast.error.mockReset()
  })

  it('names the achievement when exactly one unlocks', async () => {
    const achievements = [ach('first-recipe', 'First Recipe')]
    renderHarness(gamificationOf(achievements, ['first-recipe']))

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledTimes(1)
    )
    expect(mockToast.success).toHaveBeenCalledWith(
      '🏅 Achievement unlocked: First Recipe!'
    )
    // Acknowledged with the exact unlocked ids so it never re-fires.
    expect(mockAck).toHaveBeenCalledWith(['first-recipe'])
  })

  it('collapses several simultaneous unlocks into one summary toast', async () => {
    const achievements = [
      ach('first-recipe', 'First Recipe'),
      ach('first-save', 'First Save'),
      ach('first-review', 'First Review'),
    ]
    renderHarness(
      gamificationOf(achievements, ['first-recipe', 'first-save', 'first-review'])
    )

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledTimes(1)
    )
    expect(mockToast.success).toHaveBeenCalledWith('🏅 3 achievements unlocked!')
  })

  it('does nothing when there is nothing newly unlocked', async () => {
    const achievements = [ach('first-recipe', 'First Recipe')]
    renderHarness(gamificationOf(achievements, []))
    renderHarness(null)

    // Give any (wrong) effect a chance to run.
    await new Promise(r => setTimeout(r, 10))
    expect(mockToast.success).not.toHaveBeenCalled()
    expect(mockAck).not.toHaveBeenCalled()
  })

  it('ignores unlocked ids with no matching achievement definition', async () => {
    // e.g. an achievement removed from the catalog while pending ack.
    const achievements = [ach('first-recipe', 'First Recipe')]
    renderHarness(gamificationOf(achievements, ['first-recipe', 'ghost-id']))

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledTimes(1)
    )
    // One resolvable name → the named single form, not "2 achievements".
    expect(mockToast.success).toHaveBeenCalledWith(
      '🏅 Achievement unlocked: First Recipe!'
    )
    // The ack still carries every id, including the ghost, so it is cleared.
    expect(mockAck).toHaveBeenCalledWith(['first-recipe', 'ghost-id'])
  })

  it('survives a failed acknowledge (toast already shown, no crash)', async () => {
    mockAck.mockRejectedValueOnce(new Error('offline'))
    const achievements = [ach('first-recipe', 'First Recipe')]
    renderHarness(gamificationOf(achievements, ['first-recipe']))

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledTimes(1)
    )
    // The .catch swallows the rejection; wait for it to actually land.
    await new Promise(r => setTimeout(r, 10))
  })
})
