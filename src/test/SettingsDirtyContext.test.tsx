import React from 'react'
import { vi } from 'vitest'
import { render, act } from '@testing-library/react'
import {
  SettingsDirtyProvider,
  useSettingsDirty,
} from 'src/pages/Settings/SettingsDirtyContext'

// The unsaved-changes guard. A section reports its dirty state via setDirty; the
// shell asks confirmLeave() before navigating, and the provider also blocks a
// hard navigation (refresh / tab close) via the beforeunload event.

type Ctx = ReturnType<typeof useSettingsDirty>

const renderCtx = () => {
  const ref: { current: Ctx | null } = { current: null }
  const Consumer = () => {
    ref.current = useSettingsDirty()
    return null
  }
  render(
    <SettingsDirtyProvider>
      <Consumer />
    </SettingsDirtyProvider>
  )
  return ref
}

const fireBeforeUnload = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e
}

describe('SettingsDirtyContext — confirmLeave', () => {
  afterEach(() => vi.restoreAllMocks())

  it('allows leaving without prompting when nothing is dirty', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const ctx = renderCtx()

    expect(ctx.current!.confirmLeave()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('prompts and allows leaving when the user confirms the discard', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ctx = renderCtx()

    act(() => ctx.current!.setDirty(true))

    expect(ctx.current!.confirmLeave()).toBe(true)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('prompts and cancels the navigation when the user declines', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const ctx = renderCtx()

    act(() => ctx.current!.setDirty(true))

    expect(ctx.current!.confirmLeave()).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('stops prompting again once the form is marked clean', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const ctx = renderCtx()

    act(() => ctx.current!.setDirty(true))
    act(() => ctx.current!.setDirty(false))

    expect(ctx.current!.confirmLeave()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })
})

describe('SettingsDirtyContext — beforeunload guard', () => {
  it('does not block a hard navigation while clean', () => {
    renderCtx()
    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })

  it('blocks a hard navigation while dirty', () => {
    const ctx = renderCtx()
    act(() => ctx.current!.setDirty(true))
    expect(fireBeforeUnload().defaultPrevented).toBe(true)
  })

  it('stops blocking once the form is clean again (listener removed)', () => {
    const ctx = renderCtx()
    act(() => ctx.current!.setDirty(true))
    act(() => ctx.current!.setDirty(false))
    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })
})
