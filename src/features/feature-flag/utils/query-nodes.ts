import type { QueryNode } from '#/features/feature-flag/schemas/flag-form-schema'
import type {
  Combinator,
  Operator,
} from '#/features/feature-flag/utils/constants'

/** Tree view of a rule's flat `nodes`, read by `buildQuery`. */
export interface GroupTree {
  id: string
  kind: 'group'
  combinator: Combinator
  negate: boolean
  children: QueryTree[]
}

export interface ConditionTree {
  id: string
  kind: 'condition'
  field: string
  operator: Operator
  value: string
}

export type QueryTree = GroupTree | ConditionTree

const groupChildrenByParent = (nodes: QueryNode[]) => {
  const childrenByParent = new Map<string, QueryNode[]>()
  for (const node of nodes) {
    if (node.parentId === null) continue

    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }
  return childrenByParent
}

/** Rebuilds the tree from `nodes[0]`, the root group. */
export const buildQueryTree = (nodes: QueryNode[]): GroupTree => {
  const childrenByParent = groupChildrenByParent(nodes)

  const toCondition = (node: QueryNode): ConditionTree => ({
    id: node.id,
    kind: 'condition',
    field: node.field,
    operator: node.operator,
    value: node.value,
  })

  const toGroup = (node: QueryNode): GroupTree => ({
    id: node.id,
    kind: 'group',
    combinator: node.combinator,
    negate: node.negate,
    children: (childrenByParent.get(node.id) ?? []).map((child) =>
      child.kind === 'group' ? toGroup(child) : toCondition(child),
    ),
  })

  const root = nodes.at(0)
  if (!root) {
    return {
      id: '',
      kind: 'group',
      combinator: 'and',
      negate: false,
      children: [],
    }
  }
  return toGroup(root)
}

/** The node and everything nested under it, e.g. to remove a whole group. */
export const collectSubtreeIds = (nodes: QueryNode[], nodeId: string) => {
  const childrenByParent = groupChildrenByParent(nodes)
  const ids = new Set<string>()

  const visit = (id: string) => {
    ids.add(id)
    for (const child of childrenByParent.get(id) ?? []) visit(child.id)
  }
  visit(nodeId)

  return ids
}
