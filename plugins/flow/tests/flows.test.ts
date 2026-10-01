import { expect, test } from 'claude-code/testing'

import { boardDoc } from '../hooks/board'

import {
  approvePhase,
  createTask,
  editGate,
  isFinished,
  nextAction,
  parseNew,
  rail,
  recordArtifact,
  recordEvent,
  recordSkill,
  statusOf,
  withDefaults,
} from '../hooks/flow'
import { reminder } from '../hooks/trail'

const stops = (task: Parameters<typeof rail>[0]) => rail(task).map(stop => `${stop.state} ${stop.stage}`)

const run = (task: Parameters<typeof rail>[0], ...skills: string[]) =>
  skills.reduce((moved, skill, at) => recordSkill(moved, skill, at + 1), task)

test('each flow draws its own rail from new', () => {
  expect(stops(createTask('Retry checkout', 0, { flow: 'oneshot' }))).toEqual(['ahead implement', 'ahead pr', 'ahead retro'])
  expect(stops(createTask('Retry checkout', 0, { flow: 'grill' }))).toEqual([
    'ahead grill-with-docs',
    'ahead implement',
    'ahead pr',
    'ahead retro',
  ])
  expect(stops(createTask('Retry checkout', 0, { flow: 'spec' }))).toEqual([
    'ahead grill-with-docs',
    'ahead to-spec',
    'ahead to-tickets',
    'ahead implement-spec',
    'ahead pr',
    'ahead retro',
  ])
  expect(stops(createTask('Retry checkout', 0, { flow: 'freeform' }))).toEqual([])
  expect(stops(createTask('Retry checkout', 0, { flow: 'oneshot', openPr: false }))).toEqual(['ahead implement', 'ahead retro'])
})

test('a new task guesses its flow from where it joins, and the guess can be overridden', () => {
  expect(createTask('#123', 0).flow).toBe('oneshot')
  expect(createTask('checkout crashes on submit', 0).flow).toBe('oneshot')
  expect(createTask('greenfield billing service', 0).flow).toBe('wayfind')
  expect(createTask('retry failed checkout payments', 0).flow).toBe('grill')
  expect(createTask('retry failed checkout payments', 0, { flow: 'spec' }).flow).toBe('spec')

  const named = createTask('a long description\nwith more lines', 0, { title: 'Retry payments', model: 'opus', effort: 'high' })
  expect(named).toMatchObject({ title: 'Retry payments', slug: 'retry-payments', model: 'opus', effort: 'high', openPr: true, worktree: 'never' })
})

test('an on-ramp replaces the first stage: a bug starts at diagnosing-bugs', () => {
  const broken = createTask('checkout crashes on submit', 0)
  expect(stops(broken)).toEqual(['ahead diagnosing-bugs', 'ahead pr', 'ahead retro'])
  expect(nextAction(broken)).toMatchObject({ command: 'diagnosing-bugs', args: 'checkout crashes on submit' })
  expect(recordSkill(broken, 'diagnosing-bugs', 1).phase).toBe('diagnosing-bugs')
})

test('Wayfind charts a map, clears it one ticket per session, then specs the way', () => {
  const foggy = createTask('greenfield billing service', 0)
  expect(foggy.flow).toBe('wayfind')
  expect(stops(foggy)).toEqual([
    'ahead wayfinder',
    'ahead wayfinder-clear',
    'ahead to-spec',
    'ahead to-tickets',
    'ahead implement-spec',
    'ahead pr',
    'ahead retro',
  ])
  expect(nextAction(foggy)).toEqual({
    command: 'wayfinder',
    args: 'greenfield billing service',
    stage: 'wayfinder',
    why: 'start here: name the destination and chart the decisions ahead',
  })

  const charted = recordArtifact(recordSkill(foggy, 'wayfinder', 1), 'https://github.com/o/r/issues/40', 2)
  const ticketed = recordArtifact(charted, 'https://github.com/o/r/issues/41', 3)
  expect(ticketed.phase).toBe('wayfinder')
  expect(nextAction(ticketed)).toEqual({
    command: 'wayfinder',
    args: 'https://github.com/o/r/issues/40',
    stage: 'wayfinder-clear',
    why: 'clear the map: one frontier ticket per session, /clear between',
  })

  const clearing = recordSkill(ticketed, 'mattpocock-skills:wayfinder', 4)
  expect(clearing.phase).toBe('wayfinder-clear')
  expect(stops(clearing).slice(0, 3)).toEqual(['done wayfinder', 'now wayfinder-clear', 'ahead to-spec'])
  expect(nextAction(clearing)).toEqual({
    command: 'wayfinder',
    args: 'https://github.com/o/r/issues/40',
    stage: 'wayfinder-clear',
    why: 'next frontier ticket, one per session; /clear between',
    alt: { command: 'to-spec', label: 'Map is clear' },
  })
  expect(recordSkill(clearing, 'wayfinder', 5).phase).toBe('wayfinder-clear')
  expect(editGate(clearing, 'src/pay.ts')).toContain('/flow allow')
  const specing = recordSkill(clearing, 'to-spec', 6)
  expect(nextAction(specing)).toMatchObject({ command: 'to-spec' })
  expect(nextAction(recordArtifact(specing, '.scratch/greenfield-billing-service/spec.md', 7))).toMatchObject({ command: 'flow', args: 'approve' })
})

