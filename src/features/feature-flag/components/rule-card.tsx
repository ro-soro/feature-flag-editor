import { useStore } from '@tanstack/react-form'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import QueryGroup from '#/features/feature-flag/components/query-group'
import ServeField from '#/features/feature-flag/components/serve-field'
import { buildRuleQuery } from '#/features/feature-flag/mappers/build-query'
import { useRuleShape } from '#/features/feature-flag/hooks/use-flag-form'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'

interface RuleCardProps {
  form: FlagFormApi
  flagIndex: number
  ruleIndex: number
  ruleId: string
  onRemove: () => void
}

const RuleCard: React.FC<RuleCardProps> = ({
  form,
  flagIndex,
  ruleIndex,
  ruleId,
  onRemove,
}) => {
  const rulePath = `flags[${flagIndex}].targeting[${ruleIndex}]` as const
  const shape = useRuleShape(form, flagIndex, ruleIndex)
  const root = shape.at(0)

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ruleId })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs',
        isDragging && 'relative z-10 opacity-80 shadow-lg ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-2">
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Reorder rule ${ruleIndex + 1}`}
          className="mt-5 cursor-grab touch-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
        <form.AppField name={`${rulePath}.name`}>
          {(field) => (
            <field.TextField
              label={`Rule ${ruleIndex + 1} name`}
              placeholder="Rule name"
              className="flex-1"
            />
          )}
        </form.AppField>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove rule ${ruleIndex + 1}`}
          className="mt-5"
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </div>

      {root && (
        <QueryGroup
          form={form}
          nodesPath={`${rulePath}.nodes`}
          shape={shape}
          group={root}
          depth={0}
        />
      )}

      <RuleQueryPreview form={form} rulePath={rulePath} />

      <ServeField
        form={form}
        flagIndex={flagIndex}
        path={`${rulePath}.serve`}
      />
    </li>
  )
}

interface RuleQueryPreviewProps {
  form: FlagFormApi
  rulePath: `flags[${number}].targeting[${number}]`
}

// The query this rule writes to the file, updated while typing.
const RuleQueryPreview: React.FC<RuleQueryPreviewProps> = ({
  form,
  rulePath,
}) => {
  const query = useStore(form.store, () =>
    buildRuleQuery(form.getFieldValue(`${rulePath}.nodes`)),
  )

  return (
    <p className="truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
      <span className="font-sans font-semibold text-foreground">query: </span>
      {query || <em>empty</em>}
    </p>
  )
}

export default RuleCard
