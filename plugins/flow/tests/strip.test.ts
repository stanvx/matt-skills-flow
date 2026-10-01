import { expect, test } from 'claude-code/testing'

import { railView } from '../hooks/board'
import { approvePhase, createTask, recordArtifact, recordEvent, recordSkill } from '../hooks/flow'
import { stageLabel } from '../hooks/flows'
import { focusedChips, segmentsFor, segmentsOf, stripAlt, stripChips, stripLine, stripSvg, stripText } from '../hooks/strip'

const writing = () =>
  recordSkill(recordSkill(createTask('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 1), 'to-spec', 2)
const specced = () => recordArtifact(writing(), '.scratch/retry-checkout/spec.md', 3)

test('stages read in words, falling back to the skill name', () => {
  expect(stageLabel('to-spec')).toBe('Write the spec')
  expect(stageLabel('implement-spec')).toBe('Build the tickets')
  expect(stageLabel('something-new')).toBe('something-new')
})

test('the strip names each stage, marks where the task is and which gates wait', () => {
  const segments = segmentsOf(railView(specced()))
  expect(stripText(segments, 400)).toEqual([
    '✓ Settle decisions → ● Write the spec ◆ → ○ Split into tickets ◆ → ○ Build the tickets → ○ Open the PR → ○ Look back',
  ])
  // Focused, it names the stage under way and the one after it, and counts the rest.
  expect(stripLine(segments, true)).toBe('✓ 1 done → ● Write the spec ◆ → ○ Split into tickets ◆ → ○ 3 more')
  expect(focusedChips(segments).find(chip => chip.text === ' ◆')).toMatchObject({ color: 'yellow' })
  const approved = focusedChips(segmentsOf(railView(approvePhase(specced(), 3))))
  expect(approved.filter(chip => chip.text === ' ◆')[0]).toMatchObject({ color: 'green' })
  // Nothing recorded to read yet: the gate does not wait.
  expect(focusedChips(segmentsOf(railView(writing()))).find(chip => chip.text === ' ◆')).toMatchObject({ dimColor: true })
})

test('once the task is ready, the stage it was in counts as done and the next one is marked', () => {
  const grilling = recordSkill(createTask('Retry checkout', 0, { flow: 'grill' }), 'grill-with-docs', 1)
  expect(stripLine(segmentsFor(grilling, 'progress'))).toBe('● Settle decisions → ○ Build → ○ Open the PR → ○ Look back')
  const settled = recordEvent(grilling, { kind: 'done' }, 2)
  const ready = segmentsFor(settled, 'ready')
  expect(ready.map(one => one.state)).toEqual(['done', 'next', 'ahead', 'ahead'])
  expect(stripLine(ready, true)).toBe('✓ 1 done → ○ Build → ○ 2 more')
  expect(focusedChips(ready).find(chip => chip.text === '○ Build')).toMatchObject({ bold: true })
  // A new task's first stage is the next one.
  expect(segmentsFor(createTask('Retry checkout', 0, { flow: 'grill' }), 'ready')[0]?.state).toBe('next')
})

test('the strip wraps between stages to fit, continuing with an arrow', () => {
  const lines = stripText(segmentsOf(railView(specced())), 44)
  expect(lines.length).toBeGreaterThan(1)
  expect(lines.every(line => [...line].length <= 44)).toBe(true)
  expect(lines[1]?.startsWith('→ ')).toBe(true)
  expect(lines.join(' ')).toContain('Look back')

  const chips = stripChips(segmentsOf(railView(specced())), 44)
  expect(chips).toHaveLength(lines.length)
  expect(chips.map(row => row.map(chip => chip.text).join(''))).toEqual(lines)
  expect(chips[0]?.find(chip => chip.text === '● Write the spec')).toMatchObject({ color: 'cyan', bold: true })
})

test('the SVG draws every stage, the current one filled, and says the same in words', () => {
  const segments = segmentsOf(railView(specced()))
  const svg = stripSvg(segments)
  expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
  expect(svg.length).toBeLessThan(131_072)
  for (const one of segments) {
    expect(svg).toContain(one.label)
  }
  expect(svg).toContain('class="box now"')
  expect(svg).toContain('class="gate-waiting"')
  expect(svg).toContain('prefers-color-scheme:dark')
  const wrapped = stripSvg(segments, 400)
  const widthOf = (markup: string) => Number(/width="(\d+)"/.exec(markup)?.[1])
  const heightOf = (markup: string) => Number(/height="(\d+)"/.exec(markup)?.[1])
  expect(widthOf(wrapped)).toBeLessThanOrEqual(400)
  expect(heightOf(wrapped)).toBeGreaterThan(heightOf(svg))
  expect(wrapped).toContain('Look back')
  expect(stripAlt(segments)).toBe(
    'Stages: Settle decisions (done), Write the spec (current, waiting for approval), Split into tickets (ahead), Build the tickets (ahead), Open the PR (ahead), Look back (ahead)',
  )
})

test('the SVG draws a build stage\'s proof mark: hollow while it needs proof, cored once proven', () => {
  const building = recordSkill(createTask('Retry checkout', 0, { flow: 'oneshot' }), 'implement', 1)
  const edited = recordEvent(building, { kind: 'edit', detail: 'src/a.ts' }, 2)
  const needed = stripSvg(segmentsOf(railView(edited)))
  expect(needed).toContain('class="proof proof-needed"')
  expect(needed).not.toContain('class="proof-core"')
  const proven = stripSvg(segmentsOf(railView(recordEvent(edited, { kind: 'check', detail: 'pnpm test', ok: true }, 3))))
  expect(proven).toContain('class="proof proof-proven"')
  expect(proven).toContain('class="proof-core"')
  // No edit, no mark; a stage still ahead in the dialog's preview carries a quiet one.
  expect(stripSvg(segmentsOf(railView(building)))).not.toContain('class="proof ')
  expect(stripSvg([{ stage: 'implement', label: 'Build', state: 'ahead', proof: 'ahead' }])).toContain('class="proof proof-ahead"')
})
