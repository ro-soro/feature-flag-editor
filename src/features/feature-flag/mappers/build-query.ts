import {
  LIST_OPERATOR,
  VALUELESS_OPERATOR,
} from '#/features/feature-flag/utils/constants'
import { buildQueryTree } from '#/features/feature-flag/utils/query-nodes'
import type { QueryNode } from '#/features/feature-flag/schemas/flag-form-schema'
import type {
  ConditionTree,
  GroupTree,
  QueryTree,
} from '#/features/feature-flag/utils/query-nodes'

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/

// Numbers and booleans are written as is, anything else as a quoted string.
const formatScalar = (raw: string) => {
  const value = raw.trim()
  if (NUMBER_PATTERN.test(value) || value === 'true' || value === 'false') {
    return value
  }
  return JSON.stringify(value)
}

const formatValue = (condition: ConditionTree) => {
  if (condition.operator !== LIST_OPERATOR) return formatScalar(condition.value)

  const items = condition.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(formatScalar)
  return `[${items.join(', ')}]`
}

const buildCondition = (condition: ConditionTree) => {
  const field = condition.field.trim()
  if (!field) return ''
  if (condition.operator === VALUELESS_OPERATOR) return `${field} pr`

  return `${field} ${condition.operator} ${formatValue(condition)}`
}

const buildNode = (node: QueryTree): string => {
  if (node.kind === 'condition') return buildCondition(node)

  const body = buildGroupBody(node)
  if (!body) return ''
  return node.negate ? `not (${body})` : `(${body})`
}

const buildGroupBody = (group: GroupTree) =>
  group.children.map(buildNode).filter(Boolean).join(` ${group.combinator} `)

/**
 * Converts a rule's condition tree into a GO Feature Flag query, e.g.
 * `role eq "admin" and (country eq "th" or not (age lt 18))`.
 *
 * Unfinished parts (a condition without a field, an empty group) are left
 * out so the live preview never shows `()`; the form schema still reports them.
 */
export const buildQuery = (root: GroupTree) => {
  const body = buildGroupBody(root)
  if (!body) return ''
  return root.negate ? `not (${body})` : body
}

/** Query of a rule, built from its flat `nodes`. */
export const buildRuleQuery = (nodes: QueryNode[]) =>
  buildQuery(buildQueryTree(nodes))
