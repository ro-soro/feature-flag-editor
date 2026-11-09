import { useMemo, useState } from 'react'
import { createFormHook, useStore } from '@tanstack/react-form'

import {
  NumberField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
} from '#/features/feature-flag/components/form-fields'
import {
  fieldContext,
  formContext,
} from '#/features/feature-flag/hooks/form-context'
import { flagFormSchema } from '#/features/feature-flag/schemas/flag-form-schema'
import type { FlagForm } from '#/features/feature-flag/schemas/flag-form-schema'
import { buildInitialFlagForm } from '#/features/feature-flag/utils/defaults'

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    NumberField,
    SelectField,
    SwitchField,
    TextareaField,
  },
  formComponents: {},
})

interface UseFlagFormInput {
  onValidSubmit: (values: FlagForm) => void
}

/**
 * The whole editor is one TanStack form. Zod validates every level on each
 * change; TanStack puts each issue on the field at the issue's path.
 */
export const useFlagForm = ({ onValidSubmit }: UseFlagFormInput) => {
  // Built once: a new object on every render would reset the form.
  const [defaultValues] = useState(buildInitialFlagForm)

  return useAppForm({
    defaultValues,
    validators: { onChange: flagFormSchema },
    onSubmit: ({ value }) => onValidSubmit(value),
  })
}

export type FlagFormApi = ReturnType<typeof useFlagForm>

const ID_SEPARATOR = '|'

/**
 * Ids of a list in the form (flags, variations, rules, ...).
 *
 * Selecting the joined ids as one string means a list re-renders only when
 * items are added, removed or moved, not on every keystroke inside an item;
 * each item subscribes to its own fields.
 */
export const useListIds = (
  form: FlagFormApi,
  selectList: (values: FlagForm) => { id: string }[] | undefined,
) => {
  const joinedIds = useStore(form.store, (state) =>
    (selectList(state.values) ?? []).map(({ id }) => id).join(ID_SEPARATOR),
  )

  return useMemo(
    () => (joinedIds ? joinedIds.split(ID_SEPARATOR) : []),
    [joinedIds],
  )
}

const ENTRY_SEPARATOR = '\u0001'
const FIELD_SEPARATOR = '\u0002'

export interface VariationOption {
  id: string
  name: string
  colorIndex: number
}

/** Variations of a flag as select options; re-renders only when one is added, removed or renamed. */
export const useVariationOptions = (form: FlagFormApi, flagIndex: number) => {
  const joined = useStore(form.store, (state) =>
    (state.values.flags.at(flagIndex)?.variations ?? [])
      .map(({ id, name }) => `${id}${FIELD_SEPARATOR}${name}`)
      .join(ENTRY_SEPARATOR),
  )

  return useMemo<VariationOption[]>(
    () =>
      joined
        ? joined.split(ENTRY_SEPARATOR).map((entry, colorIndex) => {
            const [id, name] = entry.split(FIELD_SEPARATOR)
            return { id, name, colorIndex }
          })
        : [],
    [joined],
  )
}

export interface QueryNodeShape {
  id: string
  parentId: string | null
  kind: 'group' | 'condition'
  index: number
}

/**
 * Tree shape of one rule (ids, parents, kinds, positions) without the
 * condition values, so typing in a condition does not re-render the tree.
 */
export const useRuleShape = (
  form: FlagFormApi,
  flagIndex: number,
  ruleIndex: number,
) => {
  const joined = useStore(form.store, (state) =>
    (state.values.flags.at(flagIndex)?.targeting.at(ruleIndex)?.nodes ?? [])
      .map(
        ({ id, parentId, kind }) =>
          `${id}${FIELD_SEPARATOR}${parentId ?? ''}${FIELD_SEPARATOR}${kind}`,
      )
      .join(ENTRY_SEPARATOR),
  )

  return useMemo<QueryNodeShape[]>(
    () =>
      joined
        ? joined.split(ENTRY_SEPARATOR).map((entry, index) => {
            const [id, parentId, kind] = entry.split(FIELD_SEPARATOR)
            return {
              id,
              parentId: parentId || null,
              kind: kind as QueryNodeShape['kind'],
              index,
            }
          })
        : [],
    [joined],
  )
}
