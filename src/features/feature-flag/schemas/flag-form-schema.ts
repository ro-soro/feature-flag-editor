import { z } from 'zod'

import {
  COMBINATORS,
  FLAG_TYPES,
  OPERATORS,
  SERVE_TYPES,
  VALUELESS_OPERATOR,
} from '#/features/feature-flag/utils/constants'
import type {
  Combinator,
  FlagType,
  Operator,
  ServeType,
} from '#/features/feature-flag/utils/constants'

/**
 * Form state of the editor. It is shaped for editing, not for output:
 * lists carry stable ids (React keys, drag & drop), and every reference to a
 * variation uses its id so renaming a variation never breaks a rule.
 * `mapToGoFeatureFlag` converts it into the GO Feature Flag file format.
 */
export interface FlagForm {
  flags: Flag[]
}

export interface Flag {
  id: string
  key: string
  description: string
  disable: boolean
  trackEvents: boolean
  version: string
  type: FlagType
  variations: Variation[]
  targeting: Rule[]
  defaultRule: Serve
  metadata: MetadataEntry[]
}

export interface Variation {
  id: string
  name: string
  // Kept as typed text and validated against the flag type.
  value: string
}

export interface Rule {
  id: string
  name: string
  // Condition tree stored flat; nodes[0] is always the root group.
  nodes: QueryNode[]
  serve: Serve
}

export type QueryNodeKind = 'group' | 'condition'

/**
 * One node of a rule's condition tree. The tree is stored flat ("normalized")
 * because TanStack Form cannot type field names of a recursive shape
 * (TS2589). A node's children are the nodes whose `parentId` is its id, in
 * array order. `buildQueryTree` turns the list back into a tree.
 *
 * Group nodes use `combinator` and `negate`; condition nodes use `field`,
 * `operator` and `value`. Both keep all fields so the shape is uniform.
 */
export interface QueryNode {
  id: string
  // null only for the root group
  parentId: string | null
  kind: QueryNodeKind
  combinator: Combinator
  negate: boolean
  field: string
  operator: Operator
  value: string
}

/**
 * All serve modes live side by side so switching the mode keeps what the
 * user already typed; only the fields of the selected `type` are validated
 * and written to the output.
 */
export interface Serve {
  type: ServeType
  variationId: string
  // Percentage per variation id. Variations without an entry count as 0.
  weights: Record<string, number>
  initial: RolloutStep
  end: RolloutStep
}

export interface RolloutStep {
  variationId: string
  percentage: number
  // Value of an <input type="datetime-local">, e.g. 2026-01-31T09:00
  date: string
}

export interface MetadataEntry {
  id: string
  key: string
  value: string
}

const FLAG_KEY_PATTERN = /^[a-zA-Z0-9_.-]+$/

// `description` is written to the metadata from its own field.
const RESERVED_METADATA_KEY = 'description'

const requiredText = (message: string) => z.string().trim().min(1, message)

const queryNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  kind: z.enum(['group', 'condition']),
  combinator: z.enum(COMBINATORS),
  negate: z.boolean(),
  field: z.string(),
  operator: z.enum(OPERATORS),
  value: z.string(),
})

// Rules per node kind, at any depth of the tree.
const refineQueryNodes = (nodes: QueryNode[], ctx: z.RefinementCtx) => {
  const childCount = new Map<string, number>()
  for (const node of nodes) {
    if (node.parentId === null) continue
    childCount.set(node.parentId, (childCount.get(node.parentId) ?? 0) + 1)
  }

  nodes.forEach((node, index) => {
    if (node.kind === 'group') {
      if (childCount.get(node.id)) return

      ctx.addIssue({
        code: 'custom',
        path: ['nodes', index],
        message: 'Group must contain at least one condition',
      })
      return
    }

    if (!node.field.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes', index, 'field'],
        message: 'Field is required',
      })
    }

    if (node.operator !== VALUELESS_OPERATOR && !node.value.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes', index, 'value'],
        message: 'Value is required',
      })
    }
  })
}

const percentageSchema = z
  .number({ error: 'Enter a percentage' })
  .min(0, 'Percentage must be between 0 and 100')
  .max(100, 'Percentage must be between 0 and 100')

const rolloutStepSchema = z.object({
  variationId: z.string(),
  percentage: percentageSchema,
  date: z.string(),
})

// Shape only. Rules that need the flag's variations are checked in `refineServe`.
const serveSchema = z.object({
  type: z.enum(SERVE_TYPES),
  variationId: z.string(),
  weights: z.record(z.string(), z.number()),
  initial: rolloutStepSchema,
  end: rolloutStepSchema,
})

const variationSchema = z.object({
  id: z.string(),
  name: requiredText('Variation name is required'),
  value: z.string(),
})

const metadataEntrySchema = z.object({
  id: z.string(),
  key: requiredText('Key is required'),
  value: z.string(),
})

const ruleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    nodes: z.array(queryNodeSchema).min(1),
    serve: serveSchema,
  })
  .superRefine((rule, ctx) => refineQueryNodes(rule.nodes, ctx))

type IssueContext = z.RefinementCtx
type IssuePath = (string | number)[]

const resolveValueIssue = (type: FlagType, value: string): string | null => {
  const text = value.trim()

  if (type === 'boolean') {
    return text === 'true' || text === 'false'
      ? null
      : 'Value must be true or false'
  }

  if (type === 'number') {
    return text !== '' && Number.isFinite(Number(text))
      ? null
      : 'Value must be a number'
  }

  if (type === 'json') {
    try {
      JSON.parse(text)
      return null
    } catch {
      return 'Value must be valid JSON'
    }
  }

  return null
}

const refineVariations = (flag: Flag, ctx: IssueContext) => {
  const seenNames = new Set<string>()

  flag.variations.forEach((variation, index) => {
    const name = variation.name.trim()

    if (name && seenNames.has(name)) {
      ctx.addIssue({
        code: 'custom',
        path: ['variations', index, 'name'],
        message: `Variation name "${name}" is already used`,
      })
    }
    seenNames.add(name)

    const valueIssue = resolveValueIssue(flag.type, variation.value)
    if (valueIssue) {
      ctx.addIssue({
        code: 'custom',
        path: ['variations', index, 'value'],
        message: valueIssue,
      })
    }
  })
}

const refineServe = (
  serve: Serve,
  variationIds: Set<string>,
  path: IssuePath,
  ctx: IssueContext,
) => {
  const requireVariation = (variationId: string, fieldPath: IssuePath) => {
    if (variationIds.has(variationId)) return

    ctx.addIssue({
      code: 'custom',
      path: [...path, ...fieldPath],
      message: 'Select a variation',
    })
  }

  if (serve.type === 'variation') {
    requireVariation(serve.variationId, ['variationId'])
    return
  }

  if (serve.type === 'percentage') {
    let total = 0

    for (const variationId of variationIds) {
      const weight = serve.weights[variationId] ?? 0
      total += weight

      if (weight < 0 || weight > 100) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'weights', variationId],
          message: 'Percentage must be between 0 and 100',
        })
      }
    }

    if (total !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'weights'],
        message: `Percentages must add up to 100 (currently ${total})`,
      })
    }
    return
  }

  requireVariation(serve.initial.variationId, ['initial', 'variationId'])
  requireVariation(serve.end.variationId, ['end', 'variationId'])

  const steps = [
    ['initial', serve.initial],
    ['end', serve.end],
  ] as const
  for (const [stepName, step] of steps) {
    if (!step.date) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, stepName, 'date'],
        message: 'Date is required',
      })
    }
  }

  if (serve.initial.date && serve.end.date) {
    if (serve.end.date <= serve.initial.date) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'end', 'date'],
        message: 'End date must be after the start date',
      })
    }
  }
}

const refineMetadata = (flag: Flag, ctx: IssueContext) => {
  const seenKeys = new Set<string>()

  flag.metadata.forEach((entry, index) => {
    const key = entry.key.trim()

    if (key === RESERVED_METADATA_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['metadata', index, 'key'],
        message: 'Use the Description field for the description',
      })
    } else if (key && seenKeys.has(key)) {
      ctx.addIssue({
        code: 'custom',
        path: ['metadata', index, 'key'],
        message: `Key "${key}" is already used`,
      })
    }
    seenKeys.add(key)
  })
}

const flagSchema = z
  .object({
    id: z.string(),
    key: requiredText('Flag name is required').regex(
      FLAG_KEY_PATTERN,
      'Use only letters, numbers, "-", "_" and "."',
    ),
    description: z.string(),
    disable: z.boolean(),
    trackEvents: z.boolean(),
    version: z.string(),
    type: z.enum(FLAG_TYPES),
    variations: z
      .array(variationSchema)
      .min(2, 'A flag needs at least two variations'),
    targeting: z.array(ruleSchema),
    defaultRule: serveSchema,
    metadata: z.array(metadataEntrySchema),
  })
  .superRefine((flag, ctx) => {
    const variationIds = new Set(flag.variations.map(({ id }) => id))

    refineVariations(flag, ctx)
    flag.targeting.forEach((rule, index) => {
      refineServe(rule.serve, variationIds, ['targeting', index, 'serve'], ctx)
    })
    refineServe(flag.defaultRule, variationIds, ['defaultRule'], ctx)
    refineMetadata(flag, ctx)
  })

export const flagFormSchema: z.ZodType<FlagForm, FlagForm> = z
  .object({
    flags: z.array(flagSchema).min(1, 'Add at least one flag'),
  })
  .superRefine((form, ctx) => {
    const seenKeys = new Set<string>()

    form.flags.forEach((flag, index) => {
      const key = flag.key.trim()

      if (key && seenKeys.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['flags', index, 'key'],
          message: `Flag name "${key}" is already used`,
        })
      }
      seenKeys.add(key)
    })
  })
