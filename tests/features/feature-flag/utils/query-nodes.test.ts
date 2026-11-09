import { describe, expect, it } from 'vitest'

import { buildRuleQuery } from '#/features/feature-flag/mappers/build-query'
import {
  buildQueryTree,
  collectSubtreeIds,
} from '#/features/feature-flag/utils/query-nodes'
import type { QueryNode } from '#/features/feature-flag/schemas/flag-form-schema'

const node = (
  id: string,
  parentId: string | null,
  kind: QueryNode['kind'],
  overrides: Partial<QueryNode> = {},
): QueryNode => ({
  id,
  parentId,
  kind,
  combinator: 'and',
  negate: false,
  field: id,
  operator: 'eq',
  value: 'x',
  ...overrides,
})

// root: a and (b or c) and d   (children kept in array order)
const nodes: QueryNode[] = [
  node('root', null, 'group'),
  node('a', 'root', 'condition'),
  node('g', 'root', 'group', { combinator: 'or' }),
  node('d', 'root', 'condition'),
  node('b', 'g', 'condition'),
  node('c', 'g', 'condition'),
]

describe('query nodes', () => {
  it('rebuilds the tree from the flat list in array order', () => {
    const tree = buildQueryTree(nodes)

    expect(tree.id).toBe('root')
    expect(tree.children.map((child) => child.id)).toEqual(['a', 'g', 'd'])
    expect(tree.children[1]).toMatchObject({
      kind: 'group',
      combinator: 'or',
      children: [{ id: 'b' }, { id: 'c' }],
    })
  })

  it('builds the rule query from the flat list', () => {
    expect(buildRuleQuery(nodes)).toBe(
      'a eq "x" and (b eq "x" or c eq "x") and d eq "x"',
    )
  })

  it('returns an empty root group when there are no nodes', () => {
    expect(buildQueryTree([]).children).toEqual([])
    expect(buildRuleQuery([])).toBe('')
  })

  it('collects a group with everything nested under it', () => {
    const deeper = [
      ...nodes,
      node('h', 'g', 'group'),
      node('e', 'h', 'condition'),
    ]

    expect([...collectSubtreeIds(deeper, 'g')].sort()).toEqual([
      'b',
      'c',
      'e',
      'g',
      'h',
    ])
    expect([...collectSubtreeIds(deeper, 'a')]).toEqual(['a'])
  })
})
