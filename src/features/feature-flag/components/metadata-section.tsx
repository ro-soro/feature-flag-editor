import { PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import SectionHeader from '#/features/feature-flag/components/section-header'
import { useListIds } from '#/features/feature-flag/hooks/use-flag-form'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'
import { buildMetadataEntry } from '#/features/feature-flag/utils/defaults'

interface MetadataSectionProps {
  form: FlagFormApi
  flagIndex: number
}

const MetadataSection: React.FC<MetadataSectionProps> = ({
  form,
  flagIndex,
}) => {
  const metadataPath = `flags[${flagIndex}].metadata` as const
  const entryIds = useListIds(
    form,
    (values) => values.flags.at(flagIndex)?.metadata,
  )

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Metadata"
        description="Extra information about the flag, e.g. owner or issue link."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              form.pushFieldValue(metadataPath, buildMetadataEntry())
            }
          >
            <PlusIcon /> Add metadata
          </Button>
        }
      />

      {entryIds.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entryIds.map((entryId, index) => (
            <li
              key={entryId}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-2"
            >
              <form.AppField name={`${metadataPath}[${index}].key`}>
                {(field) => (
                  <field.TextField
                    label={`Metadata ${index + 1} key`}
                    hideLabel
                    placeholder="Key"
                  />
                )}
              </form.AppField>
              <form.AppField name={`${metadataPath}[${index}].value`}>
                {(field) => (
                  <field.TextField
                    label={`Metadata ${index + 1} value`}
                    hideLabel
                    placeholder="Value"
                  />
                )}
              </form.AppField>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove metadata ${index + 1}`}
                onClick={() => form.removeFieldValue(metadataPath, index)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default MetadataSection
