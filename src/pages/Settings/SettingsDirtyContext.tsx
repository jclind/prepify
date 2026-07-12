import React, {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

// Lets a section (Profile, Privacy) report whether it has unsaved changes so the
// shell can warn before the user navigates away and silently loses them. The app
// uses BrowserRouter (not a data router), so useBlocker isn't available — we
// guard the in-app nav links/back link via confirmLeave() and hard navigation
// (refresh / tab close) via beforeunload.
type DirtyCtx = {
  setDirty: (dirty: boolean) => void
  // True when it's safe to leave: either nothing is unsaved, or the user
  // confirmed discarding. False means the caller should cancel the navigation.
  confirmLeave: () => boolean
}

const Ctx = createContext<DirtyCtx>({
  setDirty: () => {},
  confirmLeave: () => true,
})

export const useSettingsDirty = () => useContext(Ctx)

export const SettingsDirtyProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [dirty, setDirty] = useState(false)

  // Hard-navigation guard (refresh / closing the tab) while there are edits.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const confirmLeave = useCallback(
    () =>
      !dirty ||
      window.confirm(
        'You have unsaved changes. Leave this section without saving them?'
      ),
    [dirty]
  )

  return (
    <Ctx.Provider value={{ setDirty, confirmLeave }}>{children}</Ctx.Provider>
  )
}
