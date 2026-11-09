// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import FlagEditor from '#/features/feature-flag/components/flag-editor'

// Monaco loads from a CDN in the browser; the test reads the same JSON text.
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value }: { value: string }) => (
    <pre data-testid="json-preview">{value}</pre>
  ),
}))

// jsdom has no ResizeObserver; the Radix switch only needs it to exist.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

// jsdom does no layout, so it has no scrollIntoView (used to show errors).
const scrollIntoView = vi.fn()
Element.prototype.scrollIntoView = scrollIntoView

afterEach(cleanup)

const readPreview = () =>
  JSON.parse(screen.getByTestId('json-preview').textContent || '{}') as {
    flags: Record<string, Record<string, unknown>>
  }

const inputByName = (name: string) => {
  const element = document.querySelector<HTMLInputElement>(`[name="${name}"]`)
  if (!element) throw new Error(`No input named ${name}`)
  return element
}

const typeInto = (name: string, value: string) => {
  const input = inputByName(name)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('flag editor', () => {
  it('starts with a valid flag that serves "off" by default', async () => {
    render(<FlagEditor />)

    await waitFor(() =>
      expect(readPreview()).toEqual({
        flags: {
          'my-new-feature': {
            variations: { on: true, off: false },
            defaultRule: { variation: 'off' },
          },
        },
      }),
    )
    expect(screen.getByText('Valid')).toBeTruthy()
  })

  it('updates the JSON preview while typing the flag name', async () => {
    render(<FlagEditor />)

    typeInto('flags[0].key', 'checkout-v2')

    await waitFor(() =>
      expect(Object.keys(readPreview().flags)).toEqual(['checkout-v2']),
    )
  })

  it('tells the user what is wrong next to the field', async () => {
    render(<FlagEditor />)

    typeInto('flags[0].key', '')

    expect(
      await screen.findAllByText('Flag name is required'),
    ).not.toHaveLength(0)
    expect(inputByName('flags[0].key').getAttribute('aria-invalid')).toBe(
      'true',
    )
  })

  it('builds a rule with a nested group and shows its query', async () => {
    render(<FlagEditor />)

    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Group' }))

    expect(
      screen.getByRole('group', { name: 'Nested group, level 1' }),
    ).toBeTruthy()

    typeInto('flags[0].targeting[0].nodes[1].field', 'role')
    typeInto('flags[0].targeting[0].nodes[1].value', 'admin')
    typeInto('flags[0].targeting[0].nodes[3].field', 'country')
    typeInto('flags[0].targeting[0].nodes[3].value', 'th')

    await waitFor(() =>
      expect(readPreview().flags['my-new-feature'].targeting).toEqual([
        {
          name: 'Rule 1',
          query: 'role eq "admin" and (country eq "th")',
          variation: 'on',
        },
      ]),
    )
  })

  it('removes a nested group together with its conditions', async () => {
    render(<FlagEditor />)

    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Group' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove group' }))

    expect(screen.queryByRole('group', { name: /nested group/i })).toBeNull()
    expect(document.querySelectorAll('[name$=".operator"]')).toHaveLength(1)
  })

  it('adds and removes variations, keeping at least two', () => {
    render(<FlagEditor />)

    const removeFirst = () =>
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Remove variation 1',
      })
    expect(removeFirst().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /add variation/i }))
    expect(inputByName('flags[0].variations[2].name').value).toBe('variation_3')
    expect(removeFirst().disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Remove variation 3' }))
    expect(
      document.querySelector('[name="flags[0].variations[2].name"]'),
    ).toBeNull()
  })

  it('lists every problem after an invalid submit', async () => {
    render(<FlagEditor />)

    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    fireEvent.click(screen.getByRole('button', { name: /validate/i }))

    expect(await screen.findByText(/2 problems to fix/)).toBeTruthy()
    expect(screen.getAllByText('Field is required').length).toBeGreaterThan(0)
    expect(screen.queryByText(/configuration is valid/i)).toBeNull()
    // Takes the user to the first problem.
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('confirms a valid submit', async () => {
    render(<FlagEditor />)

    fireEvent.click(screen.getByRole('button', { name: /validate/i }))

    expect(await screen.findByText(/configuration is valid/i)).toBeTruthy()
  })
})
