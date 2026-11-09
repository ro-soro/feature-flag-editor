import { buildRuleQuery } from '#/features/feature-flag/mappers/build-query'
import type {
  Flag,
  FlagForm,
  RolloutStep,
  Rule,
  Serve,
  Variation,
} from '#/features/feature-flag/schemas/flag-form-schema'
import type { FlagType } from '#/features/feature-flag/utils/constants'

/**
 * Output contract: the GO Feature Flag configuration file, wrapped in
 * `flags` like the assignment's expected.json.
 * https://gofeatureflag.org/docs/configure_flag/flag_format
 */
export interface GoFeatureFlagConfig {
  flags: Record<string, GoFeatureFlagFlag>
}

export interface GoFeatureFlagFlag {
  variations: Record<string, VariationValue>
  targeting?: GoFeatureFlagRule[]
  defaultRule: GoFeatureFlagServe
  disable?: boolean
  trackEvents?: boolean
  version?: string
  metadata?: Record<string, string>
}

export interface GoFeatureFlagRule {
  name?: string
  query: string
  variation?: string
  percentage?: Record<string, number>
  progressiveRollout?: GoFeatureFlagProgressiveRollout
}

// Exactly one of the three fields is written.
export interface GoFeatureFlagServe {
  variation?: string
  percentage?: Record<string, number>
  progressiveRollout?: GoFeatureFlagProgressiveRollout
}

export interface GoFeatureFlagProgressiveRollout {
  initial: GoFeatureFlagRolloutStep
  end: GoFeatureFlagRolloutStep
}

export interface GoFeatureFlagRolloutStep {
  variation: string
  percentage: number
  date: string
}

export type VariationValue =
  | boolean
  | number
  | string
  | null
  | VariationValue[]
  | { [key: string]: VariationValue }

/**
 * Typed text becomes the flag type's value. Text that is not valid for the
 * type is kept as text so the live preview always renders; the form schema
 * reports the problem on the field.
 */
const mapVariationValue = (type: FlagType, raw: string): VariationValue => {
  const text = raw.trim()

  if (type === 'boolean') {
    if (text === 'true') return true
    if (text === 'false') return false
    return raw
  }

  if (type === 'number') {
    const value = Number(text)
    return text !== '' && Number.isFinite(value) ? value : raw
  }

  if (type === 'json') {
    try {
      return JSON.parse(text) as VariationValue
    } catch {
      return raw
    }
  }

  return raw
}

// <input type="datetime-local"> has no zone: it is read as local time.
const mapDate = (localDateTime: string) => {
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? localDateTime : date.toISOString()
}

const mapRolloutStep = (
  step: RolloutStep,
  nameById: Map<string, string>,
): GoFeatureFlagRolloutStep => ({
  variation: nameById.get(step.variationId) ?? '',
  percentage: step.percentage,
  date: mapDate(step.date),
})

const mapServe = (
  serve: Serve,
  variations: Variation[],
  nameById: Map<string, string>,
): GoFeatureFlagServe => {
  if (serve.type === 'percentage') {
    return {
      percentage: Object.fromEntries(
        variations.map(({ id, name }) => [name, serve.weights[id] ?? 0]),
      ),
    }
  }

  if (serve.type === 'progressive') {
    return {
      progressiveRollout: {
        initial: mapRolloutStep(serve.initial, nameById),
        end: mapRolloutStep(serve.end, nameById),
      },
    }
  }

  return { variation: nameById.get(serve.variationId) ?? '' }
}

const mapMetadata = (flag: Flag) => {
  const entries = flag.metadata
    .filter(({ key }) => key.trim())
    .map(({ key, value }) => [key.trim(), value] as const)
  const description = flag.description.trim()

  if (description) entries.unshift(['description', description])
  return entries.length ? Object.fromEntries(entries) : undefined
}

const mapRule = (
  rule: Rule,
  variations: Variation[],
  nameById: Map<string, string>,
): GoFeatureFlagRule => {
  const name = rule.name.trim()

  return {
    ...(name ? { name } : {}),
    query: buildRuleQuery(rule.nodes),
    ...mapServe(rule.serve, variations, nameById),
  }
}

const mapFlag = (flag: Flag): GoFeatureFlagFlag => {
  const nameById = new Map(flag.variations.map(({ id, name }) => [id, name]))
  const version = flag.version.trim()
  const metadata = mapMetadata(flag)

  // Optional settings are written only when they differ from GO Feature Flag defaults.
  return {
    variations: Object.fromEntries(
      flag.variations.map(({ name, value }) => [
        name,
        mapVariationValue(flag.type, value),
      ]),
    ),
    ...(flag.targeting.length
      ? {
          targeting: flag.targeting.map((rule) =>
            mapRule(rule, flag.variations, nameById),
          ),
        }
      : {}),
    defaultRule: mapServe(flag.defaultRule, flag.variations, nameById),
    ...(flag.disable ? { disable: true } : {}),
    ...(flag.trackEvents ? {} : { trackEvents: false }),
    ...(version ? { version } : {}),
    ...(metadata ? { metadata } : {}),
  }
}

export const mapToGoFeatureFlag = (form: FlagForm): GoFeatureFlagConfig => ({
  flags: Object.fromEntries(
    form.flags.map((flag) => [flag.key.trim(), mapFlag(flag)]),
  ),
})
