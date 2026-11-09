import { Fragment } from 'react'
import { useStore } from '@tanstack/react-form'
import { FolderPlusIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import QueryCondition from '#/features/feature-flag/components/query-condition'
import type {
  FlagFormApi,
  QueryNodeShape,
} from '#/features/feature-flag/hooks/use-flag-form'
import { COMBINATOR_OPTIONS } from '#/features/feature-flag/utils/constants'
import {
  buildConditionNode,
  buildGroupNodes,
} from '#/features/feature-flag/utils/defaults'
import { buildFieldDomId } from '#/features/feature-flag/utils/field-path'
import { collectSubtreeIds } from '#/features/feature-flag/utils/query-nodes'

type NodesPath = `flags[${number}].targeting[${number}].nodes`

interface QueryGroupProps {
  form: FlagFormApi
  nodesPath: NodesPath
  // Shape of the whole rule, from `useRuleShape`.
  shape: QueryNodeShape[]
  group: QueryNodeShape
  depth: number
}

// Nested groups get a different accent so the depth stays readable.
const DEPTH_BORDERS = [
  'border-l-sky-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-emerald-500',
]

/**
 * One AND/OR group of a targeting rule. Renders its conditions and, for each
 * nested group, itself again, so groups can be nested to any depth.
 */
const QueryGroup: React.FC<QueryGroupProps> = ({
  form,
  nodesPath,
  shape,
  group,
  depth,
}) => {
  const groupPath = `${nodesPath}[${group.index}]` as const
  const children = shape.filter((node) => node.parentId === group.id)
  const isRoot = group.parentId === null

  const combinator = useStore(form.store, () =>
    form.getFieldValue(`${groupPath}.combinator`),
  )

  const handleAddCondition = () => {
    form.pushFieldValue(nodesPath, buildConditionNode(group.id))
  }

  const handleAddGroup = () => {
    for (const node of buildGroupNodes(group.id)) {
      form.pushFieldValue(nodesPath, node)
    }
  }

  // Removes the node and, for a group, everything nested under it.
  const handleRemoveNode = (nodeId: string) => {
    const removedIds = collectSubtreeIds(form.getFieldValue(nodesPath), nodeId)
    const removedIndexes = shape
      .filter((node) => removedIds.has(node.id))
      .map((node) => node.index)
      .sort((a, b) => b - a)

    for (const index of removedIndexes) {
      form.removeFieldValue(nodesPath, index)
    }
  }

  return (
    <div
      id={buildFieldDomId(groupPath)}
      tabIndex={-1}
      role="group"
      aria-label={isRoot ? 'Conditions' : `Nested group, level ${depth}`}
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-l-4 border-border p-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        DEPTH_BORDERS[depth % DEPTH_BORDERS.length],
        !isRoot && 'bg-background/60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <form.AppField name={`${groupPath}.combinator`}>
          {(field) => (
            <field.SelectField
              label="Match"
              hideLabel
              options={COMBINATOR_OPTIONS}
              className="w-24"
            />
          )}
        </form.AppField>
        <form.AppField name={`${groupPath}.negate`}>
          {(field) => <field.SwitchField label="NOT" />}
        </form.AppField>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleAddCondition}
          >
            <PlusIcon /> Condition
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleAddGroup}
          >
            <FolderPlusIcon /> Group
          </Button>
          {!isRoot && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove group"
              onClick={() => handleRemoveNode(group.id)}
            >
              <Trash2Icon />
            </Button>
          )}
        </div>
      </div>

      {children.length === 0 && (
        <p role="alert" className="text-xs text-destructive">
          Group must contain at least one condition. Add a condition or remove
          the group.
        </p>
      )}

      {children.map((child, position) => (
        <Fragment key={child.id}>
          {position > 0 && (
            <span className="ml-3 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              {combinator}
            </span>
          )}
          {child.kind === 'group' ? (
            <QueryGroup
              form={form}
              nodesPath={nodesPath}
              shape={shape}
              group={child}
              depth={depth + 1}
            />
          ) : (
            <QueryCondition
              form={form}
              nodePath={`${nodesPath}[${child.index}]`}
              onRemove={() => handleRemoveNode(child.id)}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

export default QueryGroup
