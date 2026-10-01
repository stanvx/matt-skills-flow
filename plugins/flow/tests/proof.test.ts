import { expect, test } from 'claude-code/testing'

import { canAutoAdvance, endsOnQuestion, unprovenAnswer } from '../hooks/autonomy'
import { railView } from '../hooks/board'
import { allowPhase, createTask, recordEvent, recordSkill, statusOf } from '../hooks/flow'
import { isCode, isProven, needsEditStamp, prHold, proofGap, shipHold, stuckReason } from '../hooks/proof'
import { ghostOf, holdNote } from '../hooks/status'
import { segmentsFor, stripAlt, stripLine } from '../hooks/strip'
import { reminder } from '../hooks/trail'
import type { FlowEvent, FlowTask } from '../types'
import { fakeRepo, flow } from './fake'

const STAGE_DONE = 'mcp__flow__stage_done'

const building = () => recordSkill(createTask('Retry checkout', 0, { flow: 'oneshot' }), 'implement', 1)
const then = (task: FlowTask, ...events: Omit<FlowEvent, 'phase' | 'at'>[]) =>
  events.reduce((moved, event, index) => recordEvent(moved, event, 10 + index), task)
const edit = { kind: 'edit', detail: 'src/a.ts' } as const
const check = (detail: string, ok: boolean) => ({ kind: 'check', detail, ok }) as const

test('a build with no code edit needs no proof, and one edit needs a passing check after it', () => {
  const task = building()
  expect(proofGap(task)).toBeUndefined()
  expect(proofGap(then(task, check('pnpm test', true), edit))).toBe('no check has passed since the last code edit')
  expect(isProven(then(task, edit, check('pnpm test', true)))).toBe(true)
  // A later edit asks for the checks again.
  expect(isProven(then(task, edit, check('pnpm test', true), edit))).toBe(false)
})

test('every check run since the last edit must pass in its latest run', () => {
  const task = building()
  expect(proofGap(then(task, edit, check('pnpm typecheck', true), check('pnpm test', false)))).toBe('`pnpm test` is failing')
  expect(proofGap(then(task, edit, check('pnpm test', false), check('pnpm test', true)))).toBeUndefined()
})

test('planning, freeform and non-code edits are never held for proof', () => {
  expect(proofGap(then(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), edit))).toBeUndefined()
  expect(proofGap(then(recordSkill(createTask('Retry checkout', 0, { flow: 'freeform' }), 'implement', 1), edit))).toBeUndefined()
  expect(isCode('src/a.ts')).toBe(true)
  expect(isCode('docs/a.md')).toBe(false)
  expect(isCode('.scratch/retry-checkout/notes.txt')).toBe(false)
  expect(isCode(undefined)).toBe(false)
})

test('only the first of a run of edits is stamped', () => {
  const task = building()
  expect(needsEditStamp(task)).toBe(true)
  expect(needsEditStamp(then(task, edit))).toBe(false)
  expect(needsEditStamp(then(task, edit, check('pnpm test', true)))).toBe(true)
  expect(needsEditStamp(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1))).toBe(false)
})

test('a person waives the proof for the edits so far, and a later edit needs it again', () => {
  const unproven = then(building(), edit)
  const waived = allowPhase(unproven, 20)
  expect(waived.log.at(-1)?.kind).toBe('allow')
  expect(isProven(waived)).toBe(true)
  expect(allowPhase(waived, 21)).toBe(waived)
  expect(isProven(then(waived, edit))).toBe(false)
})

test('the status says Needs proof until the checks pass, and a report alone never makes it Ready', () => {
  const unproven = then(building(), edit)
  expect(statusOf(unproven, false)).toBe('proof')
  expect(statusOf(unproven, true)).toBe('working')
  expect(holdNote(unproven, 'proof')).toBe('no check has passed since the last code edit')
  expect(ghostOf(unproven, 'proof')).toBe('prove it works: run the checks and show the change working')
  expect(statusOf(then(unproven, { kind: 'done' }), false)).toBe('proof')
  const proven = then(unproven, check('pnpm test', true), { kind: 'done' })
  expect(statusOf(proven, false)).toBe('ready')
  // Rework after the report reopens the stage.
  expect(statusOf(then(proven, edit), false)).toBe('proof')
})

test('a check that keeps failing, or a blocked report, needs a person', () => {
  const failing = then(building(), edit, check('pnpm test', false), check('pnpm test', false))
  expect(stuckReason(failing)).toBeUndefined()
  const stuck = then(failing, check('pnpm test', false))
  expect(stuckReason(stuck)).toBe('`pnpm test` failed 3 times in a row')
  expect(statusOf(stuck, false)).toBe('stuck')
  expect(stuckReason(then(stuck, check('pnpm test', true)))).toBeUndefined()

  const blocked = then(building(), { kind: 'blocked', detail: 'needs the staging API key' })
  expect(stuckReason(blocked)).toBe('blocked: needs the staging API key')
  expect(statusOf(blocked, false)).toBe('stuck')
  expect(stuckReason(then(blocked, edit))).toBeUndefined()
})

