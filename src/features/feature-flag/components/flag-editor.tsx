import { useState } from 'react'
import { CircleCheckIcon, PlusIcon, RotateCcwIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import ErrorSummary from '#/features/feature-flag/components/error-summary'
import FlagCard from '#/features/feature-flag/components/flag-card'
import JsonPreview from '#/features/feature-flag/components/json-preview'
import {
  collectFormIssues,
  useFlagSnapshot,
} from '#/features/feature-flag/hooks/use-flag-snapshot'
import {
  useFlagForm,
  useListIds,
} from '#/features/feature-flag/hooks/use-flag-form'
import type { FlagFormApi } from '#/features/feature-flag/hooks/use-flag-form'
import { buildFlag } from '#/features/feature-flag/utils/defaults'
import { findIssueElement } from '#/features/feature-flag/utils/field-path'

/**
 * Feature flag editor in the style of the GO Feature Flag editor: the form on
 * the left, the generated configuration on the right, updated while typing.
 */
const FlagEditor: React.FC = () => {
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const form = useFlagForm({ onValidSubmit: () => setSavedAt(new Date()) })
  const flagIds = useListIds(form, (values) => values.flags)
  const snapshot = useFlagSnapshot(form)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavedAt(null)
    await form.handleSubmit()

    // Take the user to the first problem when the form is not valid.
    const firstIssue = collectFormIssues(form.state.values).at(0)
    if (firstIssue) {
      findIssueElement(firstIssue.path)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }

  const handleAddFlag = () => {
    form.pushFieldValue('flags', buildFlag(`new-flag-${flagIds.length + 1}`))
  }

  const handleReset = () => {
    form.reset()
    setSavedAt(null)
  }

  // AppForm provides the form to field components (errors after submit).
  return (
    <form.AppForm>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"
      >
        <div className="flex min-w-0 flex-col gap-5">
          {flagIds.map((flagId, flagIndex) => (
            <FlagCard
              key={flagId}
              form={form}
              flagIndex={flagIndex}
              canRemove={flagIds.length > 1}
              onRemove={() => form.removeFieldValue('flags', flagIndex)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={handleAddFlag}
          >
            <PlusIcon /> Add another flag
          </Button>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <JsonPreview
            json={snapshot.json}
            issueCount={snapshot.issues.length}
          />
          <ErrorSummary values={snapshot.values} issues={snapshot.issues} />
          <EditorActions form={form} savedAt={savedAt} onReset={handleReset} />
        </aside>
      </form>
    </form.AppForm>
  )
}

interface EditorActionsProps {
  form: FlagFormApi
  savedAt: Date | null
  onReset: () => void
}

const EditorActions: React.FC<EditorActionsProps> = ({
  form,
  savedAt,
  onReset,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    {savedAt && (
      <p
        role="status"
        className="mr-auto flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
      >
        <CircleCheckIcon className="size-4" />
        Configuration is valid ({savedAt.toLocaleTimeString()})
      </p>
    )}
    <Button type="button" variant="ghost" onClick={onReset}>
      <RotateCcwIcon /> Reset
    </Button>
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting}>
          Validate &amp; save
        </Button>
      )}
    </form.Subscribe>
  </div>
)

export default FlagEditor
