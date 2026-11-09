import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { PlusIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import RuleCard from '#/features/feature-flag/components/rule-card'
import SectionHeader from '#/features/feature-flag/components/section-header'
import { useListIds } from '#/features/feature-flag/hooks/use-flag-form'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'
import { buildRule } from '#/features/feature-flag/utils/defaults'

interface TargetingSectionProps {
  form: FlagFormApi
  flagIndex: number
}

const TargetingSection: React.FC<TargetingSectionProps> = ({
  form,
  flagIndex,
}) => {
  const targetingPath = `flags[${flagIndex}].targeting` as const
  const ruleIds = useListIds(
    form,
    (values) => values.flags.at(flagIndex)?.targeting,
  )

  const sensors = useSensors(
    // A small distance keeps clicks on the handle from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleAddRule = () => {
    const firstVariationId =
      form.getFieldValue(`flags[${flagIndex}].variations`).at(0)?.id ?? ''
    form.pushFieldValue(
      targetingPath,
      buildRule(ruleIds.length + 1, firstVariationId),
    )
  }

  // Rules are evaluated top to bottom, so their order matters.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const fromIndex = ruleIds.indexOf(String(active.id))
    const toIndex = ruleIds.indexOf(String(over.id))
    if (fromIndex < 0 || toIndex < 0) return

    form.moveFieldValues(targetingPath, fromIndex, toIndex)
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Targeting rules"
        description="Checked from top to bottom; the first matching rule decides. Drag to reorder."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRule}
          >
            <PlusIcon /> Add rule
          </Button>
        }
      />

      {ruleIds.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No rules yet. Every user gets the default rule.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ruleIds}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-3">
              {ruleIds.map((ruleId, ruleIndex) => (
                <RuleCard
                  key={ruleId}
                  form={form}
                  flagIndex={flagIndex}
                  ruleIndex={ruleIndex}
                  ruleId={ruleId}
                  onRemove={() =>
                    form.removeFieldValue(targetingPath, ruleIndex)
                  }
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}

export default TargetingSection