test('a local map file is the map, wherever it was written', () => {
  const charted = recordSkill(createTask('greenfield billing service', 0), 'wayfinder', 1)
  const local = recordArtifact(recordArtifact(charted, '.scratch/greenfield-billing-service/issues/01-pick-a-ledger.md', 2), '.scratch/greenfield-billing-service/map.md', 3)
  expect(nextAction(local).args).toBe('.scratch/greenfield-billing-service/map.md')
  expect(nextAction(charted)).toEqual({
    command: 'wayfinder',
    stage: 'wayfinder-clear',
    why: 'clear the map: pass its link; one frontier ticket per session',
  })
})

test('/wayfinder on a smaller workflow grows it into Wayfind', () => {
  const grown = recordSkill(createTask('Retry checkout', 0, { flow: 'spec' }), 'wayfinder', 1)
  expect(grown.flow).toBe('wayfind')
  expect(grown.phase).toBe('wayfinder')
  expect(recordSkill(createTask('Retry checkout', 0, { flow: 'freeform' }), 'wayfinder', 1).flow).toBe('freeform')
})

test('the next action walks each flow to done', () => {
  const oneshot = createTask('#12 fix the retry', 0)
  expect(nextAction(oneshot).command).toBe('implement')
  expect(nextAction(run(oneshot, 'implement'))).toEqual({ command: 'pr', stage: 'pr', why: 'open the pull request, with the checks as evidence' })
  expect(nextAction(run(oneshot, 'implement', 'pr')).command).toBe('retro')
  expect(nextAction(run(oneshot, 'implement', 'pr', 'retro'))).toEqual({ command: 'flow', args: 'done', why: 'close the task' })

  const grill = createTask('Retry checkout', 0)
  expect(nextAction(grill)).toEqual({
    command: 'grill-with-docs',
    args: 'Retry checkout',
    stage: 'grill-with-docs',
    why: 'start here: sharpen the idea and settle the decisions first',
  })
  expect(nextAction(run(grill, 'grill-with-docs')).command).toBe('implement')

  const spec = createTask('Retry checkout', 0, { flow: 'spec' })
  expect(nextAction(run(spec, 'grill-with-docs')).command).toBe('to-spec')
  const specced = run(spec, 'grill-with-docs', 'to-spec')
  expect(nextAction(specced)).toEqual({ command: 'to-spec', stage: 'to-spec', why: 'no spec recorded yet: write it, or /flow approve <path or link>' })
  const written = recordArtifact(specced, '.scratch/retry-checkout/spec.md', 8)
  expect(nextAction(written)).toEqual({ command: 'flow', args: 'approve', why: 'read .scratch/retry-checkout/spec.md, then approve the spec' })
  expect(nextAction(approvePhase(written, 9)).command).toBe('to-tickets')
})

test('the ticket the task was made from is what the first stage reads', () => {
  const task = recordArtifact(createTask('Retry checkout', 0, { flow: 'oneshot' }), '.scratch/retry-checkout/ticket.md', 1)
  expect(nextAction(task)).toMatchObject({ command: 'implement', args: '.scratch/retry-checkout/ticket.md' })
})

test('implement and implement-spec fill the same slot, so either one moves a spec task on', () => {
  const spec = run(createTask('Retry checkout', 0, { flow: 'spec' }), 'grill-with-docs', 'to-spec', 'to-tickets', 'implement')
  expect(stops(spec)).toEqual([
    'done grill-with-docs',
    'done to-spec',
    'done to-tickets',
    'now implement',
    'ahead pr',
    'ahead retro',
  ])
})

test('a stage outside the flow grows it into the smallest flow that has it, and says so', () => {
  const oneshot = createTask('#12 fix the retry', 0)
  const grilled = run(oneshot, 'grill-with-docs')
  expect(grilled.flow).toBe('grill')
  expect(grilled.log.at(-1)).toMatchObject({ kind: 'flow', detail: 'grill' })

  const specced = run(grilled, 'to-spec')
  expect(specced.flow).toBe('spec')
  expect(nextAction(approvePhase(specced, 9)).command).toBe('to-tickets')

  expect(run(createTask('Retry checkout', 0, { flow: 'freeform' }), 'to-spec').flow).toBe('freeform')
  expect(run(createTask('Retry checkout', 0, { flow: 'spec' }), 'implement').flow).toBe('spec')
})

