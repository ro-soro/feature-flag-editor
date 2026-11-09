import { createFormHookContexts } from '@tanstack/react-form'

// Kept apart from `use-flag-form.ts` so field components can read the
// contexts without importing the hook that registers them.
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
