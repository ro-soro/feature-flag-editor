import type {
  Flag,
  FlagForm,
  MetadataEntry,
  QueryNode,
  Rule,
  Serve,
  Variation,
} from '#/features/feature-flag/schemas/flag-form-schema'
import type { FlagType } from '#/features/feature-flag/utils/constants'

type CreateId = () => string

const buildId: CreateId = () => crypto.randomUUID()

/**
 * The first form is rendered on the server and again in the browser, so its
 * ids must be the same in both places (they are written into <option value>).
 * Everything the user adds later is created in the browser with random ids.
 */
const createSequentialIds = (prefix: string): CreateId => {
  let count = 0
  return () => `${prefix}-${++count}`
}

// Starting values when a flag is created or its type changes, alternating on/off.
const DEFAULT_VARIATION_VALUES: Record<FlagType, [string, string]> = {
  boolean: ['true', 'false'],
  string: ['enabled', 'disabled'],
  number: ['1', '0'],
  json: ['{ "enabled": true }', '{ "enabled": false }'],
}

export const buildDefaultVariationValue = (type: FlagType, index: number) =>
  DEFAULT_VARIATION_VALUES[type][index % 2]

export const buildVariation = (
  name: string,
  value: string,
  createId = buildId,
): Variation => ({ id: createId(), name, value })

export const buildServe = (variationId = ''): Serve => ({
  type: 'variation',
  variationId,
  weights: {},
  initial: { variationId: '', percentage: 0, date: '' },
  end: { variationId: '', percentage: 100, date: '' },
})

export const buildConditionNode = (parentId: string): QueryNode => ({
  id: buildId(),
  parentId,
  kind: 'condition',
  combinator: 'and',
  negate: false,
  field: '',
  operator: 'eq',
  value: '',
})

/**
 * A new group comes with one empty condition so it is never empty.
 * Returns the group followed by that condition, ready to append to `nodes`.
 */
export const buildGroupNodes = (parentId: string | null): QueryNode[] => {
  const group: QueryNode = {
    id: buildId(),
    parentId,
    kind: 'group',
    combinator: 'and',
    negate: false,
    field: '',
    operator: 'eq',
    value: '',
  }
  return [group, buildConditionNode(group.id)]
}

export const buildRule = (ruleNumber: number, variationId: string): Rule => ({
  id: buildId(),
  name: `Rule ${ruleNumber}`,
  nodes: buildGroupNodes(null),
  serve: buildServe(variationId),
})

export const buildMetadataEntry = (): MetadataEntry => ({
  id: buildId(),
  key: '',
  value: '',
})

export const buildFlag = (key: string, createId = buildId): Flag => {
  const on = buildVariation(
    'on',
    buildDefaultVariationValue('boolean', 0),
    createId,
  )
  const off = buildVariation(
    'off',
    buildDefaultVariationValue('boolean', 1),
    createId,
  )

  return {
    id: createId(),
    key,
    description: '',
    disable: false,
    trackEvents: true,
    version: '',
    type: 'boolean',
    variations: [on, off],
    targeting: [],
    defaultRule: buildServe(off.id),
    metadata: [],
  }
}

export const buildInitialFlagForm = (): FlagForm => ({
  flags: [buildFlag('my-new-feature', createSequentialIds('initial'))],
})