test('freeform records every stage, holds no edits and hands the choice to ask-matt', () => {
  const free = createTask('Retry checkout', 0, { flow: 'freeform' })
  expect(nextAction(free)).toEqual({ command: 'ask-matt', args: 'Retry checkout', why: 'freeform: ask-matt picks the skill' })
  const grilled = run(free, 'grill-with-docs')
  expect(stops(grilled)).toEqual(['now grill-with-docs'])
  expect(editGate(grilled, 'src/pay.ts')).toBeUndefined()
  expect(nextAction(grilled)).toEqual({ command: 'flow', args: 'done', why: 'freeform: run any skill, then close the task' })
})

test('status: working in a turn, in progress until a stage is reported done, waiting at a gate, ready, done once closed', () => {
  const fresh = createTask('Retry checkout', 0, { flow: 'spec' })
  expect(statusOf(fresh, false)).toBe('ready')
  const specced = run(fresh, 'grill-with-docs', 'to-spec')
  expect(statusOf(specced, true)).toBe('working')
  // Nothing recorded yet: there is nothing to wait on, and the stage is still under way.
  expect(statusOf(specced, false)).toBe('progress')
  const written = recordArtifact(specced, '.scratch/retry-checkout/spec.md', 8)
  expect(statusOf(written, false)).toBe('waiting')
  expect(statusOf(approvePhase(written, 9), false)).toBe('ready')
  expect(statusOf({ ...specced, closedAt: 10 }, true)).toBe('done')

  // A stage the model reported done is ready for the next one, until the stage runs again.
  const grilling = run(fresh, 'grill-with-docs')
  const settled = recordEvent(grilling, { kind: 'done' }, 5)
  expect(isFinished(settled)).toBe(true)
  expect(statusOf(settled, false)).toBe('ready')
  expect(statusOf(recordSkill(settled, 'grill-with-docs', 6), false)).toBe('progress')
  // A step inside the stage does not reopen it.
  expect(statusOf(recordSkill(settled, 'grilling', 6), false)).toBe('ready')
  expect(statusOf(run(createTask('Poke around', 0, { flow: 'freeform' }), 'research'), false)).toBe('ready')
})

test('a task file written before flows keeps the rail it had', () => {
  const { flow: _, openPr: __, worktree: ___, ...old } = run(createTask('Retry checkout', 0), 'grill-with-docs')
  const read = withDefaults(old)
  expect(read).toMatchObject({ flow: 'spec', openPr: true, worktree: 'never' })
  expect(withDefaults({ ...old, entry: 'foggy' }).flow).toBe('wayfind')
  expect(nextAction(read).command).toBe('to-spec')
})

test('/flow new takes flags for the flow, the start, the PR, the worktree, the model and the effort', () => {
  expect(parseNew('--workflow spec --model opus --effort high retry payments')).toEqual({
    text: 'retry payments',
    options: { flow: 'spec', model: 'opus', effort: 'high' },
  })
  expect(parseNew('--start=broken --no-pr --worktree the thing')).toEqual({
    text: 'the thing',
    options: { start: 'broken', openPr: false, worktree: 'now' },
  })
  expect(parseNew('just words')).toEqual({ text: 'just words', options: {} })
  expect(parseNew('--workflow nope x').bad).toBe('--workflow nope')
  expect(parseNew('--effort extreme x').bad).toBe('--effort extreme')
  expect(parseNew('--start nope x').bad).toBe('--start nope')
})

test('a clearing map offers its way out: the next step, the reminder and the board all know it', () => {
  const charted = recordArtifact(recordSkill(createTask('greenfield billing service', 0), 'wayfinder', 1), 'https://github.com/o/r/issues/40', 2)
  const clearing = recordSkill(charted, 'wayfinder', 3)

  expect(nextAction(clearing).alt).toEqual({ command: 'to-spec', label: 'Map is clear' })

  expect(reminder(charted, 'wayfinder', 'feature')).toContain('Charting the map: label it wayfinder:map')
  expect(reminder(clearing, 'wayfinder', 'feature')).toContain('Clearing the map https://github.com/o/r/issues/40: resolve one frontier ticket')

  const rail = boardDoc(clearing, 'shop', 9).rail
  expect(rail.find(stop => stop.stage === 'wayfinder-clear')).toMatchObject({ label: 'Clear the map', command: 'wayfinder', state: 'now' })
})

test('the model reads each stage in words with the command that runs it', () => {
  const clearing = recordSkill(recordSkill(createTask('greenfield billing service', 0), 'wayfinder', 1), 'wayfinder', 2)
  expect(reminder(clearing, 'wayfinder', 'feature')).toContain(
    'Workflow Wayfind: Chart the map (/wayfinder) -> Clear the map (/wayfinder) -> Write the spec (/to-spec)',
  )
})
