import { useStore } from '@tanstack/react-form'
import { XIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'
import {
  LIST_OPERATOR,
  OPERATOR_OPTIONS,
  VALUELESS_OPERATOR,
} from '#/features/feature-flag/utils/constants'

interface QueryConditionProps {
  form: FlagFormApi
  nodePath: `flags[${number}].targeting[${number}].nodes[${number}]`
  onRemove: () => void
}

const QueryCondition: React.FC<QueryConditionProps> = ({
  form,
  nodePath,
  onRemove,
}) => {
  const operator = useStore(form.store, () =>
    form.getFieldValue(`${nodePath}.operator`),
  )

  return (
    // Laid out by the space of the group (container query), not the window,
    // because nested groups get narrower with every level.
    <div className="@container rounded-lg bg-muted/40 p-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto]">
        <form.AppField name={`${nodePath}.field`}>
          {(field) => (
            <field.TextField
              label="Field"
              placeholder="e.g. role"
              className="col-span-1"
            />
          )}
        </form.AppField>
        <form.AppField name={`${nodePath}.operator`}>
          {(field) => (
            <field.SelectField
              label="Operator"
              options={OPERATOR_OPTIONS}
              className="order-3 col-span-2 @lg:order-none @lg:col-span-1"
            />
          )}
        </form.AppField>
        {operator === VALUELESS_OPERATOR ? (
          <p className="order-4 col-span-2 self-end pb-2 text-xs text-muted-foreground @lg:order-none @lg:col-span-1">
            No value needed
          </p>
        ) : (
          <form.AppField name={`${nodePath}.value`}>
            {(field) => (
              <field.TextField
                label="Value"
                placeholder={
                  operator === LIST_OPERATOR ? 'admin, editor' : 'e.g. admin'
                }
                className="order-4 col-span-2 @lg:order-none @lg:col-span-1"
              />
            )}
          </form.AppField>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove condition"
          className="order-2 mt-5 @lg:order-none"
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  )
}

export default QueryCondition
