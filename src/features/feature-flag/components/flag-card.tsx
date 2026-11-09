import { useStore } from '@tanstack/react-form'
import { Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import MetadataSection from '#/features/feature-flag/components/metadata-section'
import SectionHeader from '#/features/feature-flag/components/section-header'
import ServeField from '#/features/feature-flag/components/serve-field'
import TargetingSection from '#/features/feature-flag/components/targeting-section'
import VariationsSection from '#/features/feature-flag/components/variations-section'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'
import { FLAG_TYPE_OPTIONS } from '#/features/feature-flag/utils/constants'
import type { FlagType } from '#/features/feature-flag/utils/constants'
import { buildDefaultVariationValue } from '#/features/feature-flag/utils/defaults'

interface FlagCardProps {
  form: FlagFormApi
  flagIndex: number
  canRemove: boolean
  onRemove: () => void
}

const FlagCard: React.FC<FlagCardProps> = ({
  form,
  flagIndex,
  canRemove,
  onRemove,
}) => {
  const flagPath = `flags[${flagIndex}]` as const
  const flagKey = useStore(form.store, () =>
    form.getFieldValue(`${flagPath}.key`),
  )

  // Values typed for the old type rarely fit the new one, so start over.
  const handleTypeChange = (type: FlagType) => {
    const variations = form.getFieldValue(`${flagPath}.variations`)
    form.setFieldValue(
      `${flagPath}.variations`,
      variations.map((variation, index) => ({
        ...variation,
        value: buildDefaultVariationValue(type, index),
      })),
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="truncate">
            {flagKey.trim() || `Flag ${flagIndex + 1}`}
          </CardTitle>
          <CardDescription>Flag {flagIndex + 1}</CardDescription>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemove}
          >
            <Trash2Icon /> Remove flag
          </Button>
        )}
      </CardHeader>

      <CardContent className="gap-5">
        <section className="flex flex-col gap-3">
          <SectionHeader title="Flag details" />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_7rem]">
            <form.AppField name={`${flagPath}.key`}>
              {(field) => (
                <field.TextField
                  label="Flag name"
                  placeholder="my-new-feature"
                />
              )}
            </form.AppField>
            <form.AppField
              name={`${flagPath}.type`}
              listeners={{ onChange: ({ value }) => handleTypeChange(value) }}
            >
              {(field) => (
                <field.SelectField label="Type" options={FLAG_TYPE_OPTIONS} />
              )}
            </form.AppField>
            <form.AppField name={`${flagPath}.version`}>
              {(field) => (
                <field.TextField label="Version" placeholder="1.0.0" />
              )}
            </form.AppField>
          </div>
          <form.AppField name={`${flagPath}.description`}>
            {(field) => (
              <field.TextareaField
                label="Description"
                placeholder="What does this flag control?"
              />
            )}
          </form.AppField>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <form.AppField name={`${flagPath}.disable`}>
              {(field) => (
                <field.SwitchField
                  label="Disabled"
                  description="Every user gets the SDK default value."
                />
              )}
            </form.AppField>
            <form.AppField name={`${flagPath}.trackEvents`}>
              {(field) => (
                <field.SwitchField
                  label="Track events"
                  description="Send evaluation events to the exporter."
                />
              )}
            </form.AppField>
          </div>
        </section>

        <Separator />
        <VariationsSection form={form} flagIndex={flagIndex} />

        <Separator />
        <TargetingSection form={form} flagIndex={flagIndex} />

        <Separator />
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="Default rule"
            description="Served when no targeting rule matches."
          />
          <ServeField
            form={form}
            flagIndex={flagIndex}
            path={`${flagPath}.defaultRule`}
          />
        </section>

        <Separator />
        <MetadataSection form={form} flagIndex={flagIndex} />
      </CardContent>
    </Card>
  )
}

export default FlagCard
