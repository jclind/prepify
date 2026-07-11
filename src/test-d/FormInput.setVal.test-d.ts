/**
 * Type-level assertions — checked by `tsc --noEmit` (the Static gate), NOT run by
 * Vitest — that FormInput's value surface is honestly a `string`. The T3 pass
 * removed `setVal(next as T)`: `<input>` values are always DOM strings, so
 * `setVal` is typed `(value: string) => void` and `val` is `string`. A numeric
 * consumer (ServingsInput, TimeInput) must accept that string and coerce it
 * itself rather than leaning on a cast that let a numeric *string* pose as a
 * `number`.
 *
 * The `@ts-expect-error` directives below are self-verifying: if the honest
 * typing regresses (e.g. FormInput goes generic again and accepts a number
 * setter), the expected error disappears and tsc fails on the now-unused
 * directive. `src/test` is excluded from tsconfig, so this lives in `src/test-d`
 * (Vitest's include is `*.test.{ts,tsx}`, so `.test-d.ts` is not collected as a
 * runtime test) to stay inside the typecheck gate.
 */
import FormInput from 'src/Components/Form/FormInput'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof FormInput>

// Honest surface: a string setter and a string value compile cleanly.
const okSetter: Props['setVal'] = (value: string): void => void value
const okVal: Props['val'] = ''
void okSetter
void okVal

// A numeric setter is rejected — the raw DOM string cannot flow into `(n: number)`.
const badSetter: Props = {
  val: '',
  // @ts-expect-error setVal must accept the raw input string, not a number
  setVal: (value: number): void => void value,
}
void badSetter

// A numeric value is rejected — `val` is the raw field string.
const badVal: Props = {
  // @ts-expect-error val is the raw DOM string; a number is not assignable
  val: 5,
  setVal: () => {},
}
void badVal
