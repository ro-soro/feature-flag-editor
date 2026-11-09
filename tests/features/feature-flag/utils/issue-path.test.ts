import { describe, expect, it } from 'vitest'

import { buildFieldDomId } from '#/features/feature-flag/utils/field-path'
import { describeIssuePath } from '#/features/feature-flag/utils/issue-path'
import type { FlagForm } from '#/features/feature-flag/schemas/flag-form-schema'

const values: FlagForm = {
  flags: [
    {
      id: 'f1',
      key: 'checkout',
      description: '',
      disable: false,
      trackEvents: true,
      version: '',
      type: 'boolean',
      variations: [
        { id: 'v-on', name: 'on', value: 'true' },
        { id: 'v-off', name: 'off', value: 'false' },
      ],
      targeting: [
        {
          id: 'r1',
          name: '',
          nodes: [
            {
              id: 'root',
              parentId: null,
              kind: 'group',
              combinator: 'and',
              negate: false,
              field: '',
              operator: 'eq',
              value: '',
            },
          ],
          serve: {
            type: 'percentage',
            variationId: '',
            weights: {},
            initial: { variationId: '', percentage: 0, date: '' },
            end: { variationId: '', percentage: 100, date: '' },
          },
        },
      ],
      defaultRule: {
        type: 'variation',
        variationId: 'v-off',
        weights: {},
        initial: { variationId: '', percentage: 0, date: '' },
        end: { variationId: '', percentage: 100, date: '' },
      },
      metadata: [],
    },
  ],
}

describe('issue path', () => {
  it.each([
    [['flags', 0, 'key'], 'checkout › Name'],
    [
      ['flags', 0, 'variations', 1, 'value'],
      'checkout › Variation "off" › Value',
    ],
    [['flags', 0, 'targeting', 0, 'nodes', 0], 'checkout › Rule 1 › Group'],
    [
      ['flags', 0, 'targeting', 0, 'serve', 'weights', 'v-on'],
      'checkout › Rule 1 › Serve › Percentages › on',
    ],
    [
      ['flags', 0, 'defaultRule', 'end', 'date'],
      'checkout › Default rule › End › Date',
    ],
  ])('describes %j as "%s"', (path, expected) => {
    expect(describeIssuePath(values, path)).toBe(expected)
  })

  it('gives a field name and an issue path the same DOM id', () => {
    expect(buildFieldDomId('flags[0].targeting[1].nodes[2].field')).toBe(
      buildFieldDomId(['flags', 0, 'targeting', 1, 'nodes', 2, 'field']),
    )
  })
})
