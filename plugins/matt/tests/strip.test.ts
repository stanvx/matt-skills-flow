import { expect, test } from 'claude-code/testing'

import { railView } from '../hooks/board'
import { approvePhase, createTask, recordSkill } from '../hooks/flow'
import { stageLabel } from '../hooks/flows'
import { compactChips, segmentsOf, stripAlt, stripChips, stripSvg, stripText } from '../hooks/strip'

const specced = () =>
  recordSkill(recordSkill(createTask('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 1), 'to-spec', 2)

test('stages read in words, falling back to the skill name', () => {
  expect(stageLabel('to-spec')).toBe('Write the spec')
  expect(stageLabel('implement-spec')).toBe('Build the tickets')
  expect(stageLabel('something-new')).toBe('something-new')
})

test('the strip names each stage, marks where the task is and which gates wait', () => {
  const segments = segmentsOf(railView(specced()))
  expect(stripText(segments, 400)).toEqual([
    '✓ Settle decisions ─► ● Write the spec ◆ ─► ○ Split into tickets ◆ ─► ○ Build the tickets ─► ○ Open the PR ─► ○ Look back',
  ])
  expect(compactChips(segments).map(chip => chip.text).join('')).toBe('✓─●◆─○◆─○─○─○')
  expect(compactChips(segments).find(chip => chip.text === '◆')).toMatchObject({ color: 'yellow' })
  const approved = compactChips(segmentsOf(railView(approvePhase(specced(), 3))))
  expect(approved.filter(chip => chip.text === '◆')[0]).toMatchObject({ color: 'green' })
})

test('the strip wraps between stages to fit, continuing with an arrow', () => {
  const lines = stripText(segmentsOf(railView(specced())), 44)
  expect(lines.length).toBeGreaterThan(1)
  expect(lines.every(line => [...line].length <= 44)).toBe(true)
  expect(lines[1]?.startsWith('─► ')).toBe(true)
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
