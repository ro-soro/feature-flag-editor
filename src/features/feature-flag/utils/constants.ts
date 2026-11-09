export const FLAG_TYPES = ['boolean', 'string', 'number', 'json'] as const
export type FlagType = (typeof FLAG_TYPES)[number]

export const FLAG_TYPE_OPTIONS: { label: string; value: FlagType }[] = [
  { label: 'Boolean', value: 'boolean' },
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'JSON', value: 'json' },
]

// Operators of the GO Feature Flag query language (nikunjy/rules).
export const OPERATORS = [
  'eq',
  'ne',
  'lt',
  'gt',
  'le',
  'ge',
  'co',
  'sw',
  'ew',
  'in',
  'pr',
] as const
export type Operator = (typeof OPERATORS)[number]

export const OPERATOR_OPTIONS: { label: string; value: Operator }[] = [
  { label: 'Equals to', value: 'eq' },
  { label: 'Not equals to', value: 'ne' },
  { label: 'Less than', value: 'lt' },
  { label: 'Greater than', value: 'gt' },
  { label: 'Less than or equal to', value: 'le' },
  { label: 'Greater than or equal to', value: 'ge' },
  { label: 'Contains', value: 'co' },
  { label: 'Starts with', value: 'sw' },
  { label: 'Ends with', value: 'ew' },
  { label: 'In a list', value: 'in' },
  { label: 'Is present', value: 'pr' },
]

// "Is present" checks that the attribute exists, so it takes no value.
export const VALUELESS_OPERATOR: Operator = 'pr'

// "In a list" takes comma separated values: admin, editor
export const LIST_OPERATOR: Operator = 'in'

export const COMBINATORS = ['and', 'or'] as const
export type Combinator = (typeof COMBINATORS)[number]

export const COMBINATOR_OPTIONS: { label: string; value: Combinator }[] = [
  { label: 'AND', value: 'and' },
  { label: 'OR', value: 'or' },
]

export const SERVE_TYPES = ['variation', 'percentage', 'progressive'] as const
export type ServeType = (typeof SERVE_TYPES)[number]

export const SERVE_TYPE_OPTIONS: { label: string; value: ServeType }[] = [
  { label: 'A single variation', value: 'variation' },
  { label: 'A percentage rollout', value: 'percentage' },
  { label: 'A progressive rollout', value: 'progressive' },
]

// Colors that tag each variation everywhere it is referenced, in list order.
export const VARIATION_COLORS = [
  'bg-emerald-500',
  'bg-orange-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-400',
  'bg-teal-500',
  'bg-fuchsia-500',
]
