import { CircleAlertIcon } from 'lucide-react'

import type { FlagForm } from '#/features/feature-flag/schemas/flag-form-schema'
import type { FormIssue } from '#/features/feature-flag/hooks/use-flag-snapshot'
import { findIssueElement } from '#/features/feature-flag/utils/field-path'
import { describeIssuePath } from '#/features/feature-flag/utils/issue-path'

interface ErrorSummaryProps {
  values: FlagForm
  issues: FormIssue[]
}

const FOCUSABLE = 'input, select, textarea, button, [tabindex]'

const ErrorSummary: React.FC<ErrorSummaryProps> = ({ values, issues }) => {
  if (issues.length === 0) return null

  const handleShowIssue = (issue: FormIssue) => {
    const element = findIssueElement(issue.path)
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const target = element.matches(FOCUSABLE)
      ? element
      : element.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus({ preventScroll: true })
  }

  return (
    <section
      aria-labelledby="error-summary-title"
      className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"
    >
      <h3
        id="error-summary-title"
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive"
      >
        <CircleAlertIcon className="size-4" />
        {issues.length} {issues.length === 1 ? 'problem' : 'problems'} to fix
      </h3>
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto text-sm">
        {issues.map((issue) => (
          <li key={`${issue.path.join('.')}:${issue.message}`}>
            <button
              type="button"
              className="w-full rounded-md px-2 py-1 text-left hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              onClick={() => handleShowIssue(issue)}
            >
              <span className="block text-xs text-muted-foreground">
                {describeIssuePath(values, issue.path)}
              </span>
              <span className="text-destructive">{issue.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ErrorSummary
