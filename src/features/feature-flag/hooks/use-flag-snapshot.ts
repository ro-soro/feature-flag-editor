import { useDeferredValue, useMemo } from 'react'
import { useStore } from '@tanstack/react-form'

import { mapToGoFeatureFlag } from '#/features/feature-flag/mappers/to-go-feature-flag'
import { flagFormSchema } from '#/features/feature-flag/schemas/flag-form-schema'
import type { FlagForm } from '#/features/feature-flag/schemas/flag-form-schema'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'

export interface FormIssue {
  path: (string | number)[]
  message: string
}

export const collectFormIssues = (values: FlagForm): FormIssue[] => {
  const result = flagFormSchema.safeParse(values)
  if (result.success) return []

  return result.error.issues.map(({ path, message }) => ({
    path: path.map((segment) =>
      typeof segment === 'symbol' ? String(segment) : segment,
    ),
    message,
  }))
}

/**
 * Everything the side panel shows: the output JSON and all validation
 * issues. Values are deferred so typing stays responsive while the preview
 * catches up.
 */
export const useFlagSnapshot = (form: FlagFormApi) => {
  const values = useStore(form.store, (state) => state.values)
  const deferredValues = useDeferredValue(values)

  return useMemo(
    () => ({
      values: deferredValues,
      json: JSON.stringify(mapToGoFeatureFlag(deferredValues), null, 2),
      issues: collectFormIssues(deferredValues),
    }),
    [deferredValues],
  )
}
