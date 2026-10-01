import { expect, test } from 'claude-code/testing'

import {
  blankDraft,
  blocker,
  createFrom,
  flowOfLabel,
  githubRef,
  guessed,
  issueOf,
  picked,
  preview,
  slugPath,
  typed,
} from '../hooks/draft'
import { stripText } from '../hooks/strip'

test('typing follows the name and the guessed flow until they are set by hand', () => {
  const start = blankDraft()
  expect(start).toEqual({
    text: '',
    title: '',
    flow: 'grill',
    isFlowPicked: false,
    openPr: true,
    worktree: 'never',
    model: '',
    effort: '',
    ui: false,
  })

  const typedIdea = typed(start, 'checkout crashes on submit\nsecond line')
  expect(typedIdea).toMatchObject({ title: 'checkout crashes on submit', flow: 'oneshot' })
  expect(typed(typedIdea, '#12').flow).toBe('oneshot')
  expect(typed(typedIdea, 'greenfield billing').flow).toBe('wayfind')

  const named = typed({ ...typedIdea, title: 'My name' }, 'something else')
  expect(named.title).toBe('My name')

  const chosen = picked(typedIdea, 'spec')
  expect(typed(chosen, 'retry checkout')).toMatchObject({ flow: 'spec', isFlowPicked: true })
  expect(guessed(chosen, 'oneshot').flow).toBe('spec')
  expect(guessed(typedIdea, 'freeform').flow).toBe('freeform')
  expect(typed(start, 'x'.repeat(100)).title).toHaveLength(72)
})

test('the preview names the stages in words and marks the gates', () => {
  const spec = { ...typed(blankDraft(), 'retry checkout'), flow: 'spec' as const }
  expect(stripText(preview(spec), 400)).toEqual([
    '○ Settle decisions → ○ Write the spec ◆ → ○ Split into tickets ◆ → ○ Build the tickets → ○ Open the PR → ○ Look back',
  ])
  expect(preview({ ...picked(spec, 'spec'), openPr: false }).map(one => one.stage)).not.toContain('pr')
  expect(preview(picked(blankDraft(), 'freeform'))).toEqual([])
  expect(preview({ ...typed(blankDraft(), 'checkout crashes'), flow: 'oneshot' }).map(one => one.label)).toEqual(['Diagnose', 'Open the PR', 'Look back'])
  expect(slugPath(typed(blankDraft(), 'Retry checkout!'))).toBe('.scratch/retry-checkout/')
  expect(blocker(blankDraft())).toBe('Describe what to build first.')
  expect(blocker(typed(blankDraft(), 'x'))).toBeUndefined()
})

test('only a bare issue reference is fetched from GitHub', () => {
  expect(githubRef('#123')).toBe('123')
  expect(githubRef(' https://github.com/o/r/issues/9 ')).toBe('https://github.com/o/r/issues/9')
  expect(githubRef('fix #123 today')).toBeUndefined()
  expect(githubRef('https://github.com/o/r/pull/9')).toBeUndefined()
  expect(githubRef('https://evil.example/o/r/issues/9')).toBeUndefined()

  const ok = { exitCode: 0, stderr: '', stdout: JSON.stringify({ title: 'Retry', body: 'Details', url: 'https://github.com/o/r/issues/9' }) }
  expect(issueOf(ok)).toEqual({ title: 'Retry', body: 'Details', url: 'https://github.com/o/r/issues/9' })
  expect(issueOf({ ...ok, exitCode: 1, stderr: 'no such issue\nmore' })).toBe('no such issue')
  expect(issueOf({ ...ok, stdout: 'nope' })).toBe('gh printed no issue')

  const made = createFrom(typed(blankDraft(), '#9'), { title: 'Retry', body: 'Details', url: 'u' })
  expect(made).toMatchObject({ text: '#9', title: 'Retry', start: 'ticket', ticket: '# Retry\n\nu\n\nDetails' })
  const named = createFrom({ ...typed(blankDraft(), '#9'), title: 'Mine' }, { title: 'Retry', body: '', url: 'u' })
  expect(named.title).toBe('Mine')
  expect(flowOfLabel('spec: A spec and tickets')).toBe('spec')
  expect(flowOfLabel(undefined)).toBeUndefined()
})
