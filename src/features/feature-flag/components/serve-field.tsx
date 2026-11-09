import { useStore } from '@tanstack/react-form'

import { cn } from '#/lib/utils'
import VariationDot from '#/features/feature-flag/components/variation-dot'
import { useVariationOptions } from '#/features/feature-flag/hooks/use-flag-form'
import type {
  FlagFormApi,
  VariationOption,
} from '#/features/feature-flag/hooks/use-flag-form'
import { SERVE_TYPE_OPTIONS } from '#/features/feature-flag/utils/constants'
import { buildFieldDomId } from '#/features/feature-flag/utils/field-path'

export type ServePath =
  | `flags[${number}].defaultRule`
  | `flags[${number}].targeting[${number}].serve`

interface ServeFieldProps {
  form: FlagFormApi
  flagIndex: number
  path: ServePath
}

const toSelectOptions = (variations: VariationOption[]) =>
  variations.map(({ id, name }) => ({ label: name || '(unnamed)', value: id }))

const ServeField: React.FC<ServeFieldProps> = ({ form, flagIndex, path }) => {
  const variations = useVariationOptions(form, flagIndex)
  const serveType = useStore(form.store, () =>
    form.getFieldValue(`${path}.type`),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField name={`${path}.type`}>
          {(field) => (
            <field.SelectField label="Serve" options={SERVE_TYPE_OPTIONS} />
          )}
        </form.AppField>

        {serveType === 'variation' && (
          <form.AppField name={`${path}.variationId`}>
            {(field) => (
              <field.SelectField
                label="Variation"
                placeholder="Select a variation"
                options={toSelectOptions(variations)}
              />
            )}
          </form.AppField>
        )}
      </div>

      {serveType === 'percentage' && (
        <PercentageRollout form={form} path={path} variations={variations} />
      )}
      {serveType === 'progressive' && (
        <ProgressiveRollout form={form} path={path} variations={variations} />
      )}
    </div>
  )
}

interface RolloutProps {
  form: FlagFormApi
  path: ServePath
  variations: VariationOption[]
}

const PercentageRollout: React.FC<RolloutProps> = ({
  form,
  path,
  variations,
}) => {
  const total = useStore(form.store, () => {
    const weights = form.getFieldValue(`${path}.weights`)
    return variations.reduce((sum, { id }) => sum + (weights[id] ?? 0), 0)
  })
  const isComplete = total === 100

  return (
    <div
      id={buildFieldDomId(`${path}.weights`)}
      tabIndex={-1}
      className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3"
    >
      <p className="text-xs text-muted-foreground">
        Users are split into buckets; a user always gets the same variation.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {variations.map((variation) => (
          <div key={variation.id} className="flex items-end gap-2">
            <VariationDot
              colorIndex={variation.colorIndex}
              className="mb-2.5"
            />
            <form.AppField name={`${path}.weights.${variation.id}`}>
              {(field) => (
                <field.NumberField
                  label={variation.name || '(unnamed)'}
                  suffix="%"
                  className="flex-1"
                />
              )}
            </form.AppField>
          </div>
        ))}
      </div>
      <p
        role="status"
        className={cn(
          'text-xs font-medium',
          isComplete
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-destructive',
        )}
      >
        Total {total}%{isComplete ? '' : ' (must add up to 100%)'}
      </p>
    </div>
  )
}

const ROLLOUT_STEPS = [
  { key: 'initial', title: 'Start' },
  { key: 'end', title: 'End' },
] as const

const ProgressiveRollout: React.FC<RolloutProps> = ({
  form,
  path,
  variations,
}) => (
  <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
    <p className="text-xs text-muted-foreground">
      The percentage of users on the end variation grows from the start date to
      the end date.
    </p>
    {ROLLOUT_STEPS.map((step) => (
      <fieldset key={step.key} className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-1 text-xs font-semibold">{step.title}</legend>
        <form.AppField name={`${path}.${step.key}.variationId`}>
          {(field) => (
            <field.SelectField
              label="Variation"
              placeholder="Select a variation"
              options={toSelectOptions(variations)}
            />
          )}
        </form.AppField>
        <form.AppField name={`${path}.${step.key}.percentage`}>
          {(field) => <field.NumberField label="Percentage" suffix="%" />}
        </form.AppField>
        <form.AppField name={`${path}.${step.key}.date`}>
          {(field) => <field.TextField label="Date" type="datetime-local" />}
        </form.AppField>
      </fieldset>
    ))}
  </div>
)

export default ServeField