test('unproven work does not ship or advance', () => {
  const unproven = then(building(), edit)
  expect(shipHold(unproven, 'git push -u origin feature')).toContain('not proven')
  expect(shipHold(unproven, 'gh pr create --fill')).toContain('/flow allow')
  expect(shipHold(unproven, 'git commit -m "wip"')).toBeUndefined()
  expect(shipHold(then(unproven, check('pnpm test', true)), 'git push')).toBeUndefined()
  expect(prHold(unproven)).toContain('Do not open or update a pull request yet')
  expect(prHold(building())).toBeUndefined()
  expect(unprovenAnswer(unproven)).toContain('flow: not recorded. implement is not proven')
  expect(canAutoAdvance(then(unproven, { kind: 'done' }))).toBe(false)
  expect(canAutoAdvance(then(unproven, check('pnpm test', true), { kind: 'done' }))).toBe(true)
})

test('a turn that ends on a question holds the advance', () => {
  expect(endsOnQuestion('Built it. Should the retry also cover refunds?')).toBe(true)
  expect(endsOnQuestion('Which one do you want?**')).toBe(true)
  expect(endsOnQuestion('Built it and the tests pass.')).toBe(false)
})

test('the strip and the rail mark a build stage whose edits need proof', () => {
  const unproven = then(building(), edit)
  expect(railView(building())[0]?.proof).toBeUndefined()
  expect(railView(unproven)[0]?.proof).toBe('needed')
  expect(stripLine(segmentsFor(unproven, 'proof'))).toBe('● Build ◇ → ○ Open the PR → ○ Look back')
  const proven = then(unproven, check('pnpm test', true))
  expect(stripLine(segmentsFor(proven, 'progress'))).toBe('● Build ◈ → ○ Open the PR → ○ Look back')
  expect(stripAlt(segmentsFor(unproven, 'proof'))).toContain('Build (current, needs proof)')
})

test('a build stage is told about the proof gate', () => {
  expect(reminder(building(), 'implement', 'feature')).toContain('Proof gate')
  expect(reminder(recordSkill(createTask('Retry checkout', 0), 'grill-with-docs', 1), 'grill-with-docs', 'feature')).not.toContain('Proof gate')
})

test('through the engine: an edit holds stage_done, the push and /pr until a check passes', async ($, on) => {
  let isFailing = false
  on('tool.call', { tool: 'Bash' }, () => (isFailing ? { result: 'failed', text: '1 failed', isError: true } : { result: 'ok', text: 'ok' }))
  const { files } = fakeRepo(on)
  const log = () => (JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}') as FlowTask).log
  await $.command.run(flow('new --workflow oneshot Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })

  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Edit', file_path: '/repo/src/retry.ts', old_string: 'b', new_string: 'c' })
  expect(log().filter(one => one.kind === 'edit')).toHaveLength(1)

  const refused = await $.tool.call({ tool: STAGE_DONE, summary: 'built the retry' })
  expect(refused.result).toContain('flow: not recorded')
  expect(log().some(one => one.kind === 'done')).toBe(false)
  expect((await $.tool.call({ tool: 'Bash', command: 'git push -u origin feature' })).deny).toContain('not proven')
  expect((await $.skill.prompt({ skill: 'pr', text: 'open the pr' })).text).toContain('Do not open or update a pull request yet')

  isFailing = true
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built the retry' })).result).toContain('`pnpm test` is failing')

  isFailing = false
  await $.tool.call({ tool: 'Bash', command: 'pnpm test' })
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built the retry' })).result).toContain('Next for the task: /pr')
  expect((await $.tool.call({ tool: 'Bash', command: 'git push -u origin feature' })).deny).toBeUndefined()
})

test('through the engine: a blocked report is recorded and /flow allow waives the proof', async ($, on) => {
  const { files, toasts } = fakeRepo(on)
  const task = () => JSON.parse(files.get('/repo/.scratch/retry-failed-checkout-payments/task.json') ?? '{}') as FlowTask
  await $.command.run(flow('new --workflow oneshot Retry failed checkout payments'))
  await $.skill.prompt({ skill: 'implement', text: 'build' })
  expect((await $.command.run(flow('allow'))).text).toBe('Nothing is held in implement.')

  await $.tool.call({ tool: 'Write', file_path: '/repo/src/retry.ts', content: 'x' })
  const blocked = await $.tool.call({ tool: STAGE_DONE, summary: 'needs the staging API key', outcome: 'blocked' })
  expect(blocked.result).toContain('recorded that the stage is blocked')
  expect(toasts.at(-1)).toBe('flow: implement is blocked: needs the staging API key')
  expect(statusOf(task(), false)).toBe('stuck')

  expect((await $.command.run(flow('allow'))).text).toBe('Proof waived for the edits so far in implement; the retro will see it.')
  expect(statusOf(task(), false)).toBe('progress')
  expect((await $.tool.call({ tool: STAGE_DONE, summary: 'built' })).result).toContain('Next for the task: /pr')
})
