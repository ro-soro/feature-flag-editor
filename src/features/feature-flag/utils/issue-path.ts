import type { FlagForm } from '#/features/feature-flag/schemas/flag-form-schema'

type PathSegment = PropertyKey

const FIELD_LABELS: Record<string, string> = {
  key: 'Name',
  name: 'Name',
  value: 'Value',
  field: 'Field',
  operator: 'Operator',
  variationId: 'Variation',
  percentage: 'Percentage',
  date: 'Date',
  weights: 'Percentages',
  initial: 'Start',
  end: 'End',
  defaultRule: 'Default rule',
  serve: 'Serve',
  variations: 'Variations',
  metadata: 'Metadata',
}

/**
 * Readable location of a validation issue, e.g.
 * `['flags', 0, 'targeting', 1, 'nodes', 3, 'field']` →
 * `my-flag › Rule 2 › Condition › Field`.
 */
export const describeIssuePath = (values: FlagForm, path: PathSegment[]) => {
  const labels: string[] = []
  const [, flagIndex, ...rest] = path
  const flag =
    typeof flagIndex === 'number' ? values.flags.at(flagIndex) : undefined

  if (!flag) return 'Flags'
  labels.push(flag.key.trim() || `Flag ${Number(flagIndex) + 1}`)

  for (let position = 0; position < rest.length; position++) {
    const segment = rest[position]
    const next = rest[position + 1]

    if (segment === 'targeting' && typeof next === 'number') {
      const rule = flag.targeting.at(next)
      labels.push(rule?.name.trim() || `Rule ${next + 1}`)
      position++
      continue
    }

    if (segment === 'nodes' && typeof next === 'number') {
      const ruleIndex = rest[rest.indexOf('targeting') + 1]
      const node =
        typeof ruleIndex === 'number'
          ? flag.targeting.at(ruleIndex)?.nodes.at(next)
          : undefined
      labels.push(node?.kind === 'group' ? 'Group' : 'Condition')
      position++
      continue
    }

    if (segment === 'variations' && typeof next === 'number') {
      const variation = flag.variations.at(next)
      labels.push(`Variation "${variation?.name || next + 1}"`)
      position++
      continue
    }

    if (segment === 'metadata' && typeof next === 'number') {
      labels.push(`Metadata ${next + 1}`)
      position++
      continue
    }

    // A percentage of one variation: weights.<variation id>
    if (rest[position - 1] === 'weights') {
      const variation = flag.variations.find(({ id }) => id === segment)
      labels.push(variation?.name || 'Variation')
      continue
    }

    labels.push(FIELD_LABELS[String(segment)] ?? String(segment))
  }

  return labels.join(' › ')
}
