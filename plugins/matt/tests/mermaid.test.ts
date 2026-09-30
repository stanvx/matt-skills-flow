import { expect, test } from 'claude-code/testing'

import { createTask, recordSkill } from '../hooks/flow'
import { drawDiagram, flipped, widthOf, withDiagrams } from '../hooks/mermaid'
import { reminder } from '../hooks/trail'

const TICKETS = ['flowchart LR', '  T1[01 schema] --> T2[02 api]', '  T1 --> T3[03 ui]', '  T2 --> T4[04 e2e]', '  T3 --> T4'].join('\n')

test('a mermaid fence becomes a text fence of its art, with every node label', () => {
  const drawn = withDiagrams(['# Tickets', '', '```mermaid', TICKETS, '```', '', 'Build 01 first.'].join('\n'), 120)
  expect(drawn).not.toContain('```mermaid')
  expect(drawn).toContain('```text')
  for (const label of ['01 schema', '02 api', '03 ui', '04 e2e']) {
    expect(drawn).toContain(label)
  }
  expect(drawn).toContain('Build 01 first.')
  expect(drawn).toContain('►')
})

test('a file with Windows line endings still draws its diagrams', () => {
  const drawn = withDiagrams(['```mermaid', 'flowchart LR', '  A[start] --> B[end]', '```'].join('\r\n'), 120)
  expect(drawn).toContain('```text')
  expect(drawn).toContain('start')
})

test('an indented fence keeps its indent, and a diagram that will not draw keeps its fence', () => {
  const indented = withDiagrams(['- the flow:', '', '  ```mermaid', '  flowchart LR', '    A[start] --> B[end]', '  ```'].join('\n'), 120)
  expect(indented).toContain('  ```text')
  expect(indented.split('\n').filter(line => line.includes('start')).every(line => line.startsWith('  '))).toBe(true)

  const broken = ['```mermaid', 'pie title nope', '  "a" : 1', '```'].join('\n')
  expect(withDiagrams(broken, 120)).toBe(broken)
})

test('a flowchart too wide for the pane turns the other way, and says so when neither fits', () => {
  expect(flipped('flowchart LR\n  A --> B')).toBe('flowchart TD\n  A --> B')
  expect(flipped('graph TD\n  A --> B')).toBe('graph LR\n  A --> B')
  expect(flipped('sequenceDiagram\n  A->>B: hi')).toBeUndefined()

  const long = 'flowchart LR\n  A[grill-with-docs] --> B[to-spec] --> C[to-tickets] --> D[implement-spec] --> E[pr] --> F[retro]'
  const wide = drawDiagram(long, 200)
  expect(wide?.isWide).toBe(false)
  const narrow = drawDiagram(long, 40)
  expect(narrow).toBeDefined()
  expect(widthOf(narrow?.art ?? '')).toBeLessThan(widthOf(wide?.art ?? ''))

  expect(drawDiagram(long, 5)?.isWide).toBe(true)
  expect(withDiagrams(['```mermaid', long, '```'].join('\n'), 5)).toContain('Wider than the pane')
})

test('to-spec and to-tickets ask for a diagram; other stages do not', () => {
  const task = recordSkill(createTask('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 1)
  expect(reminder(task, 'to-spec', 'feature')).toContain('mermaid diagram of the key flow')
  expect(reminder(task, 'to-tickets', 'feature')).toContain('mermaid flowchart LR of the tickets')
  expect(reminder(task, 'implement', 'feature')).not.toContain('mermaid')
})
