import { describe, expect, it } from 'vitest'

import { mapToGoFeatureFlag } from '#/features/feature-flag/mappers/to-go-feature-flag'
import type {
  Flag,
  QueryNode,
  Serve,
} from '#/features/feature-flag/schemas/flag-form-schema'

const serve = (overrides: Partial<Serve> = {}): Serve => ({
  type: 'variation',
  variationId: '',
  weights: {},
  initial: { variationId: '', percentage: 0, date: '' },
  end: { variationId: '', percentage: 100, date: '' },
  ...overrides,
})

const flag = (overrides: Partial<Flag> = {}): Flag => ({
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
  targeting: [],
  defaultRule: serve({ variationId: 'v-off' }),
  metadata: [],
  ...overrides,
})

// A root group holding one condition.
const rootWith = (
  condition: Pick<QueryNode, 'field' | 'operator' | 'value'>,
): QueryNode[] => [
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
  {
    id: 'c1',
    parentId: 'root',
    kind: 'condition',
    combinator: 'and',
    negate: false,
    ...condition,
  },
]

describe('map to GO Feature Flag', () => {
  it('produces the structure of the assignment example', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          targeting: [
            {
              id: 'r1',
              name: 'Beta users',
              nodes: rootWith({
                field: 'group',
                operator: 'eq',
                value: 'beta',
              }),
              serve: serve({
                type: 'percentage',
                weights: { 'v-on': 50, 'v-off': 50 },
              }),
            },
          ],
        }),
      ],
    })

    expect(output).toEqual({
      flags: {
        'my-new-feature': {
          variations: { on: true, off: false },
          targeting: [
            {
              name: 'Beta users',
              query: 'group eq "beta"',
              percentage: { on: 50, off: 50 },
            },
          ],
          defaultRule: { variation: 'off' },
        },
      },
    })
  })

  it('keeps the key order variations, targeting, defaultRule', () => {
    const output = mapToGoFeatureFlag({ flags: [flag()] })

    expect(Object.keys(output.flags['my-new-feature'])).toEqual([
      'variations',
      'defaultRule',
    ])
  })

  it.each([
    ['string', ['blue', ''], { on: 'blue', off: '' }],
    ['number', ['1.5', '-2'], { on: 1.5, off: -2 }],
    [
      'json',
      ['{ "color": "red" }', '[1, 2]'],
      { on: { color: 'red' }, off: [1, 2] },
    ],
  ] as const)(
    'converts %s variation values',
    (type, [onValue, offValue], expected) => {
      const output = mapToGoFeatureFlag({
        flags: [
          flag({
            type,
            variations: [
              { id: 'v-on', name: 'on', value: onValue },
              { id: 'v-off', name: 'off', value: offValue },
            ],
          }),
        ],
      })

      expect(output.flags['my-new-feature'].variations).toEqual(expected)
    },
  )

  it('keeps an invalid value as text so the preview still renders', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          type: 'json',
          variations: [
            { id: 'v-on', name: 'on', value: '{ broken' },
            { id: 'v-off', name: 'off', value: '{}' },
          ],
        }),
      ],
    })

    expect(output.flags['my-new-feature'].variations.on).toBe('{ broken')
  })

  it('resolves variation names from ids, so renaming a variation updates every rule', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          variations: [
            { id: 'v-on', name: 'enabled', value: 'true' },
            { id: 'v-off', name: 'disabled', value: 'false' },
          ],
          defaultRule: serve({ variationId: 'v-on' }),
        }),
      ],
    })

    expect(output.flags['my-new-feature'].defaultRule).toEqual({
      variation: 'enabled',
    })
  })

  it('writes percentages for every current variation, defaulting to 0', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          defaultRule: serve({
            type: 'percentage',
            weights: { 'v-on': 100, removed: 30 },
          }),
        }),
      ],
    })

    expect(output.flags['my-new-feature'].defaultRule).toEqual({
      percentage: { on: 100, off: 0 },
    })
  })

  it('writes a progressive rollout with ISO dates', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          defaultRule: serve({
            type: 'progressive',
            initial: {
              variationId: 'v-off',
              percentage: 0,
              date: '2026-01-01T09:00',
            },
            end: {
              variationId: 'v-on',
              percentage: 100,
              date: '2026-01-31T18:30',
            },
          }),
        }),
      ],
    })

    expect(output.flags['my-new-feature'].defaultRule).toEqual({
      progressiveRollout: {
        initial: {
          variation: 'off',
          percentage: 0,
          date: new Date('2026-01-01T09:00').toISOString(),
        },
        end: {
          variation: 'on',
          percentage: 100,
          date: new Date('2026-01-31T18:30').toISOString(),
        },
      },
    })
  })

  it('writes optional settings only when they differ from the defaults', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          description: 'New checkout page',
          disable: true,
          trackEvents: false,
          version: '1.2.0',
          metadata: [
            { id: 'm1', key: 'owner', value: 'web-team' },
            { id: 'm2', key: ' ', value: 'skipped' },
          ],
        }),
      ],
    })

    expect(output.flags['my-new-feature']).toEqual({
      variations: { on: true, off: false },
      defaultRule: { variation: 'off' },
      disable: true,
      trackEvents: false,
      version: '1.2.0',
      metadata: { description: 'New checkout page', owner: 'web-team' },
    })
  })

  it('writes every flag under its own name', () => {
    const output = mapToGoFeatureFlag({
      flags: [flag(), flag({ id: 'f2', key: 'dark-mode' })],
    })

    expect(Object.keys(output.flags)).toEqual(['my-new-feature', 'dark-mode'])
  })

  it('omits a rule name when it is blank', () => {
    const output = mapToGoFeatureFlag({
      flags: [
        flag({
          targeting: [
            {
              id: 'r1',
              name: '  ',
              nodes: rootWith({ field: 'beta', operator: 'pr', value: '' }),
              serve: serve({ variationId: 'v-on' }),
            },
          ],
        }),
      ],
    })

    expect(output.flags['my-new-feature'].targeting).toEqual([
      { query: 'beta pr', variation: 'on' },
    ])
  })
})
