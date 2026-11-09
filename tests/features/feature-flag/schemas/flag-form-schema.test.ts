import { describe, expect, it } from 'vitest'

import { flagFormSchema } from '#/features/feature-flag/schemas/flag-form-schema'
import type {
  Flag,
  FlagForm,
  QueryNode,
} from '#/features/feature-flag/schemas/flag-form-schema'

const groupNode = (
  id: string,
  parentId: string | null,
  overrides: Partial<QueryNode> = {},
): QueryNode => ({
  id,
  parentId,
  kind: 'group',
  combinator: 'and',
  negate: false,
  field: '',
  operator: 'eq',
  value: '',
  ...overrides,
})

const conditionNode = (
  id: string,
  parentId: string,
  overrides: Partial<QueryNode> = {},
): QueryNode => ({
  id,
  parentId,
  kind: 'condition',
  combinator: 'and',
  negate: false,
  field: 'role',
  operator: 'eq',
  value: 'admin',
  ...overrides,
})

const validFlag = (overrides: Partial<Flag> = {}): Flag => ({
  id: 'f1',
  key: 'my-new-feature',
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
      name: 'Rule 1',
      nodes: [groupNode('root', null), conditionNode('c1', 'root')],
      serve: {
        type: 'variation',
        variationId: 'v-on',
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
  ...overrides,
})

const formOf = (...flags: Flag[]): FlagForm => ({ flags })

const issuesOf = (form: FlagForm) => {
  const result = flagFormSchema.safeParse(form)
  if (result.success) return []
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

const pathsOf = (form: FlagForm) => issuesOf(form).map((issue) => issue.path)

describe('flag form schema', () => {
  it('accepts a complete flag', () => {
    expect(issuesOf(formOf(validFlag()))).toEqual([])
  })

  describe('flag metadata', () => {
    it('requires a flag name', () => {
      expect(issuesOf(formOf(validFlag({ key: '  ' })))).toContainEqual({
        path: 'flags.0.key',
        message: 'Flag name is required',
      })
    })

    it('rejects characters that are not allowed in a flag name', () => {
      expect(pathsOf(formOf(validFlag({ key: 'my flag!' })))).toContain(
        'flags.0.key',
      )
    })

    it('rejects duplicate flag names across flags', () => {
      const issues = issuesOf(
        formOf(validFlag(), validFlag({ id: 'f2', key: 'my-new-feature' })),
      )

      expect(issues).toContainEqual({
        path: 'flags.1.key',
        message: 'Flag name "my-new-feature" is already used',
      })
    })
  })

  describe('variations', () => {
    it('requires at least two variations', () => {
      const flag = validFlag()
      flag.variations = [flag.variations[0]]
      flag.defaultRule.variationId = 'v-on'

      expect(pathsOf(formOf(flag))).toContain('flags.0.variations')
    })

    it('rejects empty and duplicate variation names', () => {
      const flag = validFlag({
        variations: [
          { id: 'v-on', name: 'on', value: 'true' },
          { id: 'v-off', name: 'on', value: 'false' },
          { id: 'v-x', name: '', value: 'true' },
        ],
      })

      expect(pathsOf(formOf(flag))).toEqual(
        expect.arrayContaining([
          'flags.0.variations.1.name',
          'flags.0.variations.2.name',
        ]),
      )
    })

    it.each([
      ['boolean', 'yes', 'Value must be true or false'],
      ['number', 'abc', 'Value must be a number'],
      ['json', '{ bad', 'Value must be valid JSON'],
    ] as const)(
      'validates %s values against the flag type',
      (type, value, message) => {
        const flag = validFlag({
          type,
          variations: [
            { id: 'v-on', name: 'on', value },
            { id: 'v-off', name: 'off', value: '' },
          ],
        })

        expect(issuesOf(formOf(flag))).toContainEqual({
          path: 'flags.0.variations.0.value',
          message,
        })
      },
    )

    it('accepts any text for string flags, including empty text', () => {
      const flag = validFlag({
        type: 'string',
        variations: [
          { id: 'v-on', name: 'on', value: 'blue' },
          { id: 'v-off', name: 'off', value: '' },
        ],
      })

      expect(issuesOf(formOf(flag))).toEqual([])
    })
  })

  describe('targeting query', () => {
    it('requires a field and a value on each condition', () => {
      const flag = validFlag()
      flag.targeting[0].nodes = [
        groupNode('root', null),
        conditionNode('c1', 'root', { field: '', value: '' }),
      ]

      expect(pathsOf(formOf(flag))).toEqual(
        expect.arrayContaining([
          'flags.0.targeting.0.nodes.1.field',
          'flags.0.targeting.0.nodes.1.value',
        ]),
      )
    })

    it('does not require a value for the "present" operator', () => {
      const flag = validFlag()
      flag.targeting[0].nodes = [
        groupNode('root', null),
        conditionNode('c1', 'root', { operator: 'pr', value: '' }),
      ]

      expect(issuesOf(formOf(flag))).toEqual([])
    })

    it('ignores condition fields on group nodes', () => {
      const flag = validFlag()
      flag.targeting[0].nodes = [
        groupNode('root', null, { field: '', value: '' }),
        conditionNode('c1', 'root'),
      ]

      expect(issuesOf(formOf(flag))).toEqual([])
    })

    it('rejects an empty group at any depth', () => {
      const flag = validFlag()
      flag.targeting[0].nodes = [
        groupNode('root', null),
        conditionNode('c1', 'root'),
        groupNode('g2', 'root'),
        conditionNode('c2', 'g2'),
        groupNode('g3', 'g2'),
      ]

      expect(issuesOf(formOf(flag))).toEqual([
        {
          path: 'flags.0.targeting.0.nodes.4',
          message: 'Group must contain at least one condition',
        },
      ])
    })

    it('rejects a rule whose root group is empty', () => {
      const flag = validFlag()
      flag.targeting[0].nodes = [groupNode('root', null)]

      expect(pathsOf(formOf(flag))).toEqual(['flags.0.targeting.0.nodes.0'])
    })

    it('validates conditions nested three levels deep', () => {
      const flag = validFlag()
      flag.targeting[0].nodes = [
        groupNode('root', null),
        groupNode('g2', 'root'),
        groupNode('g3', 'g2'),
        conditionNode('c1', 'g3', { field: '' }),
      ]

      expect(pathsOf(formOf(flag))).toEqual([
        'flags.0.targeting.0.nodes.3.field',
      ])
    })
  })

  describe('serve', () => {
    it('rejects a variation that does not exist', () => {
      const flag = validFlag()
      flag.targeting[0].serve.variationId = 'missing'

      expect(issuesOf(formOf(flag))).toContainEqual({
        path: 'flags.0.targeting.0.serve.variationId',
        message: 'Select a variation',
      })
    })

    it('requires percentage weights to add up to 100', () => {
      const flag = validFlag()
      flag.defaultRule = {
        ...flag.defaultRule,
        type: 'percentage',
        weights: { 'v-on': 30, 'v-off': 60 },
      }

      expect(issuesOf(formOf(flag))).toContainEqual({
        path: 'flags.0.defaultRule.weights',
        message: 'Percentages must add up to 100 (currently 90)',
      })
    })

    it('ignores weights of variations that were removed', () => {
      const flag = validFlag()
      flag.defaultRule = {
        ...flag.defaultRule,
        type: 'percentage',
        weights: { 'v-on': 40, 'v-off': 60, removed: 50 },
      }

      expect(issuesOf(formOf(flag))).toEqual([])
    })

    it('rejects a percentage outside 0 to 100', () => {
      const flag = validFlag()
      flag.defaultRule = {
        ...flag.defaultRule,
        type: 'percentage',
        weights: { 'v-on': 120, 'v-off': -20 },
      }

      expect(pathsOf(formOf(flag))).toEqual(
        expect.arrayContaining([
          'flags.0.defaultRule.weights.v-on',
          'flags.0.defaultRule.weights.v-off',
        ]),
      )
    })

    it('requires a progressive rollout to end after it starts', () => {
      const flag = validFlag()
      flag.defaultRule = {
        ...flag.defaultRule,
        type: 'progressive',
        initial: {
          variationId: 'v-off',
          percentage: 0,
          date: '2026-02-01T00:00',
        },
        end: { variationId: 'v-on', percentage: 100, date: '2026-01-01T00:00' },
      }

      expect(issuesOf(formOf(flag))).toContainEqual({
        path: 'flags.0.defaultRule.end.date',
        message: 'End date must be after the start date',
      })
    })

    it('requires both progressive rollout dates', () => {
      const flag = validFlag()
      flag.defaultRule = {
        ...flag.defaultRule,
        type: 'progressive',
        initial: { variationId: 'v-off', percentage: 0, date: '' },
        end: { variationId: 'v-on', percentage: 100, date: '' },
      }

      expect(pathsOf(formOf(flag))).toEqual(
        expect.arrayContaining([
          'flags.0.defaultRule.initial.date',
          'flags.0.defaultRule.end.date',
        ]),
      )
    })
  })

  describe('custom metadata', () => {
    it('rejects empty and duplicate metadata keys', () => {
      const flag = validFlag({
        metadata: [
          { id: 'm1', key: 'owner', value: 'team-a' },
          { id: 'm2', key: 'owner', value: 'team-b' },
          { id: 'm3', key: '', value: 'x' },
        ],
      })

      expect(pathsOf(formOf(flag))).toEqual(
        expect.arrayContaining([
          'flags.0.metadata.1.key',
          'flags.0.metadata.2.key',
        ]),
      )
    })

    it('reserves the "description" key for the Description field', () => {
      const flag = validFlag({
        metadata: [{ id: 'm1', key: 'description', value: 'x' }],
      })

      expect(issuesOf(formOf(flag))).toContainEqual({
        path: 'flags.0.metadata.0.key',
        message: 'Use the Description field for the description',
      })
    })
  })
})
