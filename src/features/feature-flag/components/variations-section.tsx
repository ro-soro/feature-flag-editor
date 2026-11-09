import { useStore } from '@tanstack/react-form'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import SectionHeader from '#/features/feature-flag/components/section-header'
import VariationDot from '#/features/feature-flag/components/variation-dot'
import { useListIds } from '#/features/feature-flag/hooks/use-flag-form'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'
import {
  buildDefaultVariationValue,
  buildVariation,
} from '#/features/feature-flag/utils/defaults'
import { buildFieldDomId } from '#/features/feature-flag/utils/field-path'

interface VariationsSectionProps {
  form: FlagFormApi
  flagIndex: number
}

const MIN_VARIATIONS = 2

const BOOLEAN_OPTIONS = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' },
]

const VariationsSection: React.FC<VariationsSectionProps> = ({
  form,
  flagIndex,
}) => {
  const variationsPath = `flags[${flagIndex}].variations` as const
  const variationIds = useListIds(
    form,
    (values) => values.flags.at(flagIndex)?.variations,
  )
  const flagType = useStore(
    form.store,
    (state) => state.values.flags.at(flagIndex)?.type ?? 'boolean',
  )
  const canRemove = variationIds.length > MIN_VARIATIONS

  const handleAdd = () => {
    const number = variationIds.length + 1
    form.pushFieldValue(
      variationsPath,
      buildVariation(
        `variation_${number}`,
        buildDefaultVariationValue(flagType, variationIds.length),
      ),
    )
  }

  return (
    <section
      id={buildFieldDomId(variationsPath)}
      className="flex flex-col gap-3"
    >
      <SectionHeader
        title="Variations"
        description="The values this flag can return."
        action={
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <PlusIcon /> Add variation
          </Button>
        }
      />

      <ul className="flex flex-col gap-2">
        {variationIds.map((variationId, index) => {
          const path = `${variationsPath}[${index}]` as const

          return (
            <li
              key={variationId}
              className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-2"
            >
              <VariationDot colorIndex={index} className="mt-2.5" />
              <form.AppField name={`${path}.name`}>
                {(field) => (
                  <field.TextField
                    label={`Variation ${index + 1} name`}
                    hideLabel
                    placeholder="Name"
                  />
                )}
              </form.AppField>
              <form.AppField name={`${path}.value`}>
                {(field) => {
                  const label = `Variation ${index + 1} value`
                  if (flagType === 'boolean') {
                    return (
                      <field.SelectField
                        label={label}
                        hideLabel
                        options={BOOLEAN_OPTIONS}
                      />
                    )
                  }
                  if (flagType === 'json') {
                    return (
                      <field.TextareaField
                        label={label}
                        hideLabel
                        placeholder='{ "key": "value" }'
                        textareaClassName="min-h-8 font-mono text-xs"
                      />
                    )
                  }
                  return (
                    <field.TextField
                      label={label}
                      hideLabel
                      placeholder={flagType === 'number' ? '0' : 'Value'}
                    />
                  )
                }}
              </form.AppField>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove variation ${index + 1}`}
                disabled={!canRemove}
                title={
                  canRemove
                    ? undefined
                    : `A flag needs at least ${MIN_VARIATIONS} variations`
                }
                onClick={() => form.removeFieldValue(variationsPath, index)}
              >
                <Trash2Icon />
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default VariationsSection
