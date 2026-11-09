import { describe, expect, it } from 'vitest'

import { buildQuery } from '#/features/feature-flag/mappers/build-query'
import type {
  ConditionTree,
  GroupTree,
} from '#/features/feature-flag/utils/query-nodes'

const condition = (
  field: string,
  operator: ConditionTree['operator'],
  value = '',
): ConditionTree => ({ id: field, kind: 'condition', field, operator, value })

const group = (
  children: GroupTree['children'],
  combinator: GroupTree['combinator'] = 'and',
  negate = false,
): GroupTree => ({ id: 'g', kind: 'group', combinator, negate, children })

describe('build query', () => {
  it('builds a single condition with a quoted string value', () => {
    expect(buildQuery(group([condition('role', 'eq', 'admin')]))).toBe(
      'role eq "admin"',
    )
  })

  it.each([
    ['ne', 'ne'],
    ['lt', 'lt'],
    ['gt', 'gt'],
    ['le', 'le'],
    ['ge', 'ge'],
    ['co', 'co'],
    ['sw', 'sw'],
    ['ew', 'ew'],
  ] as const)('writes the %s operator', (operator, expected) => {
    expect(buildQuery(group([condition('email', operator, 'x')]))).toBe(
      `email ${expected} "x"`,
    )
  })

  it('keeps numbers and booleans unquoted', () => {
    const query = buildQuery(
      group([condition('age', 'ge', '18'), condition('beta', 'eq', 'true')]),
    )

    expect(query).toBe('age ge 18 and beta eq true')
  })

  it('escapes quotes inside a string value', () => {
    expect(buildQuery(group([condition('name', 'eq', 'say "hi"')]))).toBe(
      'name eq "say \\"hi\\""',
    )
  })

  it('writes "in a list" values as an array', () => {
    expect(
      buildQuery(group([condition('country', 'in', 'th, us,  ,42')])),
    ).toBe('country in ["th", "us", 42]')
  })

  it('writes "is present" without a value', () => {
    expect(buildQuery(group([condition('email', 'pr', 'ignored')]))).toBe(
      'email pr',
    )
  })

  it('joins conditions with the group combinator', () => {
    const query = buildQuery(
      group(
        [condition('role', 'eq', 'admin'), condition('role', 'eq', 'editor')],
        'or',
      ),
    )

    expect(query).toBe('role eq "admin" or role eq "editor"')
  })

  it('wraps nested groups in parentheses, three levels deep', () => {
    const query = buildQuery(
      group([
        condition('role', 'eq', 'admin'),
        group(
          [
            condition('country', 'eq', 'th'),
            group([condition('age', 'gt', '18'), condition('beta', 'pr')]),
          ],
          'or',
        ),
      ]),
    )

    expect(query).toBe(
      'role eq "admin" and (country eq "th" or (age gt 18 and beta pr))',
    )
  })

  it('negates a group with not', () => {
    expect(
      buildQuery(
        group([
          condition('plan', 'eq', 'free'),
          group([condition('role', 'eq', 'admin')], 'and', true),
        ]),
      ),
    ).toBe('plan eq "free" and not (role eq "admin")')

    expect(buildQuery(group([condition('a', 'eq', '1')], 'and', true))).toBe(
      'not (a eq 1)',
    )
  })

  it('skips conditions without a field and empty groups instead of writing "()"', () => {
    const query = buildQuery(
      group([
        condition('role', 'eq', 'admin'),
        condition('', 'eq', 'x'),
        group([]),
        group([condition('', 'eq', '')]),
      ]),
    )

    expect(query).toBe('role eq "admin"')
  })

  it('returns an empty query when nothing is filled in yet', () => {
    expect(buildQuery(group([condition('', 'eq', '')]))).toBe('')
  })
})
